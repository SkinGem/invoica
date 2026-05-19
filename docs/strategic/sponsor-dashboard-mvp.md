# Sponsor Dashboard MVP — Design

**Status:** Draft v0.1 · 2026-05-18
**Source:** TICKET-048 Sprint 3 (Kognai Notion Change Log)
**Trigger:** AG PoC will surface this need by week 2 of the engagement (Franco's CFO team will want a daily view, not just a CLI rollup).
**Build effort:** 5-7 person-days when greenlit.

---

## 1. What it is

The merchant-facing surface for sponsors (AG, Kantar, future panel operators) to:

1. Set up a study (mandate template + funding)
2. See payouts as they happen (live feed)
3. Reconcile end-of-period (rollup, exports)
4. Manage their delegation (CDP) + active studies + audit trail

Today: the `--rollup` CLI script. Functionally correct, operationally inadequate for an AG CFO team.

## 2. MVP scope (the minimum viable surface)

Three pages. No more.

### Page A — `/sponsors/studies`

Study setup + funding management.

| Element | What it does |
|---|---|
| **Active studies list** | One row per study: ID, status, mandate cap, funded balance, payouts-to-date, last payout time |
| **Create study button** | Wizard: study ID, jurisdiction, mandate cap (USDC), expiry, expected payout count, batch sub-€10 toggle |
| **Fund study button** | Stripe Checkout for fiat-funded sponsors OR USDC deposit address for crypto-funded |
| **Close study button** | Auto-revokes any delegation; sets study to read-only; produces final audit pack |

### Page B — `/sponsors/payouts`

Live payment feed.

| Column | Format |
|---|---|
| Time | Local time, sortable |
| Study ID | Link to Page A |
| Visit / event ID | Free-text panel-side identifier |
| Recipient (anonymized) | Last 4 of token hash, not PII |
| Amount | EUR (with EUR conversion if USD/GBP) |
| Fee (AG side) | The 2% / floor / cap fee, shown explicitly |
| Status | PENDING / SETTLED / FAILED / OUTSTANDING |
| Receipt | Drill-down link to DRS receipt page |

Filters: by study, by date range, by status. Real-time refresh every 30s (or websocket if cheap).

### Page C — `/sponsors/reconciliation`

End-of-period rollup + exports.

| Element | What it does |
|---|---|
| **Period selector** | Day / week / month, custom range |
| **Bucket table** | Same shape as the `--rollup` CLI output but in HTML |
| **Tax line totals** | Sum of `total_tax` per jurisdiction (UK VAT, US sales tax breakdowns) |
| **Export CSV** | Flat per-payout CSV for AG's accounting system |
| **Export PDF** | Branded audit-pack for end-client deliverables |
| **Delegation status** | "Current CDP delegation expires in 4 days. Renew?" |

## 3. Out of scope for MVP

- Multi-tenant administration (sponsor team management — one user per Customer for MVP)
- Patient onboarding (separate page, separate sprint)
- Sponsor-level analytics dashboards (charts, trend graphs) — defer to v2
- Mobile responsive deep polish — desktop-first
- White-label / theming (every sponsor sees Invoica branding for MVP)
- Webhook configuration UI (sponsors set webhooks via API for MVP)

## 4. Auth model

- Supabase JWT (dashboard) per existing `/v1/billing/balance` pattern
- All routes gated to `req.customer.id` matching the sponsor's Customer row
- New role: `sponsor_admin` (the only user type the MVP exposes — adds team mgmt in v2)

## 5. API surface (backend additions needed)

Most data already exists in the DB. New endpoints needed:

| Endpoint | Purpose |
|---|---|
| `GET /v1/sponsors/me/studies` | List active studies for sponsor |
| `POST /v1/sponsors/me/studies` | Create study (writes PACT mandate template, funds escrow) |
| `PATCH /v1/sponsors/me/studies/:id/close` | Close study, revoke delegation |
| `GET /v1/sponsors/me/payouts` | Live feed query (paginated, filterable) |
| `GET /v1/sponsors/me/reconciliation` | Bucket query (already exists as `/v1/clinpay/reports/rollup`, just rename or alias) |
| `POST /v1/sponsors/me/exports` | Async PDF/CSV export job |

All compose on existing tables (`ClinPaySession`, `Invoice`, `DrsReceipt`, `Customer`, `Credit`).

## 6. New DB additions

Minimal. One new table:

```sql
CREATE TABLE "Study" (
  id                       TEXT PRIMARY KEY,        -- e.g. "AllGlobalPoC-001"
  sponsor_customer_id      TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE RESTRICT,
  name                     TEXT NOT NULL,
  status                   TEXT NOT NULL CHECK (status IN ('active', 'closed', 'paused')),
  mandate_max_payment_usdc NUMERIC(19, 4) NOT NULL,
  mandate_expires_at       TIMESTAMPTZ NOT NULL,
  jurisdiction             TEXT,
  funded_balance_usdc      NUMERIC(19, 4) NOT NULL DEFAULT 0,
  payout_count             INTEGER NOT NULL DEFAULT 0,
  payout_total_eur         NUMERIC(19, 4) NOT NULL DEFAULT 0,
  batch_sub_eur_threshold  NUMERIC(19, 4) DEFAULT 10.0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at                TIMESTAMPTZ
);
```

`Invoice.paymentDetails.studyId` already exists — wire it up. `ClinPaySession.study_id` already exists.

## 7. Frontend stack

Reuse existing Next.js app (`frontend/`). Three new pages under `app/sponsors/`. Existing api-client + auth patterns. Tailwind (Invoica brand colors already configured).

Components to build:
- `<StudyCard>` (Page A list item)
- `<StudyCreateWizard>` (modal, multi-step)
- `<PayoutsFeed>` (Page B table + filters)
- `<RollupTable>` (Page C bucket display — reuses the API behind `/v1/clinpay/reports/rollup`)
- `<ExportButton>` (async job trigger + download link)
- `<DelegationStatusCard>` (renew countdown, link to grant flow)

## 8. Effort breakdown

| Item | Days |
|---|---|
| `Study` migration + backend service | 0.5 |
| `/v1/sponsors/me/*` route implementations | 1.5 |
| Three Next.js pages | 2.0 |
| Components (8 listed) | 1.0 |
| Async export job (PDF + CSV) | 1.0 |
| E2E smoke tests + AG sandbox cycle | 0.5 |
| Polish, mobile pass, accessibility basics | 0.5 |
| **Total** | **7 days** |

## 9. Build sequence (when greenlit)

Sprint week 1: backend (migration + 5 routes) + Page A.
Sprint week 2: Page B + Page C + exports.
Day to spare: polish + e2e.

Ship behind a feature flag (`SPONSOR_DASHBOARD_ENABLED`) so AG sees it only when ready. Default off, on for `all-global-poc` customer first.

## 10. Decision: build before AG demo or after?

**Build AFTER demo.** Here's why:

- AG demo (Wed/Thu this week) doesn't require the dashboard. The `--rollup` CLI screen-share in Stage 4 is sufficient demo material.
- Franco's CFO team won't see the dashboard until they're actually using the rails — week 2-3 of the engagement.
- Spending 7 days on the dashboard before demo trades against zero AG conversion lift.
- If AG signs after the demo, build the dashboard in week 1 post-signing while their team is onboarding. By the time they want a daily view, it exists.

Counter-build-now: only if Franco specifically asks for a screenshot of a sponsor dashboard during the demo. Verbal description + the CLI rollup output should suffice.
