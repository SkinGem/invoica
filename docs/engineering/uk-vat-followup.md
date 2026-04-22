# Follow-up for `enh/audits` — add dedicated UK VAT handler

**Context:** Your audit branch (merged to main as `5eb10aa`) correctly removed UK from the EU VAT map. UK is not an EU jurisdiction post-Brexit and shouldn't share the same code path. But as currently merged, UK customers get charged 0% instead of the 20% they actually owe to HMRC under UK VAT law — a capability regression. Plan claims (`CLAUDE.md`, `SOUL.md`) still list UK as a supported jurisdiction.

Before we update those claims, please add a dedicated UK VAT handler so we keep the capability. Scope below.

## Acceptance

1. `backend/src/services/tax/uk-vat.ts` (new file) exports:
   - `UK_VAT_STANDARD_RATE = 0.20` constant
   - `UK_VAT_REDUCED_RATE = 0.05` constant (books, energy, children's car seats, etc. — out of scope for v1; document but don't apply)
   - `UK_VAT_ZERO_RATE = 0` constant (food, books, public transport — out of scope for v1)
   - `calculateUKVAT({ countryCode }: { countryCode: string }): number` — returns 0.20 if countryCode normalizes to `GB` or `UK`, 0 otherwise.
2. `backend/src/services/tax/location-resolver.ts`:
   - `isUKCountry(code: string): boolean` — true for `GB`/`UK` (case-insensitive)
   - `getJurisdiction()` returns a new `TaxJurisdiction.UK` variant when input is UK
3. `backend/src/services/tax/types.ts` — add `UK` to the `TaxJurisdiction` enum alongside `US_STATE` and `EU_COUNTRY`.
4. `backend/src/services/tax/calculator.ts`:
   - Imports `calculateUKVAT` and calls it when jurisdiction is UK
   - Returns a `TaxCalculationResult` with `jurisdiction: 'UK'`, `rate: 0.20`, `countryCode: 'GB'` (normalized)
5. `backend/src/routes/tax.ts` — POST `/v1/tax/calculate` accepts `countryCode: 'GB' | 'UK'` and returns the UK result.
6. Tests in `backend/src/services/tax/__tests__/uk-vat.test.ts`:
   - REVERT the "should return 0 for GB" guardrail tests — those should now assert 0.20 again. Restore the original expectations from before your audit commit.
   - Add a new test `'returns UK jurisdiction not EU_COUNTRY for GB'` asserting `getJurisdiction({ countryCode: 'GB' }) === 'UK'`.

## Non-goals

- Reduced-rate / zero-rate UK VAT categorization (food vs clothing vs books etc.). Out of scope for v1; log a TODO comment and move on.
- B2B reverse-charge handling. Out of scope.
- HMRC MTD (Making Tax Digital) filing integration. Separate track.
- UK VAT registration threshold monitoring (£90K rolling 12-month). Add to `src/scripts/nexus-monitor.ts` only if trivial; otherwise leave a TODO.

## Why this matters

Plan §9.1 ("Correct the numbers") says the tax engine covers "27 EU countries + UK + 5 US states." Without this follow-up, the honest post-merge claim would be "27 EU + 5 US" which reduces a marketing point we've already paid for in agent-tax work (see `TICKET-017-AGENTTAX-02` history). The owner prefers restoring UK capability over reducing the claim.

## Ship it as

- Branch: `enh/uk-vat-handler`
- Commit style: follow the same `feat(tax):` / `test(tax):` pattern you used on `enh/audits`
- One PR, small scope, should be under 150 LOC total including tests

Estimated effort: 30–60 minutes. If the existing test scaffold in `uk-vat.test.ts` gives you trouble, happy to jump on a quick call.

## Reference

- Audit merge commit: `5eb10aa` (and the three commits it brought in: `4e00477`, `60293e9`, `5eb10aa` merge)
- EU VAT file you refactored: `backend/src/services/tax/calculator.ts`
- Plan file: `plans/a-plus-investability-plan.md` §9.1
