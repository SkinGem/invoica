/**
 * @invoica/pact — PACT v0.2 mandate library
 *
 * Create and verify PACT mandates for authorised AI agent payments.
 *
 * @example
 * import { issueMandate, encodeMandateHeader } from '@invoica/pact';
 *
 * const mandate = issueMandate(
 *   { grantor: 'my-agent', scope: { maxPaymentUsdc: 5, actions: ['invoice:create'] } },
 *   process.env.PACT_SIGNING_SECRET!
 * );
 * fetch('https://api.invoica.ai/v1/invoices', {
 *   headers: { 'X-Pact-Mandate': encodeMandateHeader(mandate) }
 * });
 */
export { issueMandate, verifyMandate, encodeMandateHeader } from './mandate';
export type {
  PactMandate,
  MandateScope,
  PactIssueOptions,
  PactVerifyResult,
} from './types';