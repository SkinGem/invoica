/**
 * clawrouter-client.ts — x402 pay-per-call client for ClawRouter gateway
 *
 * Replaces direct Anthropic/MiniMax subscription API calls with x402 payments.
 * Flow: POST /chat/completions → 402 (price) → sign EIP-3009 → retry with X-Payment → 200
 *
 * Reuses the same EIP-3009 signing pattern from scripts/lib/x402-llm-client.ts.
 * Two x402 hops: Agent pays Invoica (incoming), Invoica pays ClawRouter (outgoing).
 */

import https from 'https';
import http from 'http';
import crypto from 'crypto';

// ── Config ──────────────────────────────────────────────────────────────────

const CLAWROUTER_URL = process.env.CLAWROUTER_GATEWAY_URL || 'https://api.clawrouter.ai/v1';
const OUTBOUND_WALLET_KEY = process.env.X402_OUTBOUND_WALLET_KEY || process.env.CTO_WALLET_PRIVATE_KEY || '';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const FACILITATOR_URL = 'https://facilitator.payai.network';
const BASE_CHAIN_ID = 8453;

const USDC_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: BASE_CHAIN_ID,
  verifyingContract: USDC_ADDRESS,
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ClawRouterOptions {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  think?: boolean;
}

export interface ClawRouterResult {
  content: string;
  model: string;
  costUsdc: number;
  backend: string;
  inputTokens: number;
  outputTokens: number;
}

interface ClawRouter402Response {
  accepts: Array<{
    amount: string;
    payTo: string;
    token?: string;
  }>;
}

// ── Cost Log ────────────────────────────────────────────────────────────────

interface CostEntry {
  timestamp: string;
  model: string;
  costUsdc: number;
  inputTokens: number;
  outputTokens: number;
}

const costLog: CostEntry[] = [];
const MAX_COST_LOG = 1000;

export function getCostLog(): readonly CostEntry[] {
  return costLog;
}

// ── EIP-3009 Signing ────────────────────────────────────────────────────────

async function signOutboundPayment(payTo: string, amount: bigint): Promise<{
  fromAddress: string;
  signature: string;
  nonce: string;
  validAfter: bigint;
  validBefore: bigint;
}> {
  if (!OUTBOUND_WALLET_KEY) {
    throw new Error('X402_OUTBOUND_WALLET_KEY not set — cannot pay ClawRouter');
  }

  const pkHex = OUTBOUND_WALLET_KEY.startsWith('0x')
    ? OUTBOUND_WALLET_KEY
    : `0x${OUTBOUND_WALLET_KEY}`;

  // Dynamic require — viem is in root node_modules
  const { privateKeyToAccount } = require('viem/accounts');
  const { createWalletClient, http: viemHttp } = require('viem');
  const { base } = require('viem/chains');

  const account = privateKeyToAccount(pkHex as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: viemHttp(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  const now = Math.floor(Date.now() / 1000);
  const validAfter = 0n;
  const validBefore = BigInt(now + 3600);
  const nonce = `0x${crypto.randomBytes(32).toString('hex')}` as `0x${string}`;

  const signature = await walletClient.signTypedData({
    domain: USDC_DOMAIN,
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: account.address as `0x${string}`,
      to: payTo as `0x${string}`,
      value: amount,
      validAfter,
      validBefore,
      nonce,
    },
  });

  return {
    fromAddress: account.address,
    signature,
    nonce,
    validAfter,
    validBefore,
  };
}

// ── HTTP Helpers ─────────────────────────────────────────────────────────────

function httpRequest(url: string, method: string, body: string, headers: Record<string, string>): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, data }));
    });

    req.on('error', reject);
    req.setTimeout(300_000, () => { req.destroy(); reject(new Error('ClawRouter request timeout (300s)')); });
    req.write(body);
    req.end();
  });
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Call an LLM model through ClawRouter using x402 pay-per-call.
 *
 * 1. POST /chat/completions → receive 402 with price
 * 2. Sign EIP-3009 TransferWithAuthorization for the price
 * 3. Retry with X-PAYMENT header
 * 4. Receive 200 with OpenAI-compatible response
 */
export async function callClawRouter(opts: ClawRouterOptions): Promise<ClawRouterResult> {
  const { model, prompt, systemPrompt, maxTokens = 4096 } = opts;
  const chatUrl = `${CLAWROUTER_URL}/chat/completions`;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const requestBody = JSON.stringify({ model, messages, max_tokens: maxTokens });

  // Step 1: Initial request → expect 402
  const initial = await httpRequest(chatUrl, 'POST', requestBody, {});

  if (initial.status === 200) {
    // Free model or already authorized — parse directly
    const json = JSON.parse(initial.data);
    return parseOpenAIResponse(json, model, 0);
  }

  if (initial.status !== 402) {
    throw new Error(`ClawRouter returned ${initial.status}: ${initial.data.slice(0, 300)}`);
  }

  // Step 2: Parse 402 payment requirements
  const requirements: ClawRouter402Response = JSON.parse(initial.data);
  if (!requirements.accepts || requirements.accepts.length === 0) {
    throw new Error('ClawRouter 402 response missing accepts array');
  }

  const accept = requirements.accepts[0];
  const amount = BigInt(accept.amount);
  const payTo = accept.payTo;

  console.log(`[clawrouter] Model ${model}: ${Number(amount) / 1_000_000} USDC → ${payTo.slice(0, 10)}...`);

  // Step 3: Sign EIP-3009 payment
  const payment = await signOutboundPayment(payTo, amount);

  const paymentProof = {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    payload: {
      signature: payment.signature,
      authorization: {
        from: payment.fromAddress,
        to: payTo,
        value: amount.toString(),
        validAfter: payment.validAfter.toString(),
        validBefore: payment.validBefore.toString(),
        nonce: payment.nonce,
      },
    },
  };
  const xPaymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString('base64');

  // Step 4: Retry with payment
  const paid = await httpRequest(chatUrl, 'POST', requestBody, {
    'X-PAYMENT': xPaymentHeader,
  });

  if (paid.status !== 200) {
    throw new Error(`ClawRouter paid request failed (${paid.status}): ${paid.data.slice(0, 300)}`);
  }

  const json = JSON.parse(paid.data);
  const costUsdc = Number(amount) / 1_000_000;
  const result = parseOpenAIResponse(json, model, costUsdc);

  // Log cost for CFO monitoring
  costLog.push({
    timestamp: new Date().toISOString(),
    model,
    costUsdc,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
  if (costLog.length > MAX_COST_LOG) costLog.shift();

  return result;
}

function parseOpenAIResponse(json: any, requestedModel: string, costUsdc: number): ClawRouterResult {
  const choice = json.choices?.[0];
  return {
    content: choice?.message?.content || '',
    model: json.model || requestedModel,
    costUsdc,
    backend: 'clawrouter',
    inputTokens: json.usage?.prompt_tokens || 0,
    outputTokens: json.usage?.completion_tokens || 0,
  };
}
