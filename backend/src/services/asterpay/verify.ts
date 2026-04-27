import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AsterPayVerifyResult {
  valid: boolean;
  reason?: string;
  nonce?: string;
  timestampMs?: number;
}

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

export function verifyAsterPayCallback(
  signatureHeader: string | undefined,
  rawBody: string,
  secret: string,
  now: number = Date.now(),
): AsterPayVerifyResult {
  if (!signatureHeader) return { valid: false, reason: 'missing_signature_header' };
  if (!secret) return { valid: false, reason: 'webhook_secret_not_configured' };

  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(',')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1).trim();
  }
  const { t, v1, n } = parts;
  if (!t || !v1 || !n) return { valid: false, reason: 'malformed_signature_header' };

  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > REPLAY_WINDOW_MS) {
    return { valid: false, reason: 'timestamp_skew' };
  }

  const expected = createHmac('sha256', secret).update(`${t}.${n}.${rawBody}`).digest('hex');

  let received: Buffer;
  let expectedBuf: Buffer;
  try {
    received = Buffer.from(v1, 'hex');
    expectedBuf = Buffer.from(expected, 'hex');
  } catch {
    return { valid: false, reason: 'malformed_v1' };
  }
  if (received.length !== expectedBuf.length) return { valid: false, reason: 'signature_mismatch' };
  if (!timingSafeEqual(received, expectedBuf)) return { valid: false, reason: 'signature_mismatch' };

  return { valid: true, nonce: n, timestampMs: ts };
}
