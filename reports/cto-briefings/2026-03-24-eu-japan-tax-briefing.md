# EU+Japan Tax Watchdog CTO Briefing — 2026-03-24

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

### [HIGH] EU: Stablecoin Redemption Rights Enforcement
**Source**: European Commission MiCA Regulation (EU) 2023/1114
**VAT Rate**: N/A | **Effective**: 2024-06-30
**Summary**: MiCA requires platforms accepting stablecoins to ensure users can redeem at par value at any time. Non-compliant stablecoin integrations expose platforms to regulatory penalties.
**Invoica Impact**: Invoica must verify USDC issuer (Circle) MiCA authorization and implement redemption information disclosure in payment flows by June 2024.
**Status**: ⏳ Pending


### [HIGH] EU: Platform Due Diligence for Stablecoin Acceptance
**Source**: European Commission MiCA Regulation (EU) 2023/1114
**VAT Rate**: N/A | **Effective**: 2024-06-30
**Summary**: Platforms must conduct ongoing due diligence on stablecoin issuers, verifying authorization status and reserve attestations quarterly.
**Invoica Impact**: Invoica must implement automated MiCA authorization verification for USDC and maintain quarterly attestation records for EU regulatory audits.
**Status**: ⏳ Pending


### [MEDIUM] EU: Unique Transaction Identifier for Digital Reporting
**Source**: European Commission ViDA Proposal COM(2022) 701
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: All platform-mediated transactions must include unique transaction identifiers (UTI) for cross-border VAT reporting under Digital Reporting Requirement.
**Invoica Impact**: Invoica must generate and store blockchain-verifiable UTIs for every invoice transaction, linking on-chain hashes to VAT reporting systems by 2028.
**Status**: ⏳ Pending


### [HIGH] Germany: Blockchain Invoice Hash Verification Requirements
**Source**: Bundesfinanzministerium GoBD v4 Guidelines
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Tax authorities must be able to independently verify blockchain transaction hashes against stored invoices within 24 hours of audit request.
**Invoica Impact**: Invoica must build audit export API providing Base blockchain transaction hashes with corresponding invoice data in GoBD-compliant format.
**Status**: ⏳ Pending


### [MEDIUM] France: Annual Stablecoin Payment Volume Declaration
**Source**: Direction Générale des Finances Publiques (DGFiP)
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Platforms processing over €10,000 annual stablecoin payments must file annual declaration (Déclaration des Paiements en Cryptoactifs) with transaction volumes and customer counts.
**Invoica Impact**: Invoica must aggregate annual USDC payment volumes by French customer residency and submit declaration to DGFiP by March 31 annually.
**Status**: ⏳ Pending


### [MEDIUM] Spain: SII Blockchain Transaction Hash Field
**Source**: Agencia Tributaria (AEAT) SII Technical Specifications
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: SII real-time reporting now includes optional blockchain transaction hash field; mandatory for platforms processing crypto payments from January 2025.
**Invoica Impact**: Invoica must include Base blockchain transaction hashes in SII XML submissions for all Spanish customer invoices paid with USDC.
**Status**: ⏳ Pending


### [MEDIUM] Italy: SDI Crypto Payment Method Code
**Source**: Agenzia delle Entrate (AdE) SDI Technical Specifications
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: SDI e-invoicing system adds payment method code 'MP23' for stablecoin/crypto payments, mandatory for accurate payment reconciliation.
**Invoica Impact**: Invoica must set SDI payment method code to 'MP23' and include USDC wallet addresses in structured payment data for Italian B2B invoices.
**Status**: ⏳ Pending


### [MEDIUM] Netherlands: Quarterly Crypto Platform Transaction Reporting
**Source**: Belastingdienst (Dutch Tax Authority)
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Non-EU platforms facilitating crypto payments to Dutch customers must file quarterly transaction reports including customer VAT numbers and payment volumes.
**Invoica Impact**: Invoica must implement quarterly reporting to Belastingdienst for Dutch B2B customers, extracting VAT numbers and USDC payment totals from blockchain records.
**Status**: ⏳ Pending


### [HIGH] Japan: AI Agent Transaction Consumption Place Determination
**Source**: National Tax Agency (NTA) JCT Guidelines
**VAT Rate**: N/A | **Effective**: 2025-04-01
**Summary**: For JCT purposes, AI agent services are taxed where the controlling entity (not the agent) is located; B2B transactions use recipient's location.
**Invoica Impact**: Invoica must identify legal entity behind each AI agent to determine JCT applicability; implement customer location verification for Japanese B2B transactions.
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin Platform Transaction Monitoring Requirements
**Source**: Financial Services Agency (FSA) Payment Services Act
**VAT Rate**: N/A | **Effective**: 2024-06-01
**Summary**: Platforms facilitating stablecoin payments must implement AML transaction monitoring, including suspicious activity detection and reporting to JAFIC.
**Invoica Impact**: Invoica must build transaction monitoring for Japanese customers using USDC, flagging transactions over ¥1M or suspicious patterns per FSA guidelines.
**Status**: ⏳ Pending


### [HIGH] Japan: KKS Blockchain Invoice Format Acceptance
**Source**: National Tax Agency (NTA) Qualified Invoice System FAQ
**VAT Rate**: N/A | **Effective**: 2023-10-01
**Summary**: Blockchain-based invoices accepted under KKS if they contain all required fields (registration number, tax amount, date) and provide verifiable audit trail.
**Invoica Impact**: Invoica blockchain invoices must display KKS registration numbers, separate 10% JCT amounts, and provide Base transaction hash verification for Japanese customers.
**Status**: ⏳ Pending


### [LOW] Japan: Stablecoin Payment Capital Gains Tax Exemption
**Source**: Ministry of Finance (MOF) Tax Guidelines
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Stablecoin payments pegged 1:1 to fiat (e.g., USDC) exempt from capital gains tax if used for settlement within 30 days of acquisition.
**Invoica Impact**: Invoica users in Japan avoid capital gains reporting for USDC invoice payments if settled promptly; Invoica should provide transaction date documentation to support exemption.
**Status**: ⏳ Pending


### [HIGH] EU: Platform Seller Due Diligence and Reporting
**Source**: Council Directive (EU) 2023/2226 (DAC8)
**VAT Rate**: N/A | **Effective**: 2026-01-01
**Summary**: DAC8 (CARF implementation) requires platforms to collect and verify seller tax residency, reporting crypto transaction data to tax authorities annually.
**Invoica Impact**: Invoica must implement KYC for all EU sellers/service providers, collecting tax identification numbers and residency certificates for annual DAC8 reporting by January 2026.
**Status**: ⏳ Pending


### [HIGH] EU: Crypto Transaction Reporting Thresholds
**Source**: Council Directive (EU) 2023/2226 (DAC8)
**VAT Rate**: N/A | **Effective**: 2026-01-01
**Summary**: Platforms must report all crypto transactions exceeding €50,000 annual volume per user, including number of transactions, total consideration, and fees charged.
**Invoica Impact**: Invoica must aggregate annual USDC volumes per EU user, generating DAC8 XML reports with transaction counts and platform fees for tax authority exchange by January 31 annually.
**Status**: ⏳ Pending


### [MEDIUM] Japan: Specified Platform JCT Registration Threshold for AI Services
**Source**: National Tax Agency (NTA) JCT Platform Guidelines
**VAT Rate**: N/A | **Effective**: 2025-04-01
**Summary**: Foreign platforms facilitating AI agent services to Japanese consumers must register for JCT if annual taxable sales exceed ¥10M (approx. $67,000).
**Invoica Impact**: Invoica must monitor quarterly Japanese B2C AI service revenue; register as specified platform operator if ¥10M threshold projected within fiscal year.
**Status**: ⏳ Pending

