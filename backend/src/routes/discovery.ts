// discovery.ts — Root-level discovery endpoints for agent/LLM auto-discovery.
// Mounted at / (before authenticate) in app.ts.
// /aiax.json    — alias for /.well-known/aiax.json (some crawlers try root first)
// /llms.txt     — LLM-readable index of Invoica's agent-facing API surface
import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const router = Router();
const MANIFEST_PATH = path.join(__dirname, '../../public/.well-known/aiax.json');

function serveManifest(req: Request, res: Response): void {
  if (!fs.existsSync(MANIFEST_PATH)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const etag = '"' + crypto.createHash('md5').update(content).digest('hex').substring(0, 16) + '"';
  if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
  res.set('Cache-Control', 'public, max-age=300');
  res.set('ETag', etag);
  res.set('Content-Type', 'application/json');
  res.send(content);
}

router.get('/aiax.json', serveManifest);

router.get('/llms.txt', (_req: Request, res: Response) => {
  const llmsTxt = `# Invoica — Financial OS for the Agent Economy
> x402-native invoice middleware: AI agents earn, spend, invoice, and settle payments autonomously.

## AIAX Manifest
- Full manifest: https://api.invoica.ai/.well-known/aiax.json
- Manifest alias: https://api.invoica.ai/aiax/manifest.json

## Agent-Facing Endpoints
- POST /api/x402/invoice — Create an invoice (1% fee, $0.01 min, $5 max)
- POST /api/x402/settle  — Check/confirm on-chain settlement
- POST /api/x402/tax     — Tax classification (EU + UK + 5 US states)

## AIAX Sections (Tier 1)
- https://api.invoica.ai/aiax/sections/create_invoice.json
- https://api.invoica.ai/aiax/sections/settle_invoice.json
- https://api.invoica.ai/aiax/sections/query_mandate.json

## x402 Discovery
- https://api.invoica.ai/.well-known/x402

## Supported Networks
Solana, Base, Polygon, Arbitrum, Skale Base

## Docs
- https://docs.invoica.ai
`;
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(llmsTxt);
});

export default router;
