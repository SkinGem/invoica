/**
 * clawrouter-client.ts — Local ClawRouter gateway client
 *
 * ClawRouter is a LOCAL proxy (port 18789) that handles all x402 payments
 * from its own auto-generated wallet. Our backend just sends a standard
 * OpenAI-compatible request — no EIP-3009 signing needed on our side.
 *
 * Wallet: 0x67521a36Cc04b8D91c57cDdc587A7EBAC200062F (funded with 50 USDC)
 * Flow:   POST /v1/chat/completions → gateway pays upstream → 200 response
 */

import http from 'http';
import https from 'https';

// ── Config ───────────────────────────────────────────────────────────────────

const CLAWROUTER_URL = process.env.CLAWROUTER_GATEWAY_URL || 'http://localhost:18789/v1';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Cost Log ─────────────────────────────────────────────────────────────────

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

// ── HTTP Helper ───────────────────────────────────────────────────────────────

function httpRequest(
  url: string,
  body: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; data: string; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...extraHeaders,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode || 0, data, headers: res.headers as Record<string, string | string[] | undefined> })
        );
      }
    );

    req.on('error', reject);
    req.setTimeout(300_000, () => {
      req.destroy();
      reject(new Error('ClawRouter request timeout (300s)'));
    });
    req.write(body);
    req.end();
  });
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Call an LLM model through the local ClawRouter gateway.
 * The gateway handles all x402 payments transparently.
 */
export async function callClawRouter(opts: ClawRouterOptions): Promise<ClawRouterResult> {
  const messages = [];
  
  if (opts.systemPrompt) {
    messages.push({ role: 'system', content: opts.systemPrompt });
  }
  
  messages.push({ role: 'user', content: opts.prompt });

  const requestBody = {
    model: opts.model,
    messages,
    max_tokens: opts.maxTokens || 4096,
    stream: false,
    // OpenClaw v2026.6.6 SDK - new chain config format
    chain_config: {
      network: 'base-mainnet',
      settlement_mode: 'instant',
      gas_optimization: true
    },
    // v2026.6.6 - thinking mode support
    thinking: opts.think || false
  };

  try {
    const response = await httpRequest(
      `${CLAWROUTER_URL}/chat/completions`,
      JSON.stringify(requestBody),
      {
        'X-OpenClaw-Version': '2026.6.6',
        'X-Settlement-Preference': 'fast'
      }
    );

    if (response.status !== 200) {
      throw new Error(`ClawRouter error ${response.status}: ${response.data}`);
    }

    const result = JSON.parse(response.data);
    
    // Handle OpenClaw v2026.6.6 response format
    const choice = result.choices?.[0];
    if (!choice) {
      throw new Error('No choices in ClawRouter response');
    }

    const content = choice.message?.content || '';
    const usage = result.usage || {};
    
    // v2026.6.6 - enhanced billing metadata
    const billing = result.billing || {};
    const costUsdc = billing.total_cost_usdc || 0;
    const backend = billing.provider || 'unknown';

    const costEntry: CostEntry = {
      timestamp: new Date().toISOString(),
      model: opts.model,
      costUsdc,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
    };

    costLog.push(costEntry);
    if (costLog.length > MAX_COST_LOG) {
      costLog.shift();
    }

    return {
      content,
      model: opts.model,
      costUsdc,
      backend,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ClawRouter call failed: ${error.message}`);
    }
    throw new Error('ClawRouter call failed with unknown error');
  }
}

// ── Health Check ─────────────────────────────────────────────────────────────

/**
 * Check if ClawRouter gateway is healthy and wallet is funded
 */
export async function checkClawRouterHealth(): Promise<{
  healthy: boolean;
  walletBalance?: number;
  version?: string;
  error?: string;
}> {
  try {
    const response = await httpRequest(
      `${CLAWROUTER_URL}/health`,
      '',
      { 'X-OpenClaw-Version': '2026.6.6' }
    );

    if (response.status !== 200) {
      return {
        healthy: false,
        error: `Health check failed with status ${response.status}`
      };
    }

    const health = JSON.parse(response.data);
    
    return {
      healthy: health.status === 'healthy',
      walletBalance: health.wallet?.balance_usdc,
      version: health.version,
      error: health.status !== 'healthy' ? health.error : undefined
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown health check error'
    };
  }
}

// ── Settlement Status ────────────────────────────────────────────────────────

/**
 * Get settlement status for backward compatibility checks
 */
export async function getSettlementStatus(): Promise<{
  pendingSettlements: number;
  totalVolume24h: number;
  lastSettlement?: string;
}> {
  try {
    const response = await httpRequest(
      `${CLAWROUTER_URL}/settlements/status`,
      '',
      { 'X-OpenClaw-Version': '2026.6.6' }
    );

    if (response.status !== 200) {
      throw new Error(`Settlement status failed with status ${response.status}`);
    }

    const status = JSON.parse(response.data);
    
    return {
      pendingSettlements: status.pending_count || 0,
      totalVolume24h: status.volume_24h_usdc || 0,
      lastSettlement: status.last_settlement_timestamp
    };
  } catch (error) {
    throw new Error(`Failed to get settlement status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ── Smoke Test ───────────────────────────────────────────────────────────────

/**
 * Run smoke test against staging ClawRouter instance
 */
export async function runSmokeTest(): Promise<{
  success: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const result = await callClawRouter({
      model: 'gpt-4o-mini',
      prompt: 'Say "ClawRouter smoke test successful" and nothing else.',
      maxTokens: 20
    });

    const latencyMs = Date.now() - startTime;
    
    if (result.content.includes('ClawRouter smoke test successful')) {
      return { success: true, latencyMs };
    } else {
      return {
        success: false,
        latencyMs,
        error: `Unexpected response: ${result.content}`
      };
    }
  } catch (error) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown smoke test error'
    };
  }
}