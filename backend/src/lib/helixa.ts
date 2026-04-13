// Helixa Cred Score API client (corrected per Helixa dev 2026-04-13)
// Cred: GET /api/v2/agent/:tokenId/cred (NOT wallet-based)
// Resolve wallet → tokenId: GET /api/v2/search?q=<wallet>
// Session outcome: POST /api/v2/agent/:agentAddress/session-outcome

const HELIXA_API_URL = 'https://api.helixa.xyz';
const TIMEOUT_MS = 5000;

/** Resolve wallet → Helixa tokenId + agentAddress + credScore via search */
async function resolveAgent(wallet: string): Promise<{ tokenId: string; agentAddress: string; credScore: number | null } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${HELIXA_API_URL}/api/v2/search?q=${encodeURIComponent(wallet)}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json() as { agents?: Array<{ tokenId?: number; agentAddress?: string; name?: string }> };
    const m = data.agents?.[0];
    if (!m?.tokenId) { console.log(`[helixa] search wallet=${wallet} no match`); return null; }
    console.log(`[helixa] resolved wallet=${wallet} → tokenId=${m.tokenId} agent=${m.agentAddress} name=${m.name}`);
    return { tokenId: String(m.tokenId), agentAddress: m.agentAddress || wallet, credScore: (m as any).credScore ?? null };
  } catch { return null; }
  finally { clearTimeout(timer); }
}

const agentCache = new Map<string, { tokenId: string; agentAddress: string }>();

/** Public: resolve wallet → agent address (used by helixa-reporter for session-outcome) */
export async function resolveAgentAddress(wallet: string): Promise<string | null> {
  if (agentCache.has(wallet)) return agentCache.get(wallet)!.agentAddress;
  const agent = await resolveAgent(wallet);
  if (agent) agentCache.set(wallet, agent);
  return agent?.agentAddress || null;
}

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
 * Flow: wallet → search → tokenId → GET /api/v2/agent/{tokenId}/cred
 * Returns null on API failure — callers must treat null as non-blocking.
 */
export async function fetchHelixaCred(walletAddress: string): Promise<HelixaCred | null> {
  // Step 1: resolve wallet → tokenId
  let agent = agentCache.get(walletAddress);
  if (!agent) {
    const resolved = await resolveAgent(walletAddress);
    if (!resolved) return null;
    agent = resolved;
    agentCache.set(walletAddress, agent);
  }

  // Step 2: fetch cred by tokenId
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${HELIXA_API_URL}/api/v2/agent/${agent.tokenId}/cred`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      console.log(`[helixa] cred tokenId=${agent.tokenId} HTTP ${res.status} — using search credScore fallback`);
      // Fallback: use credScore from search if /cred endpoint is unavailable
      if (agent.credScore !== null) {
        return { score: agent.credScore, tier: 'SEARCH_FALLBACK', breakdown: {}, verification_status: 'unverified' };
      }
      return null;
    }
    const data = await res.json() as HelixaCred;
    console.log(`[helixa] cred tokenId=${agent.tokenId} score=${data.score} tier=${data.tier}`);
    return data;
  } catch (err) {
    console.log(`[helixa] cred tokenId=${agent.tokenId} error: ${(err as Error).message} — using search credScore fallback`);
    if (agent.credScore !== null) {
      return { score: agent.credScore, tier: 'SEARCH_FALLBACK', breakdown: {}, verification_status: 'unverified' };
    }
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
