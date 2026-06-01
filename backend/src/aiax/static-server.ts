// AIAX static server — serves the AIAX discovery surface from backend/public/aiax/
// Mounted at /aiax in app.ts (before authenticate middleware).
// All responses carry Cache-Control: public, max-age=300 and ETag.

import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const router = Router();
const PUBLIC_DIR = path.join(__dirname, '../../public');

function cacheHeaders(res: Response, etag: string): void {
  res.set('Cache-Control', 'public, max-age=300');
  res.set('ETag', etag);
}

function etagFor(content: string): string {
  return `"${crypto.createHash('md5').update(content).digest('hex').substring(0, 16)}"`;
}

function serveJson(filePath: string, req: Request, res: Response): void {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'not_found' }) as unknown as void;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const etag = etagFor(content);
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end() as unknown as void;
  }
  cacheHeaders(res, etag);
  res.set('Content-Type', 'application/json');
  res.send(content);
}

// Tier 0 manifest
router.get('/manifest.json', (req, res) => {
  serveJson(path.join(PUBLIC_DIR, '.well-known', 'aiax.json'), req, res);
});

// Tier 1 sections — flat path per AIAX SPEC v0.1: /aiax/<section_id>.json
// Defined after /manifest.json so the manifest route is not shadowed.
router.get('/:name.json', (req, res) => {
  const name = req.params.name.replace(/[^a-z0-9_-]/gi, '');
  serveJson(path.join(PUBLIC_DIR, 'aiax', `${name}.json`), req, res);
});

// Tier 3 reference
router.get('/reference/:file', (req, res) => {
  const file = req.params.file.replace(/[^a-z0-9_.-]/gi, '');
  const filePath = path.join(PUBLIC_DIR, 'aiax', 'reference', file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'not_found' });
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const etag = etagFor(content);
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  cacheHeaders(res, etag);
  const isJson = file.endsWith('.json');
  res.set('Content-Type', isJson ? 'application/json' : 'text/markdown; charset=utf-8');
  res.send(content);
});

export default router;
