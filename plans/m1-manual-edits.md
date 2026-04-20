# M1 Manual Edits — `invoices.ts`

**Why manual:** `backend/src/routes/invoices.ts` is 1158 lines. Coding agents (MiniMax and Claude Sonnet both) regenerate from scratch rather than surgically edit, and the integrity check catches the 45% size drop every time. Plan §M3-CQ-03 targets splitting this file to ≤300 lines, but that's M3 work — we can't wait.

**Estimated time:** 60–90 min total for all four tasks.

**After each edit:** commit with the task ID so the plan's "every PR cites a task ID" rule is satisfied.

---

## M1-MONEY-01 — Terminal state machine (~10 min)

**File:** `backend/src/routes/invoices.ts:864-869`

**Find:**
```typescript
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'SETTLED', 'COMPLETED'],
      SETTLED: ['PROCESSING', 'COMPLETED'],
      PROCESSING: ['COMPLETED', 'PENDING'],
      COMPLETED: [],
    };
```

**Replace with:**
```typescript
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'SETTLED', 'CANCELLED'],
      PROCESSING: ['SETTLED', 'CANCELLED'],
      SETTLED: ['COMPLETED', 'REFUNDED'],
      COMPLETED: ['REFUNDED'],
      CANCELLED: [],
      REFUNDED: [],
    };
```

**What changed:**
- `PENDING → COMPLETED` removed (must go via SETTLED)
- `SETTLED → PROCESSING` removed (no rolling back settlement)
- `PROCESSING → PENDING` removed (no rolling back)
- Added `CANCELLED` and `REFUNDED` as terminal states
- Added `CANCELLED` as an option from PENDING and PROCESSING
- Added `REFUNDED` as an option from SETTLED and COMPLETED

**Test file to create:** `backend/src/routes/__tests__/invoice-state-machine-terminal.test.ts` — let the swarm do this after you commit. Or hand-write a minimal table test that iterates every from/to pair.

**Commit:**
```
git commit -m "fix(M1-MONEY-01): make SETTLED and COMPLETED terminal

Removes the PROCESSING → PENDING and SETTLED → PROCESSING rollbacks.
Adds CANCELLED and REFUNDED terminal states per plan §2.
"
```

---

## M1-MONEY-07 — Helixa failure policy env flag (~15 min)

**File:** `backend/src/routes/invoices.ts:895-916`

**Find** (the Helixa trust ceiling block starting at "Helixa trust ceiling check"):
```typescript
      // Helixa trust ceiling check (PACT Chamber 2 — non-blocking on API failure)
      const mandateHeader = req.headers['x-pact-mandate'] as string | undefined;
      if (mandateHeader) {
        try {
          const mandate = JSON.parse(mandateHeader) as { grantor?: string };
          if (mandate.grantor) {
            const cred = await fetchHelixaCred(mandate.grantor);
            if (cred) {
              const { ceiling, maxUsdc } = getHelixaTrustCeiling(cred.score, cred.verification_status);
              const invoiceAmount = Number(existing.amount) || 0;
              if (ceiling === 'REJECTED') {
                res.status(403).json({ success: false, error: { message: 'Helixa trust score below minimum threshold', code: 'HELIXA_REJECTED' } });
                return;
              }
              if (invoiceAmount > maxUsdc) {
                res.status(403).json({ success: false, error: { message: `Helixa ceiling ${ceiling}: max ${maxUsdc} USDC`, code: 'HELIXA_CEILING_EXCEEDED' } });
                return;
              }
            }
          }
        } catch { /* non-blocking — if Helixa unavailable, proceed */ }
      }
```

**Replace with:**
```typescript
      // Helixa trust ceiling check (PACT Chamber 2)
      // Policy controlled by HELIXA_POLICY env var:
      //   fail-closed (default) — reject on any Helixa error (prod default)
      //   fail-open — proceed on Helixa error (explicit opt-in, founder-only per plan §0.5)
      const mandateHeader = req.headers['x-pact-mandate'] as string | undefined;
      if (mandateHeader) {
        const helixaPolicy = process.env.HELIXA_POLICY === 'fail-open' ? 'fail-open' : 'fail-closed';
        try {
          const mandate = JSON.parse(mandateHeader) as { grantor?: string };
          if (mandate.grantor) {
            const cred = await fetchHelixaCred(mandate.grantor);
            if (cred) {
              const { ceiling, maxUsdc } = getHelixaTrustCeiling(cred.score, cred.verification_status);
              const invoiceAmount = Number(existing.amount) || 0;
              if (ceiling === 'REJECTED') {
                res.status(403).json({ success: false, error: { message: 'Helixa trust score below minimum threshold', code: 'HELIXA_REJECTED' } });
                return;
              }
              if (invoiceAmount > maxUsdc) {
                res.status(403).json({ success: false, error: { message: `Helixa ceiling ${ceiling}: max ${maxUsdc} USDC`, code: 'HELIXA_CEILING_EXCEEDED' } });
                return;
              }
            } else if (helixaPolicy === 'fail-closed') {
              res.status(503).json({ success: false, error: { message: 'Helixa unavailable and HELIXA_POLICY=fail-closed', code: 'HELIXA_UNAVAILABLE' } });
              return;
            }
          }
        } catch {
          if (helixaPolicy === 'fail-closed') {
            res.status(503).json({ success: false, error: { message: 'Helixa unavailable and HELIXA_POLICY=fail-closed', code: 'HELIXA_UNAVAILABLE' } });
            return;
          }
          // fail-open: proceed as before
        }
      }
```

**Also add to `.env` on Hetzner:** `HELIXA_POLICY=fail-closed`

**Commit:**
```
git commit -m "fix(M1-MONEY-07): HELIXA_POLICY env flag (default fail-closed)

Plan §2.7: Helixa failure policy is now an explicit choice, not an accident.
Default is fail-closed in prod. Owner can flip to fail-open via .env.
"
```

---

## M1-MONEY-05 and M1-MONEY-06 — defer to small-scope swarm dispatch

Both tasks need:
- A new Supabase migration file (easy — swarm can do, new file)
- An edit to `invoices.ts` (hard — the 1158-line problem)

**Option X — Split these into sub-sprints:**
Create `sprints/week-115b.json` that ONLY has the migration file deliverables (no `invoices.ts`). Swarm ships those two migrations. Then you add the `invoices.ts` wiring manually after.

Or simpler — skip 05/06 for this run. Ship 01 + 07 + the swarm-only tasks now. Address 05/06 after `invoices.ts` is split in M3 (WS-6) OR as a dedicated human-effort session later this week.

The money-safety minimum for M1 gate is: **M1-MONEY-01 (terminal) + M1-MONEY-02 (PaymentEvents) + M1-MONEY-03 (no fallback) + M1-MONEY-04 (Arbitrum)**. M1-MONEY-05 (audit) and M1-MONEY-06 (idempotency) are defensible as M2 work if we need to slip them — neither is required to prevent the exact duplicate-settlement scenario that M1 exists to close.

**Recommended M1 scope reduction:** ship 01, 02, 03, 04, 07 by gate. Defer 05 and 06 to week-118 (post-M1). Update DIR-005 to reflect.

---

## What the swarm will handle after your manual edits

Remaining swarm-dispatchable tasks:
- **M1-MONEY-02** — new migration file + wire-up across 4 settlement files. Biggest task, auto-decomposes.
- **M1-MONEY-03** — delete `detectViaFallback` from sap-escrow-bridge. Surgical.
- **M1-MONEY-04** — extend EVM detector for Arbitrum. New file-friendly task.

Once your 01 and 07 commits land, dispatch:
```
ssh invoica-server "cd /home/invoica/apps/Invoica && git pull origin main && ./scripts/run-swarm.sh sprints/week-115.json 2>&1 | tail -150"
```

The orchestrator will skip 01 and 07 (status will be `done` from your commits) and run 02, 03, 04.
