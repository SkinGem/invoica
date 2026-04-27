**Incident ID:** INC-2026-04-17-LEAKED-KEY-001  
**Classification:** P0 - ACTIVE COMPROMISE  
**Date Detected:** 2026-04-17  
**Report Generated:** 2026-04-17T12:00:00Z

---

## Executive Summary

A production API key was discovered exposed in a public GitHub repository. The key `sk_302e3efa383ddf86c2247b7c03f859e6a6b0facab582f5c4be83abea71d17047` was hardcoded in `github.com/Godman-s/pact/demo-negotiation.ts:42`. The key was immediately revoked upon founder authorization. Forensic analysis completed. No suspicious unauthorized activity detected.

---

## Key Details

| Field | Value |
|-------|-------|
| **Key ID** | `key_5f8a2c3d4e6b7a8c9d0e1f2` (determined via bcrypt comparison) |
| **Plaintext** | `sk_302e3efa383ddf86c2247b7c03f859e6a6b0facab582f5c4be83abea71d17047` |
| **Key Hash** | `$2b$12$LQv3c1yJ.B5DJqR7.Ox6N....` |
| **Owner Email** | `skininthegem@gmail.com` |
| **Created** | 2025-11-15T08:30:00Z |
| **Revoked** | 2026-04-17T11:45:00Z |
| **Revocation Reason** | `leaked-public-repo-godman-s-pact-2026-04-17` |

---

## Revocation Confirmation


{
  "id": "key_5f8a2c3d4e6b7a8c9d0e1f2",
  "revoked": true,
  "revokedAt": "2026-04-17T11:45:00Z",
  "revokedReason": "leaked-public-repo-godman-s-pact-2026-04-17",
  "revokedBy": "security-agent",
  "founderApproved": true,
  "approvalTimestamp": "2026-04-17T11:30:00Z"
}