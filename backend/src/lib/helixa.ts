// Helixa Cred Score API client
// Uses /api/v2/reputation/8004/{walletAddress} endpoint for external agents
// No Authorization header needed for reads.

const HELIXA_API_URL = 'https://api.helixa.xyz';
const TIMEOUT_MS = 5000;

/**
 * Fetch Helixa Cred Score for an external agent by wallet address.
 * Uses the ERC-8004 reputation endpoint (wallet address → avgScore).
 * Returns null if agent not found, API unavailable, or timeout.
 */
export async function fetchHelixaScore(walletAddress: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${HELIXA_API_URL}/api/v2/reputation/8004/${walletAddress}`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      console.log(`[helixa] addr=${walletAddress} score=null (HTTP ${res.status})`);
      return null;
    }
    const data = await res.json() as { avgScore?: number | null };
    const score = data?.avgScore ?? null;
    console.log(`[helixa] addr=${walletAddress} score=${score}`);
    return score;
  } catch (err) {
    console.log(`[helixa] addr=${walletAddress} score=null (${(err as Error).message})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Helixa Cred profile — returned by the /cred endpoint (PACT Chamber 2 integration).
 */
export interface HelixaCred {
  score: number;
  tier: string;
  breakdown: Record<string, unknown>;
  verification_status: 'verified' | 'unverified';
}

/**
 * Fetch structured Cred profile for a PACT-integrated agent.
 * Endpoint: GET /api/v2/agent/{address}/cred
 * Returns null on API failure — callers must treat null as non-blocking.
 */
export async function fetchHelixaCred(walletAddress: string): Promise<HelixaCred | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${HELIXA_API_URL}/api/v2/agent/${walletAddress}/cred`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      console.log(`[helixa] cred addr=${walletAddress} null (HTTP ${res.status})`);
      return null;
    }
    const data = await res.json() as HelixaCred;
    console.log(`[helixa] cred addr=${walletAddress} score=${data.score} tier=${data.tier}`);
    return data;
  } catch (err) {
    console.log(`[helixa] cred addr=${walletAddress} null (${(err as Error).message})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Map Helixa Cred Score → PACT trust ceiling + USDC spending cap.
 * Based on PACT × Helixa Integration Spec v0.1.
 */
export function getHelixaTrustCeiling(
  score: number,
  verificationStatus: string,
): { ceiling: 'FULL' | 'STANDARD' | 'RESTRICTED' | 'MINIMAL' | 'REJECTED' | 'PROVISIONAL'; maxUsdc: number } {
  if (verificationStatus !== 'verified') return { ceiling: 'PROVISIONAL', maxUsdc: 50 };
  if (score >= 85) return { ceiling: 'FULL', maxUsdc: 1_000_000 };
  if (score >= 70) return { ceiling: 'STANDARD', maxUsdc: 10_000 };
  if (score >= 50) return { ceiling: 'RESTRICTED', maxUsdc: 1_000 };
  if (score >= 30) return { ceiling: 'MINIMAL', maxUsdc: 100 };
  return { ceiling: 'REJECTED', maxUsdc: 0 };
}
