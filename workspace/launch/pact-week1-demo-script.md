# PACT Week 1 Demo Script

**Format:** 3-minute code-is-the-demo video
**Recording date:** Tuesday April 8, 2026
**Launch date:** Wednesday April 9, 2026 (X thread + video)
**Narrator:** Screen recording with voiceover (or text overlay)

---

## Structure

### HOOK (0:00–0:20)

*Visual: Terminal with two agent IDs blinking*

"Two AI agents want to do business. One has $50,000 in its wallet. The other has never been seen before. How much should they trust each other?"

"Today, the answer is: they can't. There's no trust layer between agents."

"Until now."

---

### THE PROBLEM (0:20–0:45)

*Visual: Diagram — Agent A ↔ ? ↔ Agent B*

"The agent economy has a trust gap. Agents can call APIs, pay with USDC, settle on-chain — but there's no protocol that answers: how much should this agent be allowed to spend? What's their reputation? Should I accept this payment?"

"Stripe doesn't solve this. It's built for humans with bank accounts. Agents need something native."

---

### THE SOLUTION: PACT (0:45–1:15)

*Visual: PACT flow diagram — 5 chambers*

"PACT is a trust-gated session protocol. When two agents transact through Invoica, PACT enforces spending limits based on real reputation data."

"Here's how it works:"

"Chamber 1: Agent requests a session."
"Chamber 2: Invoica queries Helixa for the agent's Cred Score. Score 85+? Full trust, $1M ceiling. Score unknown? Provisional — $50 max."
"Chamber 3: The agents transact — invoices, tax compliance, escrow settlement."
"Chamber 4: Session ends. Invoica reports the outcome back to Helixa. Good behavior? Trust goes up. Bad? Trust goes down."

"It's a reputation flywheel. Every transaction makes the next one safer."

---

### LIVE DEMO (1:15–2:30)

*Visual: Terminal — live curl commands against api.invoica.ai*

"Let me show you this running live. Right now. On Invoica's production API."

**Step 1 — Seller starts a session:**
```
curl -X POST https://api.invoica.ai/v1/pact/session/start \
  -d '{"grantor":"seller-agent-0xBBBB"}'
```
*Show response: sessionId, ceiling: PROVISIONAL, maxUsdc: 50, jwt*

"Seller gets a session immediately. Ceiling is PROVISIONAL — $50 max. The Helixa score check is happening in the background."

**Step 2 — Buyer starts a session and pays:**
```
curl -X POST https://api.invoica.ai/v1/pact/session/start \
  -d '{"grantor":"buyer-agent-0xAAAA"}'
```

**Step 3 — Buyer creates an invoice via x402 escrow:**
```
curl -X POST https://api.invoica.ai/api/sap/execute \
  -H "X-Payment-Protocol: SAP-x402" \
  -H "X-Payment-Escrow-PDA: GrY3CHeAptBBvoB2XWCVe8uxUdkCJHTkDjhB2mP9MunC" \
  -d '{"capability":"payment:invoice","params":{"issuer":"buyer","recipient":"seller","amount":0.01}}'
```
*Show response: invoice created with invoiceNumber, amount, USDC*

"Invoice created. On-chain escrow verified. Tax compliance ready."

**Step 4 — Buyer gets tax compliance:**
```
curl -X POST https://api.invoica.ai/api/sap/execute \
  -H "X-Payment-Protocol: SAP-x402" \
  -H "X-Payment-Escrow-PDA: GrY3CHeAptBBvoB2XWCVe8uxUdkCJHTkDjhB2mP9MunC" \
  -d '{"capability":"compliance:tax","params":{"buyer_state":"CA","amount":100}}'
```
*Show response: jurisdiction US-CA, rate 7.25%, tax line*

"12-country tax compliance in one API call."

**Step 5 — Both sessions complete with Soul Handshake:**
```
curl -X POST https://api.invoica.ai/v1/pact/session/{id}/complete \
  -d '{"outcome":"success","jwt":"..."}'
```
*Show response: trustDelta: +2*

"Session complete. Trust delta +2 reported to Helixa. Next time this agent starts a session, its ceiling will be higher."

---

### CTA (2:30–3:00)

*Visual: Invoica logo + endpoints*

"This is live today. Free beta through April 22."

"Three things you can do right now:"

"One — start a PACT session: POST to api.invoica.ai/v1/pact/session/start"

"Two — read the x402 manifest: GET api.invoica.ai/.well-known/x402"

"Three — try the SDK: npm install @invoica/pact"

"Invoica. The financial OS for the agent economy."

*Visual: invoica.ai | @invoica_ai | Built on x402*

---

## POST-VIDEO X THREAD STRUCTURE

**Tweet 1 (video):**
We just shipped PACT — trust-gated sessions for the agent economy.

Two agents. One PACT session. Spending ceiling enforced by reputation score. Soul Handshake on exit.

3-minute live demo (production API, not a mockup): [video]

**Tweet 2:**
The problem: agents can pay each other, but there's no protocol for "how much should I trust this agent?"

PACT solves this. Start PROVISIONAL ($50), earn your ceiling through behavior. Score 85+ = FULL ($1M).

**Tweet 3:**
How it works:
- Session start → Helixa Cred Score check (async)
- Score → ceiling mapping (PROVISIONAL → RESTRICTED → STANDARD → FULL)
- Transaction → x402 escrow on Solana
- Session end → Soul Handshake reports outcome to Helixa
- Trust delta: +2 (success) or -2 (failed)

**Tweet 4:**
Built on:
- x402 protocol (x402 Foundation — Linux Foundation + Stripe + Coinbase + AWS)
- Helixa reputation scoring (ERC-8004)
- SAP escrow on Solana (Oobe Protocol)
- 12-country tax compliance (AgentTax)

**Tweet 5 (CTA):**
Free beta through April 22. Three endpoints:
- POST /v1/pact/session/start
- POST /api/sap/execute
- GET /.well-known/x402

npm install @invoica/pact

invoica.ai | @invoica_ai

---

## RECORDING NOTES

- Use a clean terminal (dark theme, large font)
- Pre-stage all curl commands in a script so execution is smooth
- Run against PRODUCTION api.invoica.ai (not localhost)
- Show real responses — no faking
- If Helixa score resolves during the demo (ceiling upgrades from PROVISIONAL), show it live
- Keep it under 3 minutes — developers lose interest after that
