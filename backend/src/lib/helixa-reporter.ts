/**
 * helixa-reporter.ts — PACT Chamber 4 Soul Handshake
 * Reports session outcomes to Helixa for long-term trust score updates.
 * POST https://api.helixa.xyz/api/v2/agent/:agentAddress/session-outcome
 * (corrected per Helixa dev 2026-04-13 — NOT /api/v2/session/outcome)
 */
import * as https from 'https';
import { resolveAgentAddress } from './helixa';

const HELIXA_HOST = 'api.helixa.xyz';
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
  grantor?: string,
): Promise<void> {
  // Resolve grantor wallet → agent address for the correct endpoint
  let agentAddress = grantor || '';
  if (grantor) {
    const resolved = await resolveAgentAddress(grantor);
    if (resolved) agentAddress = resolved;
  }

  if (!agentAddress) {
    console.warn(`[helixa-reporter] ${sessionId} no agent address — skipping outcome report`);
    return;
  }

  const path = `/api/v2/agent/${agentAddress}/session-outcome`;
  const payload: SoulHandshake = { session_id: sessionId, outcome, trust_delta: trustDelta };
  const data = JSON.stringify(payload);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: HELIXA_HOST, path, method: 'POST',
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
          console.info(`[helixa-reporter] ${sessionId} agent=${agentAddress} outcome=${outcome} delta=${trustDelta} HTTP=${res.statusCode}`);
          resolve();
        });
      },
    );
    req.on('timeout', () => { console.warn(`[helixa-reporter] ${sessionId} timeout`); req.destroy(); resolve(); });
    req.on('error', (err) => { console.error(`[helixa-reporter] ${sessionId} error: ${err.message}`); resolve(); });
    req.write(data); req.end();
  });
}