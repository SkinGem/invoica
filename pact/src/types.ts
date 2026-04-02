/**
 * @invoica/pact — Type definitions for PACT v0.2 mandate protocol
 * Used by AI agents to authorise payments to Invoica services.
 */

/** Scope of a PACT mandate — defines what actions and spend limits are authorised */
export interface MandateScope {
  /** Permitted actions (e.g. ['invoice:create', 'invoice:settle']) */
  actions?: string[];
  /** Permitted resources (e.g. invoice IDs or wildcard '*') */
  resources?: string[];
  /** Maximum payment in USDC this mandate authorises */
  maxPaymentUsdc?: number;
  /** Human-readable description of what this mandate covers */
  description?: string;
}

/** A signed PACT mandate — serialised as JSON in the X-Pact-Mandate header */
export interface PactMandate {
  /** Unique mandate identifier */
  id: string;
  /** Wallet address or agent ID of the entity granting the mandate */
  grantor: string;
  /** Wallet address or agent ID of the entity receiving the mandate (e.g. 'invoica') */
  grantee: string;
  /** Scope of authorisation */
  scope: MandateScope;
  /** ISO 8601 expiry timestamp — mandate is rejected after this time */
  expiresAt?: string;
  /** ISO 8601 issuance timestamp */
  issuedAt: string;
  /** HMAC-SHA256 signature of the mandate payload */
  signature: string;
}

/** Options for issueMandate() */
export interface PactIssueOptions {
  /** Wallet address or agent ID of the grantor */
  grantor: string;
  /** Wallet address or agent ID of the grantee (defaults to 'invoica') */
  grantee?: string;
  /** Mandate scope */
  scope: MandateScope;
  /** TTL in milliseconds (defaults to 3600000 — 1 hour) */
  ttlMs?: number;
}

/** Result of verifyMandate() */
export interface PactVerifyResult {
  allowed: boolean;
  reason?: string;
}