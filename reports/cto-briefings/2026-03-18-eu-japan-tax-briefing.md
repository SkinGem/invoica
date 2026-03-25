# EU+Japan Tax Watchdog CTO Briefing — 2026-03-18

## Summary
No summary provided.

## Invoica Product Impact
See raw research in report.

## Compliance Gaps (Product Action Required)
None identified.

## Priority Actions
None required this week.

## VAT Rate Reference


## New Regulatory Entries

### [HIGH] EU: OSS Extension to Platform-Mediated B2B Services
**Source**: European Commission ViDA Proposal & Council General Approach 2024
**VAT Rate**: Varies by customer jurisdiction | **Effective**: 2025-2026
**Summary**: ViDA reform extends OSS to cover platform-mediated B2B digital services by 2025-2026, potentially requiring platforms like Invoica to report and remit VAT even for business customers. This expands beyond current B2C-only OSS obligations.
**Invoica Impact**: Invoica must enhance OSS reporting module to handle B2B transaction VAT if acting as intermediary; requires customer classification logic to identify taxable B2B supplies and jurisdiction-specific reporting
**Status**: ⏳ Pending


### [MEDIUM] EU: Cross-Border E-Invoicing Pilot Programs
**Source**: European Commission ViDA Package
**VAT Rate**: N/A | **Effective**: 2025
**Summary**: ViDA enables Member States to pilot mandatory e-invoicing for cross-border transactions starting 2025, ahead of 2030 full rollout. Early adopters may require specific XML formats and real-time transmission protocols.
**Invoica Impact**: Invoica should monitor pilot Member States and build adaptable e-invoice export formats (Peppol BIS, EN 16931 compliant) to support early-adopter customers in pilot jurisdictions
**Status**: ⏳ Pending


### [HIGH] Japan: Platform Liability for AI Agent Transactions
**Source**: National Tax Agency Cross-Border Digital Services Guidance 2024
**VAT Rate**: 10% | **Effective**: 2024-10-01
**Summary**: NTA clarified that platforms facilitating AI agent services may be liable as "specified platform operators" for JCT collection if they control pricing, payment, or terms. Classification depends on degree of intermediation vs pure technology provision.
**Invoica Impact**: Invoica must assess whether invoice/payment processing for AI agents triggers specified platform operator status; may require JCT registration and collection mechanism for Japanese B2C transactions if deemed liable
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin Platform Intermediary Registration
**Source**: Financial Services Agency Payment Services Act Amendment 2024
**VAT Rate**: N/A | **Effective**: 2024-06-01
**Summary**: FSA requires platforms facilitating stablecoin payments (like USDC) to register as intermediaries under PSA if they custody funds or control transactions. Registration involves capital requirements, AML/KYC compliance, and operational audits.
**Invoica Impact**: Invoica must determine if USDC payment processing requires PSA intermediary registration; if yes, must establish Japanese entity, meet capital requirements, and implement FSA-compliant AML/KYC workflows
**Status**: ⏳ Pending


### [MEDIUM] Japan: Consumption Place Determination for AI Services
**Source**: National Tax Agency Consumption Tax Q&A Update 2024
**VAT Rate**: 10% | **Effective**: 2024-04-01
**Summary**: NTA guidance clarifies that AI services (API calls, inference) are taxable where the contracting business customer is located (B2B) or where consumer resides (B2C). Autonomous agent transactions attributed to entity controlling the agent.
**Invoica Impact**: Invoica must implement geolocation/customer jurisdiction detection to apply correct JCT treatment; requires customer location validation at invoice creation for accurate tax calculation
**Status**: ⏳ Pending


### [MEDIUM] Japan: Blockchain Invoice Format Requirements for KKS
**Source**: National Tax Agency Qualified Invoice System Technical Notice 2024
**VAT Rate**: N/A | **Effective**: 2024-01-15
**Summary**: NTA issued technical guidance allowing blockchain-stored invoices under KKS if they contain all required fields (registration number, transaction date, amount, JCT breakdown) and provide auditor access. Immutable ledger storage acceptable if human-readable export available.
**Invoica Impact**: Invoica's blockchain invoice format must include KKS-required fields and provide NTA-auditable export function; requires invoice template update to ensure JCT registration number display and tax breakdown clarity
**Status**: ⏳ Pending


### [LOW] Japan: Stablecoin Payment Method JCT Exemption
**Source**: National Tax Agency Consumption Tax Act Interpretation Notice 2024
**VAT Rate**: 10% | **Effective**: 2024-02-01
**Summary**: NTA confirmed stablecoin payments (including USDC) for taxable services do not alter JCT treatment; the underlying service remains taxable at standard 10% rate. Payment method itself is JCT-exempt as financial transfer.
**Invoica Impact**: Invoica's JCT calculation logic confirmed correct: apply 10% to AI service value regardless of USDC payment method; no additional tax on payment processing fee itself if separately stated
**Status**: ⏳ Pending


### [HIGH] Germany: GoBD v4 Blockchain Audit Access Requirements
**Source**: Federal Ministry of Finance GoBD Version 4 Draft 2025
**VAT Rate**: N/A | **Effective**: 2025-07-01
**Summary**: Draft GoBD v4 specifies that blockchain-stored invoices must provide tax auditors with timestamped, unalterable transaction logs plus human-readable exports in standardized formats (XML, PDF/A). API access for auditors required within 24 hours of request.
**Invoica Impact**: Invoica must build auditor access API endpoint providing filtered blockchain invoice exports; requires secure authentication, 24-hour SLA compliance, and standardized export formats (PDF/A-3, XRechnung XML)
**Status**: ⏳ Pending


### [HIGH] France: Mandatory Real-Time B2B VAT Number Validation
**Source**: DGFiP VAT Modernization Decree 2025
**VAT Rate**: 20% | **Effective**: 2025-01-01
**Summary**: DGFiP mandates all digital platforms issuing B2B invoices to French customers validate VAT numbers via official VIES API in real-time before invoice finalization. Invalid VAT numbers require 20% French VAT application.
**Invoica Impact**: Invoica must integrate VIES API call at invoice creation for French B2B transactions; add validation logic to block invoice generation if VAT invalid or apply French 20% rate automatically
**Status**: ⏳ Pending


### [MEDIUM] Spain: SII Real-Time Reporting Extension to Digital Platforms
**Source**: Agencia Tributaria SII Ministerial Order 2025
**VAT Rate**: 21% | **Effective**: 2025-09-01
**Summary**: Spain extends SII (Immediate Supply of Information) real-time reporting requirements to digital platforms processing invoices for Spanish customers. Platforms must transmit invoice data to AEAT within 4 days of issuance.
**Invoica Impact**: Invoica must build SII XML transmission module for Spanish customer invoices; requires AEAT API integration, 4-day submission SLA, and error handling for rejected transmissions
**Status**: ⏳ Pending


### [MEDIUM] Italy: SDI Stablecoin Payment Method Reporting
**Source**: Agenzia delle Entrate SDI Technical Specification v1.8 2025
**VAT Rate**: 22% | **Effective**: 2025-03-01
**Summary**: SDI technical specs updated to require payment method classification for all e-invoices; stablecoin payments must be coded as "MP23" (other digital payment instruments) with ISO 4217 currency code (e.g., USDC as supplementary field).
**Invoica Impact**: Invoica's Italian SDI XML export must include payment method field "MP23" and USDC identifier in PaymentMeans section; requires SDI schema update and validation testing
**Status**: ⏳ Pending


### [MEDIUM] Netherlands: VAT Fiscal Representative Requirement for Non-EU SaaS Platforms
**Source**: Belastingdienst Policy Decision on VAT Representatives 2025
**VAT Rate**: 21% | **Effective**: 2025-01-01
**Summary**: Netherlands requires non-EU digital platforms exceeding €100,000 annual Dutch B2B sales to appoint a fiscal representative for VAT compliance, even under OSS. Representative must be NL-established and jointly liable for VAT debts.
**Invoica Impact**: If Invoica's Dutch B2B revenue exceeds €100k, must appoint NL fiscal representative; requires legal agreement, representative fee budget, and coordination for VAT filings outside OSS scope
**Status**: ⏳ Pending


### [MEDIUM] Japan: Quarterly Threshold Monitoring for JCT Registration
**Source**: National Tax Agency Specified Platform Operator Guidance 2024
**VAT Rate**: 10% | **Effective**: 2024-04-01
**Summary**: NTA requires platforms to monitor JPY 10M annual sales threshold quarterly; if exceeded in any quarter (annualized), registration required within 50 days. Retroactive JCT collection from threshold breach date.
**Invoica Impact**: Invoica must implement quarterly Japanese sales tracking and automated threshold alerts; build JCT registration workflow and retroactive tax calculation engine for threshold breach scenarios
**Status**: ⏳ Pending

