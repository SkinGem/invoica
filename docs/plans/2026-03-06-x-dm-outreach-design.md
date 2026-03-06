# X DM Outreach — Design Doc
**Date:** 2026-03-06
**Status:** Approved

## Goal

Give the X-admin agent the ability to identify relevant X/Twitter accounts (builders working on x402, AI agent payments, Base ecosystem) and send them personalized outreach DMs on behalf of @invoica_ai.

## Approach

Standalone script `scripts/x-dm-outreach.ts`. Run on-demand, not cron-scheduled. Completely separate from the daily posting script (`run-x-admin.ts`) so DM failures cannot affect content posting.

## CLI Interface

```
ts-node scripts/x-dm-outreach.ts --run        # full cycle: discover → generate → send
ts-node scripts/x-dm-outreach.ts --dry-run    # discover + preview DMs, no sending
ts-node scripts/x-dm-outreach.ts --status     # show contacted accounts and run history
```

## Account Discovery

Twitter API v2 `GET /2/tweets/search/recent` using Bearer token (no OAuth needed for read).

Two search passes per run:
1. **Builder pass:** `(x402 OR "HTTP 402" OR "agent payments" OR "AI agent invoicing") lang:en -is:retweet`
2. **Ecosystem pass:** `("Base network" OR "Base L2" OR "USDC" OR "autonomous agents") (billing OR payments OR invoicing) lang:en -is:retweet`

For each tweet, fetch author fields: `id`, `username`, `name`, `description`, `public_metrics.followers_count`.

**Filters applied:**
- Skip accounts with no bio (likely bots)
- Skip accounts with < 50 followers
- Skip already-contacted accounts (state file check)
- Skip @invoica_ai itself

Cap: **20 candidates per run**.

## Personalization

For each candidate, call `claude-haiku-4-5` with their bio + the matching tweet to generate a 1-2 sentence DM:

**Prompt rules:**
- Address by first name if available
- Reference something specific from their bio or tweet
- Mention Invoica in one line: "financial OS for AI agents — automated invoicing, on-chain settlement"
- End CTA: "Free beta at invoica.ai — happy to walk you through it"
- Max 280 chars. No hashtags. No "Hey there!" openings.

**Example output:**
> "Hey Marco — saw you're building agent-to-agent payments on Base. We just shipped automated invoicing + settlement detection for exactly this. Free beta at invoica.ai — happy to walk you through it."

## DM Sending

Twitter API v2 `POST /2/dm_conversations` with OAuth 1.0a.

```json
{
  "participant_ids": ["<target_user_id>"],
  "message": { "text": "<personalized_dm>" }
}
```

**Rate limit safety:**
- Max 5 DMs per run
- 30 second delay between DMs
- Never DM same account twice
- On 403 error: stop run immediately (signals missing DM permission)

**Prerequisite:** X Developer Portal app must be upgraded to "Read and Write and Direct Messages" permission level.

## State & Logging

**State file:** `reports/x-admin/dm-outreach-state.json`
```json
{
  "contacted": {
    "<user_id>": { "username": "...", "sentAt": "ISO timestamp", "dmText": "..." }
  },
  "runs": [{ "date": "YYYY-MM-DD", "candidates": 20, "sent": 5 }]
}
```

**Log file:** `reports/x-admin/dm-outreach-YYYY-MM-DD.md` — full record of candidates found, DMs generated, send results.

## Files to Create / Modify

| File | Action |
|------|--------|
| `scripts/x-dm-outreach.ts` | CREATE — main outreach script |
| `agents/x-admin/prompt.md` | UPDATE — document DM outreach capability |
| `agents/x-admin/agent.yaml` | UPDATE — add `dm-outreach` to on_demand responsibilities |

## Out of Scope

- Auto-scheduling DM outreach (stays on-demand for now)
- Replies to DMs received
- Following accounts before DMing
- Bulk import of target accounts
