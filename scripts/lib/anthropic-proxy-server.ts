/**
 * anthropic-proxy-server.ts — OpenAI-format → Anthropic API translation proxy
 * Port: ANTHROPIC_PROXY_PORT (default 18790)
 * Purpose: ClawRouter T3 APEX calls hit this proxy instead of the OpenClaw UI on :18789.
 *          No changes needed to clawrouter-v2.ts.
 * Usage:   CLAWROUTER_GATEWAY_URL=http://localhost:18790/v1 in .env
 */
import * as http from 'http';
import * as https from 'https';

const PORT = parseInt(process.env.ANTHROPIC_PROXY_PORT || '18790', 10);
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

if (!API_KEY) console.warn('[anthropic-proxy] WARNING: ANTHROPIC_API_KEY not set');

function callAnthropic(model: string, messages: object[], maxTokens: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const modelId = model.startsWith('anthropic/') ? model.slice(10) : model;
    const payload = JSON.stringify({ model: modelId, max_tokens: maxTokens, messages });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c: string) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
    res.writeHead(404); res.end('Not found'); return;
  }
  let body = '';
  req.on('data', (c: string) => { body += c; });
  req.on('end', async () => {
    try {
      const { model, messages, max_tokens = 4096 } = JSON.parse(body);
      const raw = JSON.parse(await callAnthropic(model, messages, max_tokens));
      const out = {
        choices: [{ message: { content: raw.content?.[0]?.text || '' } }],
        usage: { prompt_tokens: raw.usage?.input_tokens || 0, completion_tokens: raw.usage?.output_tokens || 0 },
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    } catch (e: any) {
      console.error('[anthropic-proxy] error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}).listen(PORT, () => console.log(`[anthropic-proxy] :${PORT} ready — proxying to Anthropic API`));