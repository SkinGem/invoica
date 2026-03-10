import { Router, Request, Response, NextFunction } from 'express';
import https from 'https';
import { createClient } from '@supabase/supabase-js';
import { requireX402Payment, get402Response } from '../middleware/x402';
import { callClawRouter, getCostLog } from '../lib/clawrouter-client';
import { selectModel } from '../lib/model-router';

const router = Router();

// ── Feature flag: USE_CLAWROUTER ────────────────────────────────────────────
// Phase 1 (parallel mode): set USE_CLAWROUTER=true to route via ClawRouter x402
// Phase 2 (full cutover): remove legacy callAnthropic/callMiniMax entirely
const USE_CLAWROUTER = process.env.USE_CLAWROUTER === 'true';

// Legacy keys — kept as fallback during Phase 1 transition
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_CODING_MODEL = 'MiniMax-M2.5';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type LLMResult = { content: string; inputTokens: number; outputTokens: number };

// ---------------------------------------------------------------------------
// Batched settlement queue — flush every 50 calls OR every 5 minutes
// ---------------------------------------------------------------------------
interface SettlementRecord {
  from: string;
  to: string;
  value: bigint;
  nonce: string;
  signature: string;
  prompt: string;
  createdAt: string;
  outboundCostUsdc?: number;
}

const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let settlementQueue: SettlementRecord[] = [];
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Flush the settlement queue to Supabase as individual Invoice records.
 * Called either when queue reaches BATCH_SIZE or when the flush timer fires.
 */
async function flushSettlementQueue(): Promise<void> {
  if (settlementQueue.length === 0) return;

  const batch = settlementQueue.splice(0);
  console.log(`[ai-inference] Flushing ${batch.length} settlement(s) to Supabase`);

  const sb = getSupabase();
  const now = new Date().toISOString();

  const records = batch.map((rec, idx) => ({
    invoiceNumber: Math.floor(Date.now() / 1000) + idx,
    status: 'COMPLETED',
    amount: Number(rec.value) / 1_000_000,
    currency: 'USDC',
    customerEmail: `${rec.from.slice(0, 10)}@x402.base`,
    customerName: `Agent ${rec.from.slice(0, 10)}...`,
    paymentDetails: JSON.stringify({
      x402Protocol: true,
      network: 'base-mainnet',
      chainId: 8453,
      payerWallet: rec.from,
      sellerWallet: rec.to,
      nonce: rec.nonce,
      signature: rec.signature.slice(0, 20) + '...',
      prompt: rec.prompt.slice(0, 100),
      eip3009: true,
      ...(rec.outboundCostUsdc != null && {
        outboundCostUsdc: rec.outboundCostUsdc,
        marginUsdc: (Number(rec.value) / 1_000_000) - rec.outboundCostUsdc,
      }),
    }),
    settledAt: rec.createdAt,
    completedAt: now,
    createdAt: rec.createdAt,
    updatedAt: now,
  }));

  const { error } = await sb.from('Invoice').insert(records);
  if (error) {
    console.warn('[ai-inference] Batch settlement insert failed:', error.message);
    settlementQueue.unshift(...batch);
  } else {
    console.log(`[ai-inference] ${batch.length} settlement(s) recorded successfully`);
  }
}

/**
 * Enqueue a payment for batched settlement.
 */
function enqueueSettlement(
  payment: NonNullable<Request['x402Payment']>,
  prompt: string,
  outboundCostUsdc?: number
): void {
  settlementQueue.push({
    from: payment.from,
    to: payment.to,
    value: payment.value,
    nonce: payment.nonce,
    signature: payment.signature,
    prompt,
    createdAt: new Date().toISOString(),
    outboundCostUsdc,
  });

  if (settlementQueue.length >= BATCH_SIZE) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushSettlementQueue().catch(e => console.error('[ai-inference] Flush error:', e));
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushSettlementQueue().catch(e => console.error('[ai-inference] Flush error:', e));
    }, FLUSH_INTERVAL_MS);
  }
}

process.on('SIGTERM', () => flushSettlementQueue().catch(() => {}));
process.on('SIGINT',  () => flushSettlementQueue().catch(() => {}));

// ---------------------------------------------------------------------------
// Legacy LLM Clients (Phase 1 fallback — remove in Phase 2)
// ---------------------------------------------------------------------------

async function callAnthropic(prompt: string, model: string): Promise<LLMResult> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          resolve({
            content: json.content?.[0]?.text || '',
            inputTokens: json.usage?.input_tokens || 0,
            outputTokens: json.usage?.output_tokens || 0,
          });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function callMiniMax(prompt: string, systemPrompt?: string): Promise<LLMResult> {
  if (!MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY not set');
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MINIMAX_CODING_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 16000,
    });

    const req = https.request({
      hostname: 'api.minimax.io',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          if (json.base_resp?.status_code && json.base_resp.status_code !== 0) {
            reject(new Error(`MiniMax error: ${json.base_resp.status_msg} (code ${json.base_resp.status_code})`));
            return;
          }
          resolve({
            content: json.choices?.[0]?.message?.content || '',
            inputTokens: json.usage?.prompt_tokens || 0,
            outputTokens: json.usage?.completion_tokens || 0,
          });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(300_000, () => { req.destroy(); reject(new Error('MiniMax timeout (300s)')); });
    req.write(body);
    req.end();
  });
}

/** Legacy routing: MiniMax for coding, Anthropic for everything else */
async function callLLMLegacy(
  prompt: string, model: string, systemPrompt?: string
): Promise<LLMResult & { backend: string }> {
  const isMiniMax = model.toLowerCase().startsWith('minimax') || model === 'coding';
  if (isMiniMax) {
    const result = await callMiniMax(prompt, systemPrompt);
    return { ...result, backend: 'minimax' };
  }
  const result = await callAnthropic(prompt, model);
  return { ...result, backend: 'anthropic' };
}

// ---------------------------------------------------------------------------
// Unified LLM caller — dispatches to ClawRouter or legacy based on flag
// ---------------------------------------------------------------------------

async function callLLM(
  prompt: string,
  requestedModel: string,
  systemPrompt?: string
): Promise<LLMResult & { backend: string; resolvedModel: string; costUsdc?: number }> {
  if (!USE_CLAWROUTER) {
    // Phase 1 fallback: legacy direct API calls
    const result = await callLLMLegacy(prompt, requestedModel, systemPrompt);
    const resolvedModel = result.backend === 'minimax' ? MINIMAX_CODING_MODEL : requestedModel;
    return { ...result, resolvedModel };
  }

  // ClawRouter path: expertise routing → x402 pay-per-call
  const { model: clawModel, taskType, autoClassified } = selectModel(prompt, requestedModel);
  console.log(`[ai-inference] ClawRouter routing: ${requestedModel || '(auto)'} → ${clawModel} (task=${taskType}, auto=${autoClassified})`);

  const result = await callClawRouter({
    model: clawModel,
    prompt: prompt.trim(),
    systemPrompt,
    maxTokens: 4096,
  });

  return {
    content: result.content,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    backend: result.backend,
    resolvedModel: result.model,
    costUsdc: result.costUsdc,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /v1/ai/inference — returns 402 payment requirements (x402 discovery)
 */
router.get('/v1/ai/inference', (_req: Request, res: Response) => {
  res.status(402).json(get402Response());
});

/**
 * POST /v1/ai/inference — x402-protected LLM inference
 *
 * When USE_CLAWROUTER=true:
 *   All models routed through ClawRouter via x402. Expertise routing
 *   auto-classifies prompts to specialist models. Legacy model names
 *   (MiniMax-M2.5, claude-haiku-4-5) are mapped to ClawRouter IDs.
 *
 * When USE_CLAWROUTER=false (default / Phase 1 fallback):
 *   Direct calls to Anthropic/MiniMax using subscription API keys.
 */
router.post('/v1/ai/inference', requireX402Payment, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, model, system_prompt: systemPrompt } = req.body as {
      prompt?: string; model?: string; system_prompt?: string;
    };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ success: false, error: { message: 'prompt is required', code: 'MISSING_PROMPT' } });
      return;
    }

    const payment = req.x402Payment!;
    const requestedModel = model || (USE_CLAWROUTER ? undefined : 'claude-haiku-4-5');
    console.log(`[ai-inference] Processing from ${payment.from.slice(0, 10)}... model=${requestedModel || '(auto)'} clawrouter=${USE_CLAWROUTER}`);

    const llmResult = await callLLM(prompt.trim(), requestedModel || '', systemPrompt);

    // Enqueue settlement with outbound cost tracking
    enqueueSettlement(payment, prompt, llmResult.costUsdc);

    res.json({
      success: true,
      data: {
        content: llmResult.content,
        model: llmResult.resolvedModel,
        backend: llmResult.backend,
        usage: {
          input_tokens: llmResult.inputTokens,
          output_tokens: llmResult.outputTokens,
        },
      },
      payment: {
        verified: true,
        amount: `${Number(payment.value) / 1_000_000} USDC`,
        from: payment.from,
        to: payment.to,
        network: 'base-mainnet',
        chainId: 8453,
        method: 'EIP-3009 TransferWithAuthorization',
      },
      ...(llmResult.costUsdc != null && {
        routing: {
          clawrouter: USE_CLAWROUTER,
          outboundCostUsdc: llmResult.costUsdc,
          marginUsdc: (Number(payment.value) / 1_000_000) - llmResult.costUsdc,
        },
      }),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /v1/ai/inference/costs — outbound cost log for CFO monitoring
 * Returns recent ClawRouter costs (last 1000 entries).
 */
router.get('/v1/ai/inference/costs', (_req: Request, res: Response) => {
  const log = getCostLog();
  const totalUsdc = log.reduce((sum, e) => sum + e.costUsdc, 0);
  res.json({
    success: true,
    data: {
      entries: log.length,
      totalOutboundUsdc: Math.round(totalUsdc * 1_000_000) / 1_000_000,
      recent: log.slice(-20),
    },
  });
});

export default router;
