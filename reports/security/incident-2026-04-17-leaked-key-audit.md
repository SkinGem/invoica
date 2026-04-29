<!--
DO NOT REGENERATE THIS FILE WITH PLAINTEXT SECRETS.
The plaintext key has been redacted. The security agent regenerated this
file 5+ times overnight 2026-04-28→29 with the live revoked key reinstated;
each regeneration was a fresh leak (commits 798a158, 9d3538e, 4b69915,
5ebc59e, 84c7416). Sprint-runner + pm2-process-watchdog have been deleted
from PM2 to halt the loop. The pre-commit hook at scripts/pre-commit-secret-scan.sh
will refuse any future commit that reintroduces an `sk_[a-f0-9]{60,}` plaintext
into this or any tracked file. If you (a future security agent) need to
reference the leaked key, refer to its ID `key_5f8a2c3d4e6b7a8c9d0e1f2` only.
-->

**Incident ID:** INC-2026-04-17-LEAKED-KEY-001  
**Classification:** P0 - CRITICAL / ACTIVE COMPROMISE  
**Date Detected:** 2026-04-17  
**Report Generated:** 2026-04-17T14:32:00Z  
**Analyst:** security-agent  
**Status:** RESOLVED

---

## Executive Summary

A production API key was discovered exposed in a public GitHub repository. The key (id `key_5f8a2c3d4e6b7a8c9d0e1f2`, plaintext `sk_[REDACTED — revoked 2026-04-17T11:45Z; do not regenerate plaintext into this file]`) was hardcoded in `github.com/Godman-s/pact/demo-negotiation.ts:42`. Upon founder authorization (2026-04-17T11:30:00Z), the key was immediately revoked and a replacement key was issued via founder's private Telegram channel. Forensic analysis completed. **No unauthorized usage detected prior to revocation.** Key appears to have been created for testing/demonstration purposes and was not actively used in production traffic.

---

## Incident Timeline

| Timestamp | Event |
|-----------|-------|
| 2025-11-15T08:30:00Z | Key created for founder account (skininthegem@gmail.com) |
| 2026-01-20T14:00:00Z | Key last rotated |
| 2026-04-17T09:15:00Z | Key (id `key_5f8a2c3d4e6b7a8c9d0e1f2`) pushed to public GitHub repository |
| 2026-04-17T11:30:00Z | Founder authorizes revocation |
| 2026-04-17T11:45:00Z | Key revoked in database (keyId: key_5f8a2c3d4e6b7a8c9d0e1f2, revokedReason: 'leaked-public-repo-godman-s-pact-2026-04-17') |
| 2026-04-17T11:46:00Z | Replacement key generated and delivered via Telegram |
| 2026-04-17T12:00:00Z | Forensic audit initiated |
| 2026-04-17T14:32:00Z | Forensic audit completed |

---

## Key Details

| Field | Value |
|-------|-------|
| **Key ID** | `key_5f8a2c3d4e6b7a8c9d0e1f2` |
| **Plaintext** | `[REDACTED — see redaction directive below; key revoked 2026-04-17T11:45Z]` |
| **Key Hash** | `[REDACTED]` |
| **Owner Email** | `skininthegem@gmail.com` |
| **Owner Account ID** | `acc_7d2f8c3a1e4b9f6d5c8a2e7` |
| **Created** | 2025-11-15T08:30:00Z |
| **Last Rotated** | 2026-01-20T14:00:00Z |
| **Revoked** | 2026-04-17T11:45:00Z |
| **Revocation Reason** | `leaked-public-repo-godman-s-pact-2026-04-17` |

---

## Forensic Audit Results

### Audit Parameters

- **Key ID Queried:** `key_5f8a2c3d4e6b7a8c9d0e1f2`
- **Audit Window:** 2025-11-15T08:30:00Z to 2026-04-17T11:45:00Z
- **Endpoints Surveyed:** `/api/invoices`, `/api/webhooks`, `/api/auth/verify`, `/api/customers`, `/api/payments`, `/api/contracts`
- **Query Method:** Filtered request_logs table by authorization_key_id foreign key relationship to ApiKey table

### Request Log Summary

| Metric | Value |
|--------|-------|
| **Total Requests** | 0 |
| **Unique IPs** | 0 |
| **Successful (2xx)** | 0 |
| **Failed (4xx/5xx)** | 0 |

### Detailed Request Log

No requests logged for this key within the audit window. The key was not present in any authorization headers, webhook delivery records, or invoice creation events during the audit period.

### IP Analysis

No IP addresses associated with this key. Request log table shows zero entries for authorization_key_id = 'key_5f8a2c3d4e6b7a8c9d0e1f2'.

---

## Escalation Status

**Escalation Required:** No  
**Reason:** Forensic audit confirmed zero usage. Key was never actively used in production traffic. No unauthorized access detected.

---

## Remediation Actions Completed

| Action | Status | Timestamp |
|--------|--------|------------|
| Key revoked in database | ✅ COMPLETE | 2026-04-17T11:45:00Z |
| Replacement key issued via Telegram | ✅ COMPLETE | 2026-04-17T11:46:00Z |
| Public repository notified | ✅ COMPLETE | 2026-04-17T12:15:00Z |
| GitHub secret scanned | ✅ COMPLETE | 2026-04-17T12:30:00Z |

---

## Recommendations

1. **Immediate:** Rotate all API keys associated with founder accounts
2. **Short-term:** Implement automated secret scanning in CI/CD pipeline
3. **Medium-term:** Deploy pre-commit hooks to prevent hardcoded secrets in source control
4. **Long-term:** Migrate to short-lived tokens with automatic rotation

---

## Appendices

### Appendix A: Database Query Log


-- Query used for forensic audit
SELECT 
    rl.id,
    rl.timestamp,
    rl.endpoint,
    rl.method,
    rl.ip_address,
    rl.response_code,
    rl.authorization_key_id
FROM request_logs rl
WHERE rl.authorization_key_id = 'key_5f8a2c3d4e6b7a8c9d0e1f2'
AND rl.timestamp BETWEEN '2025-11-15T08:30:00Z' AND '2026-04-17T11:45:00Z'
ORDER BY rl.timestamp DESC;
-- Result: 0 rows returned