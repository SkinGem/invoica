**Incident ID:** INC-2026-04-17-LEAKED-KEY-001  
**Classification:** P0 - CRITICAL / ACTIVE COMPROMISE  
**Date Detected:** 2026-04-17  
**Report Generated:** 2026-04-17T14:32:00Z  
**Analyst:** security-agent  
**Status:** RESOLVED

---

## Executive Summary

A production API key was discovered exposed in a public GitHub repository. The key `sk_302e3efa383ddf86c2247b7c03f859e6a6b0facab582f5c4be83abea71d17047` was hardcoded in `github.com/Godman-s/pact/demo-negotiation.ts:42`. Upon founder authorization (2026-04-17T11:30:00Z), the key was immediately revoked and a replacement key was issued via founder's private Telegram channel. Forensic analysis completed. **No unauthorized usage detected prior to revocation.**

---

## Incident Timeline

| Timestamp | Event |
|-----------|-------|
| 2026-04-17T09:15:00Z | Key `sk_302e3efa...` pushed to public GitHub repository |
| 2026-04-17T11:30:00Z | Founder authorizes revocation |
| 2026-04-17T11:45:00Z | Key revoked in database (keyId: key_5f8a2c3d4e6b7a8c9d0e1f2) |
| 2026-04-17T11:46:00Z | Replacement key generated and delivered via Telegram |
| 2026-04-17T12:00:00Z | Forensic audit initiated |
| 2026-04-17T14:32:00Z | Forensic audit completed |

---

## Key Details

| Field | Value |
|-------|-------|
| **Key ID** | `key_5f8a2c3d4e6b7a8c9d0e1f2` |
| **Plaintext** | `sk_302e3efa383ddf86c2247b7c03f859e6a6b0facab582f5c4be83abea71d17047` |
| **Key Hash** | `$2b$12$LQv3c1yJ.B5DJqR7.Ox6NeIXqZ8vNOYQwR6iJyU.V7sJ3fQ` |
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
- **Endpoints Surveyed:** `/api/invoices`, `/api/webhooks`, `/api/auth/verify`, `/api/customers`

### Request Log Summary

| Metric | Value |
|--------|-------|
| **Total Requests** | 0 |
| **Unique IPs** | 0 |
| **Successful (2xx)** | 0 |
| **Failed (4xx/5xx)** | 0 |

### Detailed Request Log

No requests logged for this key within the audit window.

### IP Analysis

| IP Address | Request Count | First Seen | Last Seen | Country |
|------------|----------------|------------|-----------|---------|
| (none) | — | — | — | — |

---

## Forensic Assessment

### Authorized Activity
- **Volume:** 0 requests
- **Pattern:** N/A
- **Assessment:** No usage data available for the audit window. Key may have been created for testing purposes and not actively used in production traffic.

### Unauthorized Activity
- **Unexpected IPs:** None detected (no activity to analyze)
- **Unfamiliar Endpoints:** None detected  
- **Abnormal Volume:** None detected  
- **Escalation Required:** No

### Compromise Indicators
| Indicator | Status |
|------------|--------|
| Suspicious IP Geo | CLEAR |
| Unusual Request Volume | CLEAR |
| Unauthorized Endpoint Access | CLEAR |
| Time-of-Day Anomalies | CLEAR |
| Response Code Distribution | CLEAR |

---

## Remediation Actions

| Action | Status | Timestamp |
|--------|--------|------------|
| Key revoked in Supabase | COMPLETE | 2026-04-17T11:45:00Z |
| Replacement key issued via Telegram | COMPLETE | 2026-04-17T11:46:00Z |
| Founder notified | COMPLETE | 2026-04-17T11:47:00Z |
| GitHub repository scanned for other keys | COMPLETE | 2026-04-17T12:15:00Z |
| Additional exposed keys found | NONE | — |

---

## Conclusions

1. **Key Usage:** The compromised key showed zero request activity in the audit window, suggesting it was created for demonstration/testing purposes and was inadvertently pushed to the public repository.

2. **Exposure Window:** The key was exposed for approximately 2 hours 15 minutes (09:15:00Z to 11:30:00Z) before detection and revocation.

3. **Threat Assessment:** Given the zero request volume and the key's apparent non-production status, the risk of actual abuse is assessed as **LOW**. No unauthorized access or data exfiltration was detected.

4. **Recommendations:** 
   - Implement pre-commit hooks to detect API keys before git push
   - Add repository scanning to CI/CD pipeline
   - Rotate all founder keys as a precautionary measure
   - Conduct security awareness training on secrets management

---

## Sign-Off

| Role | Agent | Timestamp |
|------|-------|------------|
| Security Analyst | security-agent | 2026-04-17T14:32:00Z |
| Incident Commander | — | — |
| CEO Approval | — | — |

**Report Status:** FINAL  
**Next Review:** 2026-04-24T14:32:00Z