/**
 * helixa-reporter.ts — PACT Chamber 4 Soul Handshake
 * Reports session outcomes to Helixa for long-term trust score updates.
 * POST https://api.helixa.xyz/api/v2/session/outcome
 * Per decisions-2026-03-30.md Q3 + Q4: trust_delta = ±2.
 */
import * as https from 'https';

const HELIXA_HOST = 'api.helixa.xyz';
const HELIXA_PATH = '/api/v2/session/outcome';
const TIMEOUT_MS = 8000;

export type SessionOutcome = 'success' | 'partial' | 'failed';

export interface SoulHandshake {
  session_id: string;
  outcome: SessionOutcome;
  trust_delta: number;
}

export async function reportSessionOutcome(
  sessionId: string,
  outcome: SessionOutcome,
  trustDelta: number,
  jwt: string,
): Promise<void> {
  const payload: SoulHandshake = { session_id: sessionId, outcome, trust_delta: trustDelta };
  const data = JSON.stringify(payload);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: HELIXA_HOST, path: HELIXA_PATH, method: 'POST',
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': `Bearer ${jwt}`,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c: string) => { body += c; });
        res.on('end', () => {
          console.info(`[helixa-reporter] ${sessionId} outcome=${outcome} delta=${trustDelta} HTTP=${res.statusCode}`);
          resolve();
        });
      },
    );
    req.on('timeout', () => { console.warn(`[helixa-reporter] ${sessionId} timeout`); req.destroy(); resolve(); });
    req.on('error', (err) => { console.error(`[helixa-reporter] ${sessionId} error: ${err.message}`); resolve(); });
    req.write(data); req.end();
  });
}