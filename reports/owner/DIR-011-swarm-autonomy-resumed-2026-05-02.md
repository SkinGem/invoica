# Owner Directive DIR-011 — Swarm autonomy resumed, half-shipped task pattern observed

**Date:** 2026-05-02
**From:** Owner
**To:** CEO / future sessions
**Priority:** Informational + 1 actionable

## Sprint-runner re-enabled cleanly

After 3 days of containment (Apr 28→May 1) following the audit-doc regen-leak loop, sprint-runner is back online and processing week-118 autonomously. All 4 leak defenses held overnight: source-side redaction, agent preamble rule, post-sprint-pipeline empty-stub fix, pre-commit hook.

### State of week-118 since re-enable (2026-05-01 11:00 UTC → 2026-05-02 morning)

- 1 cycle completed
- 1 commit shipped: `ea17dc8 feat(backend-tax): TAX-VAT-EVIDENCE-PERSIST-A`
- 0 leak commits (the recurring `M1-SEC-HOTFIX-01 - fix` pattern stopped, as expected — week-115a is parked)
- 0 bugfix-stub files created (post-sprint-pipeline fix from `4203a9f` holding)
- M3-CQ-03-A correctly suspended after 5 attempts (pre-flight refuses because deliverable files don't exist yet — task is supposed to CREATE them; needs sprint-author flag)

## Half-shipped pattern observed

The orchestrator is splitting multi-deliverable tasks by suffix (-A, -B, -C). `TAX-VAT-EVIDENCE-PERSIST-A` shipped only the SQL migration; the code wire-up (`vat-validator.ts`) and tests are presumably queued as -B and -C and have not yet shipped.

**Implication:** A migration table without code that writes to it is dead weight. The migration should NOT be applied to prod until the code half ships and we can audit the package together.

## Audit findings on `008_vat_evidence.sql`

Migration is functional but has 4 design issues to fix in a follow-up commit before prod-apply:

1. **Table name `vat_evidence` (snake_case)** is inconsistent with the rest of the schema (`"Invoice"`, `"ClinPaySession"`, `"DrsReceipt"`). If the part-B code uses PascalCase, the table won't be found.
2. **No FK to `Invoice(id)`** despite spec; just plain TEXT.
3. **RLS policies wide-open** (`USING(true)`, `WITH CHECK(true)`) — fine for sandbox, leaks across tenants in prod.
4. **`upsert_vat_evidence` misnamed** — it's INSERT-only with no `ON CONFLICT`.

## Actionable

- **DO NOT apply migration `008_vat_evidence.sql` until parts B and C ship.** Wait for the full package, then audit + fix the 4 design issues together.
- If parts B/C don't ship within 48h (i.e. by 2026-05-04), manually finish the task or split it explicitly into separate sprint entries with the design fixes applied.
- Add an `isNewFile: true` (or equivalent) flag to deliverables that don't exist yet, so pre-flight doesn't block tasks like M3-CQ-03-A. Sprint 2 cleanup item, not blocking.

## Reference

- Loop containment: DIR-010 (2026-04-28) + commits `4203a9f` `ac1cb2b` `406a294` `55913fb` `98eed23` `7883513`
- Pre-commit hook: `scripts/pre-commit-secret-scan.sh` (live on Mac + Hetzner)
- Agent preamble rule: `agents/CONSTITUTION_PREAMBLE.md` "NEVER LEAK SECRETS IN OUTPUT" section
- Sprint-runner ecosystem config: `ecosystem.config.js` (cron `*/30 * * * *`, autorestart=false)
- Mastercard demo: 1 of 3 cycles settled (DIR-010 §Mastercard); cycles 2/3 scheduled via remote triggers `trig_01YAsky1a95d3wi1HMpncSy9` (Sat) + `trig_01CYQww8qV9e8BkQEzY3qnzB` (Mon)
- Outstanding: 14 keys to rotate (Anthropic + Supabase first), KYB docs to AsterPay, Petteri reply
