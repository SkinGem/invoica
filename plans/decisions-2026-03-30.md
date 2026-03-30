# PACT × Helixa Integration Decisions — 2026-03-30

**Authority**: Godman (Tarek Mnif)
**Context**: Resolves all 5 open questions from `HELIXA × PACT Integration Plan v0.1 Draft.md` (Quigley) blocking Sprint 535 (HELIXA-007) and Sprint 536 (HELIXA-008).
**Status**: RATIFIED — sprints unblocked as of 2026-03-30.

---

## Decisions

### Q1 — Helixa API Latency
**Decision**: Assume worst case. Call is async.
**Implementation**: Chamber 2 defaults agent to PROVISIONAL immediately. Trust ceiling is updated on Helixa response arrival. No blocking wait.

### Q2 — Endpoint Auth (Helixa → PACT callback)
**Decision**: JWT (session-scoped).
**Implementation**: PACT issues a short-lived JWT per session at Chamber 2 entry. Helixa includes this JWT in the `Authorization` header when calling back with session outcomes. PACT validates JWT signature + session_id match before applying trust delta.

### Q3 — Soul Handshake Format (Chamber 4)
**Decision**: Minimal format.
**Schema**:
```json
{
  "session_id": "string",
  "outcome": "success | partial | failed",
  "trust_delta": "number (signed integer)"
}
```
No `constitutional_hash`, no `pact_attestation_uid`, no `agent_id` in v1. Can be extended in v2.

### Q4 — Outcome Weighting (trust_delta magnitude)
**Decision**: ±2 points per session.
**Rationale**: Conservative. ~10 sessions to move a full tier. Prevents score manipulation via rapid session cycling. Revisit after 30-day production data.

### Q5 — Score Floor (score = 0 or unscored)
**Decision**: PROVISIONAL.
**Implementation**: score = null OR score = 0 → treat as `unverified` → ceiling = PROVISIONAL (RESTRICTED access). Not REJECTED. Agent can earn their way up through successful sessions.

---

## Resulting Ceiling Map (Sprint 535 implementation)

| Score | Ceiling | Notes |
|---|---|---|
| null / 0 | PROVISIONAL | Async default while Helixa responds |
| < 30 | REJECTED | Hard block at Chamber 2 |
| 30–49 | RESTRICTED | Access with tight constraints |
| 50–69 | RESTRICTED | Standard RESTRICTED ceiling |
| 60+ (SIWA verified) | PROVISIONAL → STANDARD | SIWA upgrade path |
| 70–84 | STANDARD | Full standard access |
| 85–100 | FULL | Unrestricted |

---

## Sprint Assignments

| Sprint | Task | Unblocked By |
|---|---|---|
| 535 | HELIXA-007 — Chamber 2 × Helixa Cred Score | Q1 (async) + Q2 (JWT) + Q5 (floor=PROVISIONAL) |
| 536 | HELIXA-008 — Chamber 4 + Soul Handshake | Q3 (minimal format) + Q4 (±2 delta) |

---

*Ratified: 2026-03-30 · Godman Protocol: PACT × Helixa v1 · Next review: after 30-day production data*
