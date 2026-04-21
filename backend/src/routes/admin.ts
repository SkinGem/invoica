import { Router } from 'express';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import jwt, { JwtPayload } from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

// M1-SEC-02 (plan §3.2): server-side email allowlist from env, hardcoded fallback
// kept only for bootstrap — prod should always have ADMIN_EMAILS set.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'skininthegem@gmail.com,twmnif@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const REPO_DIR = '/home/invoica/apps/Invoica';
const router = Router();

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// M1-SEC-02: hardened admin auth — cryptographic JWT verify (sig + exp + aud + iss)
// with local HS256 verification when SUPABASE_JWT_SECRET is configured, else falls
// back to Supabase network verify. Email allowlist enforced in both paths.
async function requireAdmin(req: any, res: any): Promise<boolean> {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ success: false, error: 'No token' });
    return false;
  }

  let email: string | undefined;

  if (SUPABASE_JWT_SECRET) {
    // Preferred path: local HS256 verify — no network round-trip, fails fast on
    // forged/tampered/expired tokens.
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    } catch {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return false;
    }
    if (payload.aud !== 'authenticated') {
      res.status(401).json({ success: false, error: 'Invalid audience' });
      return false;
    }
    if (typeof payload.iss === 'string' && !payload.iss.endsWith('/auth/v1')) {
      res.status(401).json({ success: false, error: 'Invalid issuer' });
      return false;
    }
    email = String((payload as { email?: string }).email || '').toLowerCase();
  } else {
    // Fallback: Supabase auth.getUser validates token server-to-server.
    // Slower and depends on Supabase availability. Enable local verify by
    // setting SUPABASE_JWT_SECRET in .env.
    const { data: { user }, error } = await getSupabase().auth.getUser(token);
    if (error || !user?.email) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return false;
    }
    email = user.email.toLowerCase();
  }

  if (!email || !ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return false;
  }
  return true;
}

router.get('/v1/admin/system', async (req: any, res: any, next: any) => {
  try {
    if (!await requireAdmin(req, res)) return;

    // PM2 processes
    let processes: any[] = [];
    try {
      const raw = execSync('pm2 jlist', { encoding: 'utf-8', timeout: 10000 });
      const jsonStart = raw.indexOf('[');
      if (jsonStart !== -1) {
        const list = JSON.parse(raw.slice(jsonStart));
        processes = list.map((p: any) => ({
          id: p.pm_id,
          name: p.name,
          status: p.pm2_env?.status ?? 'unknown',
          uptime: p.pm2_env?.pm_uptime ?? null,
          restarts: p.pm2_env?.restart_time ?? 0,
          memory: p.monit?.memory ?? 0,
          cpu: p.monit?.cpu ?? 0,
          pid: p.pid ?? null,
        }));
      }
    } catch (_) {}

    // Git log
    let commits: string[] = [];
    try {
      const log = execSync('git log --oneline -20', {
        encoding: 'utf-8', timeout: 5000, cwd: REPO_DIR,
      });
      commits = log.trim().split('\n').filter(Boolean);
    } catch (_) {}

    // Latest sprint file
    let sprint: any = null;
    try {
      const sprintsDir = path.join(REPO_DIR, 'sprints');
      const files = fs.readdirSync(sprintsDir)
        .filter((f: string) => f.endsWith('.json'))
        .sort()
        .reverse();
      if (files[0]) {
        const content = JSON.parse(
          fs.readFileSync(path.join(sprintsDir, files[0]), 'utf-8'),
        );
        const tasks = content.tasks || [];
        sprint = {
          file: files[0],
          total: tasks.length,
          approved: tasks.filter((t: any) => t.status === 'approved').length,
          rejected: tasks.filter((t: any) => t.status === 'rejected').length,
          pending: tasks.filter((t: any) =>
            !['approved', 'rejected'].includes(t.status)).length,
          tasks: tasks.map((t: any) => ({
            id: t.id, type: t.type, status: t.status, agent: t.agent,
          })),
        };
      }
    } catch (_) {}

    res.json({
      success: true,
      data: { processes, commits, sprint, serverTime: new Date().toISOString() },
    });
  } catch (err) { next(err); }
});

export default router;
