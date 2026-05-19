// Serves the OpenAPI 3.1 + x-payment-info discovery document at the
// canonical path (/openapi.json) so AgentCash / x402scan / mppscan
// crawlers and the IETF payment-discovery draft can index Invoica.
//
// Source spec: backend/openapi.json (static file, edited by hand).
// Public, no auth — discovery endpoints must be reachable to anonymous
// crawlers per the IETF draft-payment-discovery-00.txt.

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

const SPEC_PATH = path.resolve(__dirname, '..', '..', 'openapi.json');

let cached: { json: object; etag: string } | null = null;

function loadSpec(): { json: object; etag: string } {
  if (cached) return cached;
  const raw = fs.readFileSync(SPEC_PATH, 'utf8');
  const json = JSON.parse(raw);
  const etag = `"${require('crypto').createHash('sha256').update(raw).digest('hex').slice(0, 16)}"`;
  cached = { json, etag };
  return cached;
}

router.get('/openapi.json', (req: Request, res: Response) => {
  try {
    const { json, etag } = loadSpec();
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');
    res.json(json);
  } catch (err) {
    console.error('[openapi] failed to serve spec:', err);
    res.status(500).json({ success: false, error: { code: 'spec_load_failed', message: 'OpenAPI spec unavailable' } });
  }
});

// Also mount at /.well-known/openapi.json as a backup discovery path.
router.get('/.well-known/openapi.json', (req: Request, res: Response) => {
  try {
    const { json, etag } = loadSpec();
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');
    res.json(json);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'spec_load_failed', message: 'OpenAPI spec unavailable' } });
  }
});

export default router;
