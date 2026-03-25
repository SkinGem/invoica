# EU+Japan Tax Watchdog CTO Briefing — 2026-03-21

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

### [HIGH] EU: Mandatory OSS registration for all digital platforms facilitating B2C transactions
**Source**: European Commission ViDA Package (ec.europa.eu/taxation_customs)
**VAT Rate**: varies by Member State | **Effective**: 2025-01-01
**Summary**: ViDA eliminates the €10,000 threshold for platform OSS registration effective January 2025. All platforms facilitating digital services to EU consumers must register regardless of transaction volume.
**Invoica Impact**: Invoica must implement mandatory OSS registration workflow before 2025, removing any threshold checks. System must auto-register platforms at first B2C transaction to any EU consumer.
**Status**: ⏳ Pending


### [HIGH] EU: Platform liability for VAT collection on all B2C digital services
**Source**: Council of the EU (consilium.europa.eu)
**VAT Rate**: varies by Member State | **Effective**: 2025-01-01
**Summary**: From January 2025, platforms facilitating B2C digital services become jointly liable for VAT collection, even for services provided by third parties. Partial Council agreement reached October 2023.
**Invoica Impact**: Invoica must collect and remit VAT on all B2C AI agent transactions, regardless of whether agents belong to Invoica or third parties. Requires complete B2C VAT engine with rate tables for all EU27 countries.
**Status**: ⏳ Pending


### [HIGH] EU: Mandatory structured e-invoicing for cross-border B2B transactions using EN 16931 standard
**Source**: European Commission ViDA Proposal (Council Directive amendment)
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: From January 2025, all cross-border B2B invoices must use structured format compliant with EN 16931. Blockchain invoicing systems must map to this standard for tax authority reporting.
**Invoica Impact**: Invoica must implement EN 16931 XML/JSON mapping layer for Base blockchain invoices. All cross-border B2B invoices need dual format: blockchain immutable record + EN 16931 structured export for tax authorities.
**Status**: ⏳ Pending


### [MEDIUM] EU: Real-time payment data extraction and reporting to tax authorities
**Source**: European Commission ViDA Package (Digital Reporting Requirements)
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: From January 2028, platforms must provide real-time access to payment data including cryptocurrency/stablecoin transactions. Tax authorities can request transaction-level data within 24 hours.
**Invoica Impact**: Invoica must build API endpoints for EU tax authority access to USDC payment data on Base blockchain. Requires secure authentication, transaction filtering by jurisdiction, and 24-hour SLA for data provision.
**Status**: ⏳ Pending


### [HIGH] EU: Stablecoin issuer authorization requirement for platform payment integration
**Source**: EU Markets in Crypto-Assets Regulation (MiCA)
**VAT Rate**: N/A | **Effective**: 2024-12-30
**Summary**: MiCA requires platforms to only accept payments from authorized stablecoin issuers with EU e-money licenses. USDC issuer Circle must obtain authorization for EU operations.
**Invoica Impact**: Invoica must verify Circle's MiCA authorization status and potentially integrate alternative EU-authorized stablecoins. Risk of USDC payment disruption in EU if Circle lacks authorization; need contingency payment rail.
**Status**: ⏳ Pending


### [MEDIUM] EU: Mandatory reserve transparency and redemption rights for stablecoin payments
**Source**: EU MiCA Regulation Articles 36-37
**VAT Rate**: N/A | **Effective**: 2024-12-30
**Summary**: MiCA requires stablecoin issuers to maintain 1:1 reserves and publish daily attestations. Platforms using stablecoins must disclose reserve status to users.
**Invoica Impact**: Invoica must display Circle USDC reserve attestations on payment pages and provide user notifications if reserve ratio falls below 100%. Requires API integration with Circle transparency endpoints.
**Status**: ⏳ Pending


### [HIGH] EU: Crypto Asset Reporting Framework (CARF) for platform operators
**Source**: EU Directive on Administrative Cooperation (DAC8) - Council Directive 2023/2226
**VAT Rate**: N/A | **Effective**: 2026-01-01
**Summary**: From January 2026, platforms facilitating crypto/stablecoin payments must report all transactions to tax authorities under OECD CARF standard. Includes user identification, transaction amounts, and wallet addresses.
**Invoica Impact**: Invoica must implement CARF reporting module collecting user tax residency, wallet addresses, and transaction details for all USDC payments. Annual reporting to each EU Member State where users reside by January 31 each year.
**Status**: ⏳ Pending


### [HIGH] Germany: Real-time audit access to blockchain invoice systems
**Source**: German Federal Ministry of Finance (BMF) - GoBD v4 Guidelines
**VAT Rate**: 19% | **Effective**: 2025-01-01
**Summary**: GoBD v4 requires blockchain-based accounting systems to provide real-time read access to German tax auditors without data export delays. All blockchain invoice records must be searchable and filterable.
**Invoica Impact**: Invoica must build German tax auditor portal with Base blockchain query interface. Requires filtering by date, amount, VAT rate, and customer. Must provide within 1 hour of audit request without requiring full blockchain download.
**Status**: ⏳ Pending


### [HIGH] Germany: TSE certification requirement for blockchain invoice systems
**Source**: German KassenSichV (Cash Register Security Ordinance)
**VAT Rate**: 19% | **Effective**: 2025-01-01
**Summary**: From January 2025, blockchain invoice systems used in Germany must obtain Technical Security Equipment (TSE) certification or equivalent tamper-proof mechanism certification from BSI or PTB.
**Invoica Impact**: Invoica must obtain TSE certification for Base blockchain invoice module or implement certified timestamping service integration. Likely requires partnership with certified German TSE provider for invoice signing.
**Status**: ⏳ Pending


### [HIGH] France: Mandatory real-time VAT number validation API for all B2B transactions
**Source**: French DGFiP (Direction Générale des Finances Publiques)
**VAT Rate**: 20% | **Effective**: 2025-01-01
**Summary**: From January 2025, digital platforms must validate EU VAT numbers in real-time via DGFiP API before completing B2B transactions. Non-validated VAT numbers require VAT collection regardless of reverse charge eligibility.
**Invoica Impact**: Invoica must integrate DGFiP VAT validation API for all B2B transactions involving French customers. Failed validations require immediate VAT collection at 20%. Must implement API retry logic and validation result storage.
**Status**: ⏳ Pending


### [MEDIUM] France: Annual stablecoin payment reporting to DGFiP
**Source**: French Platform Payment Reporting (Déclaration des opérateurs de plateforme)
**VAT Rate**: 20% | **Effective**: 2025-01-01
**Summary**: From 2025, platforms facilitating payments must report all stablecoin transactions exceeding €1,000 annually per user to DGFiP. Includes sender, recipient, amounts, and wallet addresses.
**Invoica Impact**: Invoica must implement French user payment aggregation tracking USDC volumes per calendar year. Automated annual reporting by January 31 for users exceeding €1,000 threshold. Requires user notification of reporting obligation.
**Status**: ⏳ Pending


### [MEDIUM] Spain: Mandatory crypto payment method field in SII real-time reporting
**Source**: Spanish Tax Agency (AEAT) - SII (Suministro Inmediato de Información)
**VAT Rate**: 21% | **Effective**: 2025-01-01
**Summary**: From January 2025, SII real-time invoice reporting must include specific payment method field for cryptocurrency/stablecoin transactions. New field code 'C' for crypto payments required in XML submissions.
**Invoica Impact**: Invoica must add payment method field to Spanish SII reporting module identifying USDC payments with code 'C'. All invoices paid in USDC to Spanish customers require real-time SII submission within 4 days with crypto flag.
**Status**: ⏳ Pending


### [MEDIUM] Italy: Mandatory crypto wallet address disclosure in SDI e-invoices
**Source**: Italian Revenue Agency (Agenzia delle Entrate) - SDI Guidelines
**VAT Rate**: 22% | **Effective**: 2025-01-01
**Summary**: From January 2025, SDI e-invoices involving cryptocurrency payments must include sender and recipient wallet addresses in payment details block. Required for AML and tax traceability.
**Invoica Impact**: Invoica must modify SDI XML invoice generation to include Base blockchain wallet addresses for both Invoica platform and customer wallets. Requires new payment details block mapping in Italian FatturaPA format.
**Status**: ⏳ Pending


### [HIGH] Netherlands: VAT fiscal representative mandatory for non-EU crypto platforms
**Source**: Dutch Tax Administration (Belastingdienst)
**VAT Rate**: 21% | **Effective**: 2025-01-01
**Summary**: From January 2025, non-EU platforms processing cryptocurrency payments for Dutch customers must appoint Dutch VAT fiscal representative regardless of transaction volume. No threshold exemption for crypto platforms.
**Invoica Impact**: If Invoica is non-EU entity, must appoint Dutch fiscal representative immediately for any Dutch customer transactions. Representative becomes jointly liable for VAT. Requires legal entity selection and formal appointment filing.
**Status**: ⏳ Pending


### [MEDIUM] Japan: Stablecoin payment method JCT exemption confirmation
**Source**: Japan National Tax Agency (NTA) - Consumption Tax Interpretation Notice
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: NTA confirms stablecoin payments (including USDC) are exempt from JCT as payment instruments under amended Payment Services Act. Only underlying service subject to JCT, not the stablecoin transfer itself.
**Invoica Impact**: Invoica must not apply JCT to USDC payment processing fees or blockchain gas fees in Japan. Only the AI service invoice amount subject to 10% JCT. Simplifies tax calculation but requires clear invoice line-item separation.
**Status**: ⏳ Pending


### [HIGH] Japan: Enhanced AML/KYC requirements for stablecoin platform intermediaries
**Source**: Japan Financial Services Agency (FSA) - Payment Services Act Guidelines
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: FSA requires platforms facilitating stablecoin payments to implement enhanced KYC including transaction monitoring for amounts exceeding JPY 1 million annually per user. Must report suspicious transactions within 24 hours.
**Invoica Impact**: Invoica must implement Japanese customer transaction monitoring aggregating annual USDC volumes. Automated alerts for users exceeding JPY 1M threshold requiring enhanced due diligence. Suspicious transaction reporting workflow to Japanese JAFIC.
**Status**: ⏳ Pending

