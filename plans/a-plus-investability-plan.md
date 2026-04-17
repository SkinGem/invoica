# INVOICA — A+ INVESTABILITY PLAN

**Input:** VC due-diligence audit of 2026-04-17 (grades: Engineering A-, Business D, Investability D+).
**Target state:** Engineering A+, Business A+, Investability A+.
**Horizon:** 12 weeks (2026-04-17 → 2026-07-10), re-scoped every 2 weeks.
**Execution:** AI agent swarm per `CLAUDE.md` Conway Edition, with the milestone gates below.

This plan is written for the swarm, not for humans. Every work item names the file(s) to touch, the acceptance criteria, and the agent owner. If a task cannot be expressed that way it does not belong here — escalate.

---

## 0. OPERATING RULES FOR THIS PLAN

1. **No new features until M1 is green.** Every sprint until Week-1 close is on the M1 checklist only. If an agent proposes anything else, reject.
2. **Every PR must cite a task ID from this plan.** If there is no task ID, it does not get merged.
3. **No marketing posts or public claims until M2 is green** (see §9, Claims Hygiene). X-admin is frozen until then.
4. **Every money-path change ships with a regression test that would have caught the bug.** No test = no merge, no exception.
5. **Founder-only approvals for:** legal entity filings, any spend > $50/cycle, MSB/counsel engagement, force-push, prod DB migration, webhook/rate-limit relaxations, Helixa fail-open flip.

---

## 1. MILESTONES (GATES)

| Gate | Name | Target Date | Exit Criteria |
|---|---|---|---|
| **M1** | Unbreakable | 2026-04-24 (Week 1) | All WS-1 and WS-2 tasks closed. Replay test passes. External pentest dry-run. Zero unauth data routes. |
| **M2** | Sellable | 2026-05-15 (Week 4) | Stripe billing live, legal entity filed, claims aligned with reality, 5 real pilot customers on the platform. |
| **M3** | Auditable | 2026-06-12 (Week 8) | External security audit passed. Code-quality grade ≥ B+. 10 paying customers. $10K real USDC settlement volume (not self-dealing). |
| **M4** | Investable | 2026-07-10 (Week 12) | MSB/regulatory legal opinion in hand. Integration test suite against staging DB. Series-seed data room assembled. |

Each gate is blocking: no sprint work past the gate date starts until the gate closes. Gate owners: CEO agent announces status to founder; founder is the sole approver.

---

## 2. WS-1 — MONEY-SAFETY HARDENING (P0, M1)

**Goal:** Kill every path that lets the same USDC pay two invoices, and every path that lets money state be altered without trace. Owner: backend-core + backend-ledger + security agents.

### M1-MONEY-01 — Make SETTLED and COMPLETED terminal
- **File:** `backend/src/routes/invoices.ts:864-869` (VALID_TRANSITIONS map)
- **Change:** Remove `PROCESSING → PENDING` and `SETTLED → PROCESSING`. The only permitted transitions become: `PENDING → {PROCESSING, SETTLED, CANCELLED}`, `PROCESSING → {SETTLED, CANCELLED}`, `SETTLED → {COMPLETED, REFUNDED}`, `COMPLETED → {REFUNDED}`, `CANCELLED → {}`, `REFUNDED → {}`.
- **Acceptance:** New test `invoice-state-machine-terminal.test.ts` enumerates every from/to pair and asserts forbidden ones return 400 `INVALID_TRANSITION`. Integration test (see WS-7) exercises full real-DB flow.

### M1-MONEY-02 — Create `PaymentEvents` table with UNIQUE(chain, txHash)
- **File:** new Supabase migration `supabase/migrations/004_payment_events.sql`
- **Schema:** `id uuid PK`, `invoiceId uuid FK`, `chain text`, `txHash text`, `amountUsdc numeric`, `observedAt timestamptz`, `source text` (`evm-detector`|`solana-detector`|`sap-escrow`|`manual`), `raw jsonb`, `UNIQUE (chain, txHash)`.
- **Wire-up:** Every settlement path (`settlement-router.ts`, `sap-escrow-bridge.ts`, `evm-detector.ts`, `solana-detector.ts`) inserts into `PaymentEvents` before updating the `Invoice` row; insertion conflict → abort settlement and log.
- **Acceptance:** New test replays the same tx twice and asserts the second call returns a documented `DUPLICATE_TX` error and does not touch `Invoice`.

### M1-MONEY-03 — Remove loose fallback matcher from SAP bridge
- **File:** `backend/src/services/settlement/sap-escrow-bridge.ts:230-334` (`detectViaFallback`)
- **Change:** Delete `detectViaFallback`. Keep only discriminator-based detection. If discriminator fails, return `null` and log. No heuristic matches on "any USDC into agent wallet."
- **Acceptance:** Existing `sap-escrow-bridge.test.ts` updated so the non-discriminator path returns `null`. Remove the `(fallback match)` log line.

### M1-MONEY-04 — Ship Arbitrum detector or remove the claim
- **Files:** `backend/src/services/settlement/evm-detector.ts`, `chain-registry.ts`, `settlement-router.ts`, `backend/src/config/chains.ts`
- **Option A (preferred):** Extend EVM detector to handle Arbitrum RPC + USDC contract (0xaf88d065e77c8cC2239327C5EDb3A432268e5831). Add fixture tx and unit test.
- **Option B (fallback):** Remove `arbitrum` from `SUPPORTED_CHAINS` in `backend/src/routes/invoices.ts:17` and update README + SOUL.md + website chain list.
- **Acceptance:** Either real Arbitrum tx settles in test, or the word "Arbitrum" is removed from every marketing surface.

### M1-MONEY-05 — Make paymentDetails merge audit-traceable
- **File:** `backend/src/routes/invoices.ts:951-983` (`PATCH /:id/metadata`)
- **Change:** On every metadata write, append to a new `InvoiceAudit` table (invoiceId, actor apiKeyId, beforeJson, afterJson, changedAt). Reject keys that start with `tax`, `settlement`, `txHash`, `paidBy` — those are system-owned.
- **Acceptance:** Test confirms protected keys return 400; every accepted PATCH produces exactly one `InvoiceAudit` row.

### M1-MONEY-06 — Idempotency on POST /v1/invoices
- **File:** `backend/src/routes/invoices.ts:596` (`POST /v1/invoices`)
- **Change:** Require `Idempotency-Key` header. First write stores `{key, apiKeyId, invoiceId, responseBody}` in a new `IdempotencyKey` table (24-hour TTL). Second write with same key returns the stored response.
- **Acceptance:** Test: same key + same body returns identical response; same key + different body returns 409 `IDEMPOTENCY_CONFLICT`.

### M1-MONEY-07 — Helixa failure policy is a choice, not an accident
- **Files:** `backend/src/lib/helixa.ts`, `backend/src/middleware/trust-gate.ts`, `backend/src/routes/invoices.ts:896-916`
- **Change:** Introduce env flag `HELIXA_POLICY=fail-closed|fail-open` (default `fail-closed` in prod). Document in CLAUDE.md and runbook. Observability counter for helixa-unavailable events.
- **Acceptance:** Test covers both policies; prod config verifies `fail-closed` is set.

---

## 3. WS-2 — SECURITY REMEDIATION (P0, M1)

**Goal:** Close every finding from the security audit. Owner: security agent + backend-core.

### M1-SEC-01 — Authenticate all read-side routes that expose platform data
- **File:** `backend/src/app.ts:57-82`
- **Change:** Add `authenticate` middleware to: `metricsRoutes`, `agentRoutes`, `reputationRoutes`, `reputationHistoryRoutes`, `reputationLeaderboardRoutes`, `ledgerRoutes`, `adminRoutes`, `aiInferenceRoutes`, `invoiceDownloadRoutes`, `taxRoutes`. `healthRoutes` and `/.well-known/*` stay public.
- **Acceptance:** Table test in `app.test.ts` curls every route unauthenticated and asserts 401 for everything except the explicit allowlist.

### M1-SEC-02 — Harden admin token validation
- **File:** `backend/src/routes/admin.ts:18-30` (`requireAdmin`)
- **Change:** Verify JWT signature using Supabase project JWT secret; verify `aud`, `exp`, `iss`; require email-match against a server-side allowlist from `process.env.ADMIN_EMAILS`.
- **Acceptance:** Forged-token test (tampered signature) returns 401; expired-token test returns 401; non-allowlisted email returns 403.

### M1-SEC-03 — Webhook HMAC verification on delivery
- **File:** `backend/src/routes/webhooks.ts`, `backend/src/services/webhook-dispatcher.ts` (create if missing)
- **Change:** On outbound delivery, compute `HMAC-SHA256(secret, body)` and send as `X-Invoica-Signature: t=<ts>,v1=<hex>`. On `POST /v1/webhooks/:id/test` receive-path, verify the signature using `crypto.timingSafeEqual`. Document verification in developer docs.
- **Acceptance:** Test: tampered body fails verification; replayed timestamp older than 5 min fails.

### M1-SEC-04 — Enable rate limiting globally
- **File:** `backend/src/app.ts` (global), `backend/src/middleware/rate-limiter.ts` (enhance)
- **Change:** Apply `createRateLimiter({windowMs: 60000, max: 120})` globally; stricter `{max: 20}` on `POST /v1/invoices`, `POST /v1/webhooks`, `POST /v1/api-keys`. Back the limiter with Redis (Upstash or Hetzner Redis) so limits persist across instances.
- **Acceptance:** Integration test: 130 requests in 60s returns 429 on req 121+; two-instance test confirms limits are shared.

### M1-SEC-05 — Sensitive data out of logs
- **Files:** grep `console.log`, `console.error`, `console.warn`, `console.debug` in `backend/src/`
- **Change:** Introduce `lib/logger.ts` redactor that strips `email`, `apiKey`, `paymentAddress`, `txHash` prefix-beyond-4chars, `Authorization` header. Replace all raw console usage.
- **Acceptance:** Grep for `console\.` in `backend/src/` returns 0 hits. Log-redactor test asserts redaction happens.

### M1-SEC-06 — Rotate X402 seller wallet and purge from public config
- **Files:** `ecosystem.config.js`, `.env.example`, README, deployment docs
- **Change:** Move `X402_SELLER_WALLET` to `.env` only. Rotate to a fresh address. Document rotation SOP in `docs/runbooks/secret-rotation.md`.
- **Acceptance:** Public repo grep for the old address returns 0 hits; new address receives first live settlement.

### M1-SEC-07 — Tighten API-key format
- **File:** `backend/src/middleware/auth.ts:87-91`, `backend/src/services/api-keys.ts`
- **Change:** New keys are prefixed `inv_live_` or `inv_test_` + 48 urlsafe base64 bytes. Format validator checks prefix + length + base64 alphabet. Existing keys get a one-time migration flag; UI prompts rotation before M2.
- **Acceptance:** Format-fuzz test rejects non-prefixed strings; 100k-key generation has zero collisions.

### M1-SEC-08 — CORS allowlist and security headers
- **File:** `backend/src/app.ts:32-42`
- **Change:** Keep current CORS allowlist. Add `helmet()` with strict defaults: `X-Content-Type-Options`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, CSP baseline for API (`default-src 'none'`). Re-enable preflight for all POST routes.
- **Acceptance:** `curl -I` shows required headers; scraper-from-alien-origin gets CORS blocked in browser but 401/400 via direct HTTP (by design — rate limit + auth are the real controls).

### M1-SEC-09 — Repo-root hygiene
- **Files:** repo root
- **Change:** Move `Solana Secret.rtf`, `npm_recovery_codes.txt`, `Hetzener API.rtf`, `agent_log.json`, `.wallet-alert-state.json` out of the repo directory to `~/.invoica-secrets/` on the founder machine. Reference them via env paths. Add `scripts/verify-clean-repo.sh` to CI (see WS-8).
- **Acceptance:** `git ls-files` contains none of these paths; repo-root check in CI fails if any reappear.

---

## 4. WS-3 — BILLING WIRE-UP (P1, M2)

**Goal:** Real metering, real Stripe, real revenue path by 2026-04-22. Owner: backend-core + bizdev + CFO agents.

### M2-BILL-01 — Stripe integration
- **Files:** `backend/src/routes/billing.ts`, new `backend/src/services/stripe-client.ts`
- **Change:** Replace placeholder checkout/portal with real Stripe Checkout Session + Customer Portal. Create `Customer`, `Subscription`, `UsageRecord` tables. Tiers: Free (up to 50 invoices/mo), Starter ($29/mo, 1K invoices), Pro ($99/mo, 10K invoices), Scale (custom).
- **Acceptance:** End-to-end live test: customer signs up via portal, is charged, receives receipt, appears in Stripe dashboard.

### M2-BILL-02 — Usage metering
- **File:** `backend/src/middleware/metering.ts` (new)
- **Change:** Middleware increments per-customer per-month counter (`ApiUsage` table) on every authenticated call. Scheduled job pushes usage to Stripe `UsageRecord` endpoint daily at 00:05 UTC.
- **Acceptance:** `/v1/billing/status` returns a real `api_call_count_this_month` that matches counted requests within ±1%.

### M2-BILL-03 — Quota enforcement
- **File:** `backend/src/middleware/quota.ts` (new)
- **Change:** Middleware rejects calls beyond plan limit with 402 `QUOTA_EXCEEDED` and a link to upgrade. Grace of +10% for 48h before hard stop.
- **Acceptance:** Test simulates 60 calls on a 50-call plan — call 56 through 60 return 402 after the grace expires.

### M2-BILL-04 — Invoice-to-Stripe reconciliation
- **File:** new `backend/src/services/billing-reconciliation.ts`
- **Change:** Daily cron reconciles Stripe subscription state ↔ local `Subscription` table. Flags drift to mission-control.
- **Acceptance:** Reconciliation run against seeded drift detects and reports within 5 minutes.

---

## 5. WS-4 — LEGAL & CORPORATE (P0, M2)

**Goal:** Close the entity, IP, and AI-output gaps that make the company un-investable on paper. Owner: CEO agent (draft) + founder (sign-off).

### M2-LEG-01 — Form Delaware C-corp
- **Deliverable:** Certificate of incorporation, EIN, Stripe Atlas or equivalent.
- **Acceptance:** Corp exists, founder assigns all IP via an IP Assignment Agreement, AI agents assign their output via a "Works Made For Hire" clause referencing `constitution.md` authorship model.

### M2-LEG-02 — ToS v2 with AI-output disclaimer
- **File:** `frontend/app/legal/terms/page.tsx` (or equivalent)
- **Change:** Add clause: "Service features are produced by an autonomous software system. Invoica disclaims liability for code authored by non-human contributors to the extent permitted by law and warrants only the service levels set out in §X." Add binding arbitration, jurisdiction = Delaware.
- **Acceptance:** ToS reviewed by outside counsel; version bumped; customer opt-in flow in dashboard.

### M2-LEG-03 — DPA + GDPR rights implementation
- **Files:** `backend/src/routes/privacy.ts` (new), `frontend/app/settings/privacy/page.tsx` (new)
- **Change:** Sign Supabase DPA. Add endpoints: `POST /v1/privacy/export` (ships user their data by email), `DELETE /v1/privacy/account` (hard-deletes PII, tombstones invoices for tax-retention 10y, EU 7y). Cookie-consent UI on frontend for EU visitors.
- **Acceptance:** Manual test: deletion request clears customerEmail but keeps invoiceNumber, amount, txHash for tax audit trail.

### M2-LEG-04 — Money-transmitter legal opinion
- **Deliverable:** Written opinion from a fintech firm (Cooley, Goodwin, or DLT-specialist) confirming classification of Invoica under US MSB rules and EU MiCA.
- **Acceptance:** Opinion on file. If MSB required, MSB registration filed with FinCEN. If not required, specific activities that must stay out of scope are documented in `docs/compliance/regulatory-scope.md`.

### M2-LEG-05 — Trademark
- **Deliverable:** USPTO application for "Invoica" word mark in class 42 (SaaS) and class 36 (payment processing).
- **Acceptance:** Application filed, serial number recorded.

### M2-LEG-06 — Remove "Nexus Collective" and harmonize entity name
- **Files:** grep for "Nexus Collective" across repo and marketing surfaces
- **Change:** Replace with canonical C-corp name. Update copyright footers to current year and legal entity.

---

## 6. WS-5 — REAL CUSTOMER ACQUISITION (P0, M2→M4)

**Goal:** Escape the "zero customers" trap. This is the single most important work stream for investability. Owner: CMO + bizdev + founder (only human-to-human actions).

### M2-CUST-01 — Shut down the self-dealing visibility
- **Files:** `backend/src/routes/metrics.ts`, `frontend/app/dashboard/page.tsx`
- **Change:** Split metrics into `internal` (agent-generated) and `external` (real API key holders). Public dashboard/website shows only external. Internal number is a separate "system health" surface.
- **Acceptance:** Marketing page never shows a number that includes `@invoica.ai`, `@x402.invoica.ai`, or `sap-agent@*` traffic.

### M2-CUST-02 — Design-partner pipeline
- **Deliverable:** CRM (Notion or HubSpot Free) with the 36 targets, stage per target, last-contact date, decision-maker name, outcome. Weekly review written to `reports/growth/weekly.md`.
- **Acceptance:** By end of Week-3, 12 replies logged; by Week-4, 5 pilots onboarded with real API keys and at least one real invoice each.

### M2-CUST-03 — Concierge onboarding playbook
- **File:** `docs/onboarding/playbook.md` (new)
- **Change:** 30-minute Loom + checklist. Founder personally onboards first 10 customers. Each onboarding ends with: real API key issued, first invoice created, first settlement detected.
- **Acceptance:** Dashboard shows 10 distinct non-internal customer emails by M3.

### M3-CUST-04 — $10K real settlement volume
- **Deliverable:** 10 paying customers with combined USDC settlement ≥ $10,000 observed by the detector (not self-dealt).
- **Acceptance:** CFO agent produces a signed report with on-chain links.

### M4-CUST-05 — First $2K MRR
- **Deliverable:** Stripe dashboard shows $2K monthly recurring revenue by M4.
- **Acceptance:** Stripe screenshot in data room.

---

## 7. WS-6 — CODE-QUALITY DEBT PAYDOWN (P1, M3)

**Goal:** Get the codebase to a state where a hired engineer can own a module in a week. Owner: backend-core + supervisor-1 + supervisor-2.

### M3-CQ-01 — Enable TypeScript strict mode
- **File:** `tsconfig.json:8`
- **Change:** `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`. Fix or silence with per-file `// @ts-expect-error` and open a ticket for each. Target: < 20 remaining `@ts-expect-error` in backend by M3.
- **Acceptance:** `tsc --noEmit` passes; CI enforces.

### M3-CQ-02 — Consolidate Supabase client
- **Files:** 15 route files with their own `getSupabase()` / `getSb()`
- **Change:** Every route imports from `backend/src/lib/supabase.ts`. Delete local copies. Lint rule (custom ESLint) bans re-creating the client.
- **Acceptance:** `grep -rn "createClient(" backend/src/routes` returns zero hits.

### M3-CQ-03 — Break up oversized files
- **Targets (descending):**
  - `backend/src/telegram/ceoBot.ts` (1,371) → split by command/handler, move each to `backend/src/telegram/handlers/*.ts`
  - `backend/src/routes/invoices.ts` (1,158) → extract to `services/invoice-query.ts`, `services/invoice-mapper.ts`, `services/invoice-validator.ts`; route file ≤ 300 lines
  - `backend/src/routes/metrics.ts` (675) → split into `metrics/{summary,chains,agents,revenue}.ts`
  - `backend/src/routes/ledger.ts`, `settlements.ts`, `services/api-keys.ts`, `agents.ts`, `sap-escrow-bridge.ts` → each ≤ 300 lines
- **Acceptance:** No file in `backend/src/**` (excluding tests) exceeds 300 lines. Lint rule enforces.

### M3-CQ-04 — Kill `any`
- **Target:** Reduce `: any` and `as any` in `backend/src/` from 97 combined to ≤ 10 by M3, ≤ 0 by M4.
- **Acceptance:** Weekly CQ report shows trend; CI warns on increase.

### M3-CQ-05 — Central error handler everywhere
- **Files:** every route file, `middleware/error-handler.ts`
- **Change:** Routes use `next(err)` and the central handler writes the response. Silent catch blocks are banned by lint rule (`catch { }` without log or rethrow).
- **Acceptance:** `ast-grep` for silent catches returns 0.

### M3-CQ-06 — Consistent response envelope
- **Change:** Every route returns `{ success: boolean, data?, error?, meta? }`. Publish as OpenAPI 3.1 spec at `/openapi.json` and render via Redoc at `/docs/api`.
- **Acceptance:** OpenAPI lint (spectral) passes; 100% of routes documented.

---

## 8. WS-7 — TEST INTEGRATION DEPTH (P1, M3)

**Goal:** Eliminate test theater; prove the system works end-to-end. Owner: test-runner + test-utility-generator + backend-core.

### M3-TEST-01 — Staging Supabase clone + integration harness
- **Deliverable:** A `staging` Supabase project. New `backend/src/__integration__/` directory. Jest config split into `unit` and `integration` projects.
- **Acceptance:** `npm run test:integration` runs against staging and passes in CI on a nightly schedule.

### M3-TEST-02 — Full invoice lifecycle E2E
- **File:** `backend/src/__integration__/invoice-lifecycle.test.ts`
- **Coverage:** Create → detect on-chain → state transitions → CSV export → cancellation → refund. Uses a dedicated test chain (Sepolia for EVM, devnet for Solana) or pre-captured tx fixtures.
- **Acceptance:** Test takes < 3 min, runs on every push, catches replay bug introduced deliberately in a regression test.

### M3-TEST-03 — Settlement detector fixtures
- **Files:** `backend/src/services/settlement/__tests__/fixtures/`
- **Change:** Capture 5 real Base + 5 real Solana + 5 real Polygon USDC settlement txs. Replay against the detectors in tests. Include 3 negative fixtures (non-USDC, wrong recipient, failed tx).
- **Acceptance:** All 15 positive fixtures detect; 3 negative fixtures correctly return null.

### M3-TEST-04 — Kill 13 failing tests
- **Files:** tax + app routing tests
- **Acceptance:** `npx jest` reports 0 failures, 0 skips. If a failure reveals a real bug, file in WS-1.

### M3-TEST-05 — Coverage enforcement
- **Change:** Add `--coverage` to CI. Fail build if statement coverage in `backend/src/services/` or `backend/src/middleware/` drops below 80%.
- **Acceptance:** Coverage report published to `reports/coverage/*.html`.

---

## 9. WS-8 — INFRA PRODUCTION-READINESS (P1, M3)

**Goal:** Infra survives a Hacker News spike and a VC's TechOps advisor. Owner: devops agent.

### M3-INF-01 — Error tracking
- **Change:** Adopt Sentry (free tier). Wire backend, frontend, and all 21 PM2 processes. Per-release source maps.
- **Acceptance:** A deliberately thrown error in staging appears in Sentry within 60s with full stack trace and release ID.

### M3-INF-02 — Distributed state via Redis
- **Files:** rate-limiter, x402 nonce cache, mandate registry, settlement-poller `processedTransactionIds`
- **Change:** Replace in-memory `Map`/`Set` with Redis-backed stores. Provision Upstash or a Hetzner-hosted Redis with TLS.
- **Acceptance:** Run two backend instances behind a local nginx, run nonce + rate-limit stress test — no double-spend, shared rate limits.

### M3-INF-03 — Backup & restore SOP
- **File:** `docs/runbooks/backup-restore.md`
- **Change:** Daily Supabase PITR snapshot verification script. Documented 15-min RTO / 24-hr RPO. Quarterly restore drill recorded.
- **Acceptance:** First restore drill completes end-to-end, timestamped.

### M3-INF-04 — Health check depth
- **File:** `backend/src/routes/health.ts`
- **Change:** `/health/deep` checks: Supabase read + write, Redis, Stripe API, x402 seller wallet balance > threshold, latest block height on each chain within 60s. Alerts mission-control if any fails for > 5 min.

### M3-INF-05 — CI gates
- **File:** `.github/workflows/ci.yml`
- **Add jobs:** `test:unit`, `test:integration` (nightly), `lint`, `typecheck`, `coverage`, `verify-clean-repo`, `scan-secrets` (trufflehog or gitleaks).
- **Acceptance:** A PR that adds a secret or a file > 300 lines fails CI.

### M3-INF-06 — Staging environment
- **Change:** Second Hetzner VPS (or Fly.io region) running a mirror of the full stack against the staging Supabase. Dashboard reachable at `staging.invoica.ai`. All PRs deploy preview there.
- **Acceptance:** Preview URL posted on every PR within 3 min of push.

---

## 10. WS-9 — CLAIMS HYGIENE & DOCUMENTATION (P1, M2)

**Goal:** Marketing, CLAUDE.md, SOUL.md, README, website align with code reality. No more claims an auditor can tear down in 10 minutes. Owner: CEO + CMO + founder.

### M2-CLAIM-01 — Correct the numbers
- **Files:** `CLAUDE.md`, `SOUL.md`, `README.md`, `website/`, pinned X posts
- **Updates:**
  - "18 agents" → "42+ specialized agents" (or whatever current count is; script at `scripts/count-agents.sh`)
  - "769 commits" → current `git rev-list --count HEAD`
  - "Sprint 001-062e" → current sprint file count
  - "Tax engine, 12 countries" → "Tax engine: 27 EU countries + UK + 5 US states (CA, TX, NY, FL, WA)" or expand US coverage before the claim
  - "Multi-chain: Base, Polygon, Solana, Arbitrum" → drop Arbitrum until M1-MONEY-04 option A ships
  - "Live beta" — either onboard 5 external customers by M2 or say "closed preview"
- **Acceptance:** Automated `scripts/verify-claims.sh` diffs claimed numbers vs scripts output; CI fails on drift.

### M2-CLAIM-02 — Shipped-only policy enforced by tooling
- **File:** `agents/cmo/prompt.md`
- **Change:** CMO output passes through a gate that requires a linked commit SHA on `main` for every feature mentioned. Post without SHA = rejected.
- **Acceptance:** First week under the policy logs zero rejections AND zero over-claims.

### M2-CLAIM-03 — Public status page
- **Deliverable:** `status.invoica.ai` powered by `/health/deep`. Incident log public.

### M2-CLAIM-04 — Developer documentation
- **File:** `docs-site/` (already exists)
- **Change:** Ship OpenAPI 3.1 spec, `/docs/api` Redoc, SDK quickstart, webhook signature-verification code sample, x402 buyer walkthrough. Target: developer can create first real invoice in < 10 minutes.
- **Acceptance:** External reviewer completes the quickstart without help.

---

## 11. WS-10 — OBSERVABILITY, ANALYTICS, COMPLIANCE TELEMETRY (P2, M3→M4)

**Goal:** Know everything about the product in one dashboard; prove it to auditors. Owner: devops + CFO.

### M3-OBS-01 — Metrics pipeline
- **Change:** Prometheus-compatible metrics endpoint on backend, scraped by Grafana Cloud free tier. Dashboards: API latency, error rate, quota saturation, settlement success rate, per-chain health.

### M3-OBS-02 — Audit log
- **Change:** Every write to `Invoice`, `PaymentEvents`, `ApiKey`, `Webhook`, `Subscription` goes to an append-only `AuditLog` table with actor, action, before/after hash. Exposed read-only via `/v1/admin/audit` for the customer on their own records.

### M4-OBS-03 — SOC 2-readiness checklist
- **Deliverable:** Gap analysis by Vanta or Drata (free trial). First pass of policies: access control, change management, incident response, vendor management.

---

## 12. WS-11 — EXTERNAL VALIDATION (P2, M3→M4)

**Goal:** Third parties on record saying Invoica is safe and compliant. Owner: founder.

### M3-EXT-01 — Security audit
- **Deliverable:** Engagement with Trail of Bits, OtterSec, or Zellic. Scope: money-paths, auth, x402, PACT, webhook signing, ledger integrity.
- **Acceptance:** Report delivered. All Critical and High findings closed before M4. Medium findings have a dated remediation plan.

### M4-EXT-02 — Regulatory opinion (see M2-LEG-04) — final form in data room
### M4-EXT-03 — Independent code review — engage a second outside engineer to re-grade the code against this plan. Target grade ≥ B+.

---

## 13. SEQUENCING / DAG

```
Week 0-1 (M1):     WS-1, WS-2                      [blocking]
Week 1-2 (M2):     WS-3, WS-4 kickoff, WS-9
Week 2-4 (M2):     WS-5 acquisition, WS-4 close
Week 2-6 (M3):     WS-6, WS-7, WS-8
Week 6-8 (M3):     WS-10, WS-11 audit kickoff
Week 8-12 (M4):    WS-11 close, M4 gate
```

No WS-3 through WS-11 task may start until M1 is green. No WS-11 external-audit task until WS-1, WS-2, WS-6, WS-7 are at ≥ 90% complete.

---

## 14. SUCCESS METRICS (re-measured weekly)

| Metric | Today | M1 | M2 | M3 | M4 |
|---|---|---|---|---|---|
| External customers (non-internal emails) | 0 | 0 | 5 | 10 | 25 |
| MRR (Stripe) | $0 | $0 | $0 | $500 | $2,000 |
| Real settlement USDC / month | $0 | $0 | $100 | $10,000 | $50,000 |
| Unauth sensitive routes | ≥5 | 0 | 0 | 0 | 0 |
| Files > 300 lines in backend/src | 24 | 24 | 18 | 5 | 0 |
| `: any` + `as any` in backend/src | 97 | 97 | 60 | 10 | 0 |
| Failing tests | 13 | 0 | 0 | 0 | 0 |
| Integration-test coverage on services/ | ~0% | ~0% | 40% | 80% | 85% |
| External audit findings (Critical+High open) | n/a | n/a | n/a | 0 | 0 |
| Legal entity + ToS v2 | No | No | Yes | Yes | Yes |
| MSB legal opinion | No | No | Draft | Yes | Yes |
| Sentry deployed | No | No | Yes | Yes | Yes |

---

## 15. WHAT THIS PLAN INTENTIONALLY DOES NOT DO

- **No new product surface** (no reputation API launch, no agent marketplace, no gas backstop work) until M3 is green. Founder's own Feb 18 memo: build doesn't matter without customers.
- **No fundraising outreach** until M3 is green. Going out pre-M3 anchors the company at D+ investability.
- **No X threads, no "launch" posts** on any new subsystem until M2-CLAIM-02 is enforced. Shipped-only rule applies retroactively.
- **No architecture rewrites beyond the specific items in WS-6.** The swarm will be tempted to redesign the whole thing. Resist. Touch what the plan says, ship it, move on.
- **No premature scaling.** Don't add Redis until M3-INF-02. Don't containerize. Don't migrate to Kubernetes. The current PM2 setup is fine for the first 1000 customers.

---

## 16. DEFINITION OF DONE (PLAN-LEVEL)

This plan is done when an external VC-side technical auditor runs the same investigation as the April 17 audit and produces a memo with:

- Engineering grade ≥ A
- Security grade ≥ A-
- Business logic / money-safety grade ≥ A
- Code quality grade ≥ B+
- Data-integrity / real-usage grade ≥ B+
- Legal / compliance grade ≥ A-
- Infra grade ≥ A-
- **Overall investability grade ≥ A**

plus a specific recommendation line: "Invoica is investable at a priced round."

Until that memo exists, this plan is not done.

---

*Owner of this plan: CEO agent. Approver: founder. Reviewed every Friday at 17:00 UTC. Swarm executes per Conway Edition rules in `constitution.md`.*
