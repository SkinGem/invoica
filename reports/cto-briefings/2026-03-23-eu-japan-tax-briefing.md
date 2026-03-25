# EU+Japan Tax Watchdog CTO Briefing — 2026-03-23

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

### [HIGH] EU: ViDA Platform Deemed Supplier Rules - Final Implementation
**Source**: European Commission COM(2022) 701 final, Council of the EU
**VAT Rate**: Variable by Member State | **Effective**: 2025-01-01
**Summary**: Platforms facilitating B2C digital services are deemed suppliers for VAT purposes starting January 1, 2025, requiring VAT collection and remittance even for third-party AI agent transactions. This extends existing rules to explicitly cover AI-to-AI service marketplaces.
**Invoica Impact**: Invoica must determine if it qualifies as deemed supplier when AI agents transact B2C services through the platform. If yes, must collect VAT at customer's country rate and remit via OSS, adding VAT calculation layer to USDC payment flow.
**Status**: ⏳ Pending


### [MEDIUM] EU: Digital Reporting Requirement (DRR) Real-Time Transaction Data
**Source**: European Commission ViDA proposal, Council Directive under negotiation
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: Mandatory real-time or near-real-time transaction reporting to tax authorities for all cross-border digital services effective 2028. Platforms must provide standardized transaction data feeds to Member State tax authorities.
**Invoica Impact**: Invoica must build API integration to report transaction data (invoice amounts, parties, VAT) in real-time to EU tax authorities. Blockchain audit trail must be accessible and exportable in standardized format.
**Status**: ⏳ Pending


### [HIGH] EU: OSS Extension to Platform-Mediated B2B Transactions
**Source**: Council Directive (EU) 2017/2455 amendment under ViDA
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: OSS registration expands to cover platform-mediated B2B digital services by 2025, removing €10,000 threshold for platforms. All platform operators facilitating cross-border B2B digital services must register.
**Invoica Impact**: Invoica must register for OSS even for B2B AI agent transactions if deemed facilitator. Need to implement VAT number validation and reverse charge handling for all EU B2B transactions through platform.
**Status**: ⏳ Pending


### [HIGH] EU: MiCA Stablecoin Issuer Authorization for Platform Payment Integration
**Source**: Regulation (EU) 2023/1114 (MiCA), effective June 2024
**VAT Rate**: N/A | **Effective**: 2024-06-30
**Summary**: Platforms accepting stablecoin payments must only integrate authorized stablecoin issuers with MiCA licenses. USDC issuer (Circle) must hold e-money token authorization for EU operations.
**Invoica Impact**: Invoica must verify Circle has MiCA authorization for USDC in EU. If not, must plan alternative stablecoin or block EU transactions until compliance. Add compliance check for authorized stablecoin issuers.
**Status**: ⏳ Pending


### [HIGH] EU: Crypto Asset Reporting Framework (CARF) for Platform Operators
**Source**: Council Directive (EU) 2023/2226 (DAC8), effective January 2026
**VAT Rate**: N/A | **Effective**: 2026-01-01
**Summary**: Digital platforms facilitating crypto transactions must report user identities, transaction volumes, and wallet addresses to tax authorities annually under OECD CARF framework starting 2026.
**Invoica Impact**: Invoica must collect KYC data for all AI agent owners, track USDC transaction volumes per user, and submit annual reports to tax authorities in Member States where users reside. Build CARF-compliant reporting module.
**Status**: ⏳ Pending


### [MEDIUM] Germany: GoBD v4 Real-Time Audit Access for Blockchain Invoice Systems
**Source**: German Federal Ministry of Finance, GoBD v4 guidance
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Blockchain-based invoice systems must provide real-time, unalterable audit access to tax authorities. Immutability alone does not satisfy GoBD; must enable query and export functions.
**Invoica Impact**: Invoica must build secure API for German tax authority audit access to Base blockchain invoice data. Need read-only query interface with authentication and audit logging.
**Status**: ⏳ Pending


### [LOW] Germany: TSE Certification Not Required for B2B Invoice Platforms
**Source**: German Federal Ministry of Finance, KassenSichV clarification
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Technical Security Equipment (TSE) certification under KassenSichV applies only to cash register systems, not B2B digital invoice platforms. Blockchain invoice systems for business transactions are exempt.
**Invoica Impact**: No TSE compliance needed for Invoica. Clarifies Invoica is not subject to KassenSichV as it processes B2B digital payments, not retail cash transactions.
**Status**: ⏳ Pending


### [HIGH] France: Mandatory Real-Time VAT Number Validation API for All B2B Platforms
**Source**: Direction Générale des Finances Publiques (DGFiP)
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Digital platforms facilitating B2B transactions must validate customer VAT numbers in real-time via DGFiP API before invoice issuance starting 2025. Invalid VAT numbers require immediate transaction rejection or French VAT application.
**Invoica Impact**: Invoica must integrate DGFiP VAT validation API for all French B2B transactions. Add real-time validation step before invoice finalization; reject or flag invalid VAT numbers.
**Status**: ⏳ Pending


### [MEDIUM] France: Annual Stablecoin Payment Volume Reporting to DGFiP
**Source**: DGFiP Platform Payment Reporting Framework
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Platforms processing stablecoin payments must submit annual reports to DGFiP detailing total payment volumes, user counts, and transaction types. First reporting due Q1 2026 for 2025 transactions.
**Invoica Impact**: Invoica must track and report annual USDC payment volumes for French users to DGFiP. Build annual reporting module with user aggregation and payment categorization.
**Status**: ⏳ Pending


### [MEDIUM] Spain: SII Real-Time Reporting Mandatory Crypto Payment Method Field
**Source**: Agencia Estatal de Administración Tributaria (AEAT), SII extension
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: SII (Immediate Supply of Information) system extended to require digital platforms to specify crypto/stablecoin as payment method in real-time invoice reporting starting 2025.
**Invoica Impact**: Invoica must add 'USDC/Stablecoin' payment method field to SII-compliant invoice format for Spanish transactions. Update real-time reporting integration to include payment type.
**Status**: ⏳ Pending


### [HIGH] Italy: SDI Mandatory Crypto Wallet Address Disclosure in E-Invoices
**Source**: Agenzia delle Entrate (AdE), SDI mandate extension
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: SDI e-invoices involving crypto payments must disclose payer and payee wallet addresses in structured fields starting 2025. Applies to all digital platforms using blockchain payments.
**Invoica Impact**: Invoica must include Base blockchain wallet addresses (sender/receiver) in SDI XML invoice format for Italian transactions. Add wallet address fields to invoice data model.
**Status**: ⏳ Pending


### [HIGH] Netherlands: VAT Fiscal Representative Mandatory for Non-EU Crypto Platforms
**Source**: Belastingdienst (Dutch Tax Authority)
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Non-EU platforms processing crypto payments for Dutch customers must appoint Dutch VAT fiscal representative starting 2025. No exceptions for digital-only platforms.
**Invoica Impact**: If Invoica is non-EU entity serving Dutch customers, must appoint and pay for Dutch VAT fiscal representative. Add fiscal representative costs and compliance to Dutch market entry plan.
**Status**: ⏳ Pending


### [MEDIUM] Japan: Stablecoin Payment Method JCT Exemption Final Confirmation
**Source**: National Tax Agency (NTA), Consumption Tax guidance
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: NTA confirms stablecoin payments (including USDC) are treated as payment method, not taxable supply, for JCT purposes. No consumption tax on stablecoin transfers themselves.
**Invoica Impact**: Invoica does not apply JCT to USDC payment transfers. JCT applies only to underlying digital services (AI agent API calls, etc.), not the stablecoin payment mechanism.
**Status**: ⏳ Pending


### [HIGH] Japan: JCT Deemed Supply for AI Agent Platform Transactions - Final Guidance
**Source**: National Tax Agency (NTA), Specified Platform guidance
**VAT Rate**: 10% | **Effective**: 2025-01-01
**Summary**: Platforms facilitating AI agent transactions are deemed suppliers for JCT if they control pricing, service delivery, or payment processing. Must collect 10% JCT on B2C transactions to Japanese consumers.
**Invoica Impact**: Invoica must determine if it controls AI agent service terms. If deemed supplier, must collect 10% JCT on Japanese B2C transactions and register as Specified Platform Operator.
**Status**: ⏳ Pending


### [HIGH] Japan: Enhanced AML/KYC for Stablecoin Platform Intermediaries
**Source**: Financial Services Agency (FSA), Payment Services Act amendment
**VAT Rate**: N/A | **Effective**: 2024-06-01
**Summary**: Platforms facilitating stablecoin payments must implement enhanced AML/KYC including transaction monitoring, suspicious activity reporting, and user identity verification under amended Payment Services Act.
**Invoica Impact**: Invoica must implement KYC for all Japanese users, monitor transaction patterns for suspicious activity, and file SARs to FSA. Build AML compliance module for Japan market.
**Status**: ⏳ Pending


### [MEDIUM] Japan: Blockchain Invoice Digital Signature Requirements for KKS Compliance
**Source**: National Tax Agency (NTA), Qualified Invoice System (KKS)
**VAT Rate**: N/A | **Effective**: 2024-10-01
**Summary**: Qualified invoices on blockchain must include digital signatures verifiable by tax authorities. NTA specifies acceptable cryptographic standards and verification methods for KKS registration.
**Invoica Impact**: Invoica must implement digital signature for all Japanese invoices using NTA-approved cryptographic standards. Add signature verification capability for tax authority audit.
**Status**: ⏳ Pending


### [MEDIUM] Japan: 7-Year Blockchain Invoice Retention with Export Capability
**Source**: National Tax Agency (NTA), Invoice Retention Rules
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: Blockchain invoices must be retained for 7 years with capability to export in human-readable and machine-readable formats for tax audits. Platforms must ensure blockchain data accessibility even if platform ceases operation.
**Invoica Impact**: Invoica must guarantee 7-year Base blockchain data retention and implement invoice export to PDF and XML formats. Add archival strategy for long-term blockchain access.
**Status**: ⏳ Pending

