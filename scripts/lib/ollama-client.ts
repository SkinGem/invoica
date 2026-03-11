/**
 * ollama-client.ts — HTTP client for local Ollama inference
 *
 * Calls local Ollama REST API (http://localhost:11434).
 * No API key needed — local models are free.
 * All functions handle Ollama-unavailable gracefully.
 */

import http from 'http';
import https from 'https';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OllamaResult {
  content: string;
  model: string;
  totalDuration: number; // nanoseconds
  evalCount: number;     // output tokens
}

export interface OllamaOptions {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;   // maps to num_predict (default 4096)
  temperature?: number; // default 0.2
}

// ── HTTP Helper ───────────────────────────────────────────────────────────────

function httpReq(
  url: string,
  method: 'GET' | 'POST',
  body?: string,
  timeoutMs = 600_000,
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers: body
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, data }));
      },
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`Ollama timeout (${timeoutMs}ms)`)); });
    if (body) req.write(body);
    req.end();
  });
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Call a local Ollama model. Returns generated text.
 * Strips <think>...</think> tags from deepseek-r1 output.
 */
export async function callOllama(opts: OllamaOptions): Promise<OllamaResult> {
  const { model, prompt, systemPrompt, maxTokens = 4096, temperature = 0.2 } = opts;

  const body = JSON.stringify({
    model,
    prompt,
    system: systemPrompt,
    stream: false,
    options: { num_predict: maxTokens, temperature },
  });

  const res = await httpReq('http://localhost:11434/api/generate', 'POST', body);

  if (res.status !== 200) {
    throw new Error(`Ollama returned ${res.status}: ${res.data.slice(0, 300)}`);
  }

  const json = JSON.parse(res.data);
  const content = (json.response as string || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  return {
    content,
    model: json.model || model,
    totalDuration: json.total_duration || 0,
    evalCount: json.eval_count || 0,
  };
}

// ── Health Helpers ────────────────────────────────────────────────────────────

/**
 * Returns true if Ollama is running and responding.
 * Never throws — returns false on any error.
 */
export async function ollamaIsAvailable(): Promise<boolean> {
  try {
    const res = await httpReq('http://localhost:11434/api/tags', 'GET', undefined, 5_000);
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Returns true if the given model is currently loaded in Ollama memory.
 * Never throws — returns false on any error.
 */
export async function ollamaModelLoaded(model: string): Promise<boolean> {
  try {
    const res = await httpReq('http://localhost:11434/api/tags', 'GET', undefined, 5_000);
    if (res.status !== 200) return false;
    const json = JSON.parse(res.data);
    return Array.isArray(json.models) && json.models.some((m: { name: string }) => m.name.startsWith(model));
  } catch {
    return false;
  }
}
