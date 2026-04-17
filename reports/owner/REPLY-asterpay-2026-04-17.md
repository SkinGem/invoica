# Draft reply to Asterpay dev — 2026-04-17

**Context:** Asterpay dev privately flagged (1) a live-format Invoica API key hard-coded in Godman-s/pact/demo-negotiation.ts, (2) a non-constant-time HMAC compare in src/verifier.ts.

**Channel:** same channel the report came in on. Reply from the owner (skingem / skininthegem@gmail.com), not from a Invoica company handle.

**Tone:** direct, professional, no deflection. Credit the finder; confirm scope; state action; don't over-share.

---

## Draft

Thanks — both confirmed, both real, both on me.

1. **Key leak.** The `sk_...` in `Godman-s/pact/demo-negotiation.ts` is a live Invoica key. Godman-s is my own GitHub account (the PACT demo side — same person as skingem1 on the Invoica side), so this is my own key in my own repo, not a customer key. Doesn't make it less bad. Revoking it now, rotating, and env-ifying the constant. History stays public so revocation is the real fix — force-rewriting a public repo's history breaks forks. Anyone who's already scraped the string gets a 401 the next time they try it.

2. **Timing attack in verifier.ts.** You're right — `!==` on the HMAC hex string is the wrong primitive for a public reference impl, even if the practical exploit cost is high. Switching to `crypto.timingSafeEqual` with a length-check guard, same commit. Will push to main today.

Also adding a repo-sweep for any other leaked credentials across my public repos, and moving forward secret-scanning is going into Invoica's CI (was already on the roadmap — this pushes it up).

Appreciate the catch. If you notice anything else, keep it coming.

— SkinGem

---

## Notes for the owner before sending

- Reply **after** HOTFIX-01 revocation is confirmed green (ApiKey row shows `revoked=true` in Supabase). Don't claim "revoked" before it's true.
- Reply **after or with** HOTFIX-02 commit is pushed to Godman-s/pact, so the "will push today" line lands true the same day.
- If the forensic audit (HOTFIX-01) turns up anything suspicious (non-owner IPs, unknown endpoints), **do not send this reply as-is** — it says "not a customer key" which is still true, but you may want to add one line acknowledging usage outside your machines. Owner judgment.
- Do not mention the internal roadmap specifics (M1-SEC-07 format migration, M1-GATE-04 trufflehog). The Asterpay dev doesn't need the bill of materials.
