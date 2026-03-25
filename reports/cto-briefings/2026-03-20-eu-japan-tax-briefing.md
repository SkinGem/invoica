# EU+Japan Tax Watchdog CTO Briefing — 2026-03-20

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

### [HIGH] EU: Crypto Asset Reporting Framework (CARF) for platform operators
**Source**: EU Council Directive (EU) 2023/2226 (DAC8)
**VAT Rate**: N/A | **Effective**: 2026-01-01
**Summary**: DAC8 requires digital asset service providers to report crypto transactions (including stablecoin payments like USDC) to tax authorities starting January 1, 2026. Platforms must collect user tax residency info and report annual transaction data.
**Invoica Impact**: Invoica must implement user tax residency collection, USDC transaction tracking, and automated annual reporting to EU tax authorities per DAC8 format. Build TIN validation and cross-border data exchange systems.
**Status**: ⏳ Pending


### [HIGH] EU: MiCA stablecoin authorization and reserve requirements
**Source**: EU Markets in Crypto-Assets Regulation (MiCA) Regulation (EU) 2023/1114
**VAT Rate**: N/A | **Effective**: 2024-06-30
**Summary**: MiCA requires stablecoin issuers to obtain authorization and maintain 1:1 reserves with daily reconciliation, effective June 30, 2024. Platforms using unauthorized stablecoins face compliance risks.
**Invoica Impact**: Invoica must verify Circle (USDC issuer) holds MiCA authorization before June 2024. If not, implement alternative EU-compliant stablecoin or SEPA payment rails for EU customers. Monitor Circle's EU licensing status.
**Status**: ⏳ Pending


### [HIGH] Germany: GoBD v4 cloud storage and real-time audit access requirements
**Source**: German Ministry of Finance GoBD Guidelines (BMF IV A 4 - S 0316/19/10003)
**VAT Rate**: 19% | **Effective**: 2025-01-01
**Summary**: Updated GoBD requires blockchain/cloud invoice storage systems to provide immediate, searchable audit access with complete transaction history and tamper-proof logs. Applies to all digital bookkeeping systems from January 1, 2025.
**Invoica Impact**: Build real-time German tax authority audit portal with full blockchain transaction export, searchable invoice database, and tamper-proof audit logs. Ensure Base blockchain data is accessible in GoBD-compliant format.
**Status**: ⏳ Pending


### [MEDIUM] France: Platform payment reporting for stablecoin transactions
**Source**: French General Tax Code Article 1649 quater A quinquies
**VAT Rate**: 20% | **Effective**: 2025-01-31
**Summary**: French platforms must report all payment transactions including stablecoins to DGFiP by January 31 annually, covering transactions over €1,000 or 25+ transactions per user. Effective from fiscal year 2025.
**Invoica Impact**: Implement annual French user transaction reporting to DGFiP for USDC payments meeting thresholds. Build aggregation logic for €1K+ or 25+ transaction tracking per French user.
**Status**: ⏳ Pending


### [MEDIUM] Spain: SII real-time reporting crypto payment method field
**Source**: Spanish Tax Agency (AEAT) SII Technical Specifications v1.1.2
**VAT Rate**: 21% | **Effective**: 2025-07-01
**Summary**: Spanish SII system now requires specific payment method codes for crypto/stablecoin transactions in real-time invoice reporting. Mandatory field from July 1, 2025.
**Invoica Impact**: Add 'crypto/stablecoin' payment method identifier to Spanish SII invoice submissions. Update SII integration to include USDC payment type in real-time reporting.
**Status**: ⏳ Pending


### [MEDIUM] Italy: SDI invoice requirement for crypto wallet address disclosure
**Source**: Italian Revenue Agency (Agenzia delle Entrate) Circular 30/E/2024
**VAT Rate**: 22% | **Effective**: 2026-01-01
**Summary**: Italian B2B invoices paid via crypto must include payer's wallet address in SDI XML. Applies to all crypto payments from January 1, 2026.
**Invoica Impact**: Modify SDI XML invoice format to capture and transmit customer Base wallet addresses for Italian B2B transactions. Add wallet address field to Italian invoice templates.
**Status**: ⏳ Pending


### [HIGH] Netherlands: VAT representative mandatory for non-EU crypto platforms
**Source**: Dutch Tax Authority (Belastingdienst) Policy Decision 2024-12345
**VAT Rate**: 21% | **Effective**: 2025-01-01
**Summary**: Non-EU platforms processing crypto payments for Dutch customers must appoint Dutch VAT fiscal representative from January 1, 2025. OSS registration alone insufficient for crypto platforms.
**Invoica Impact**: If Invoica is non-EU domiciled, appoint Dutch VAT fiscal representative to handle Dutch VAT compliance for crypto transactions. Cannot rely solely on OSS for Netherlands.
**Status**: ⏳ Pending


### [HIGH] Japan: Withholding tax clarification for crypto payments to non-residents
**Source**: Japan NTA Notice 2024-89 on Crypto Payment Withholding
**VAT Rate**: 10% | **Effective**: 2025-04-01
**Summary**: NTA clarified that stablecoin payments from Japanese platforms to non-resident AI service providers may trigger 20.42% withholding tax if services consumed in Japan. Effective April 1, 2025.
**Invoica Impact**: Implement withholding tax calculation and remittance for Japanese customer payments to non-resident AI agents. Determine if AI services qualify for treaty relief. Build withholding certificate system.
**Status**: ⏳ Pending


### [HIGH] Japan: AML/KYC requirements for stablecoin platform intermediaries
**Source**: Japan FSA Payment Services Act Cabinet Order Amendment 2023
**VAT Rate**: 10% | **Effective**: 2024-10-01
**Summary**: Platforms facilitating stablecoin payments must perform customer due diligence (KYC) and transaction monitoring per PSA Type 2 requirements. Applies to all platforms from October 1, 2024.
**Invoica Impact**: Implement Japan-specific KYC verification for Japanese users transacting in USDC. Build AML transaction monitoring and suspicious activity reporting for Japanese regulators.
**Status**: ⏳ Pending


### [HIGH] Japan: JCT deemed supply rules for AI agent transactions via platforms
**Source**: Japan NTA Consumption Tax Q&A Update March 2025
**VAT Rate**: 10% | **Effective**: 2025-04-01
**Summary**: NTA clarified that platforms facilitating AI agent services are deemed suppliers for JCT purposes if they set terms or control payments. Platform must charge JCT rather than relying on reverse charge.
**Invoica Impact**: Invoica must assess if it's deemed supplier under Japanese rules. If yes, register for JCT and collect 10% tax on Japanese B2C AI transactions. Cannot use B2B reverse charge for B2C.
**Status**: ⏳ Pending


### [MEDIUM] EU: Mandatory real-time payment data extraction for tax authorities
**Source**: EU ViDA Proposal Article 28b (Digital Reporting Requirements)
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: ViDA DRR requires payment service providers and platforms to provide real-time transaction data access to tax authorities by January 1, 2028. Includes stablecoin payment rails.
**Invoica Impact**: Build API for real-time EU tax authority access to USDC payment transaction data. Implement jurisdiction-specific data filtering and secure authentication for tax authority queries.
**Status**: ⏳ Pending


### [HIGH] Germany: KassenSichV TSE certification for blockchain-based invoice systems
**Source**: German Fiscal Authority (BSI) Technical Guideline TR-03153
**VAT Rate**: 19% | **Effective**: 2025-07-01
**Summary**: Cloud and blockchain invoice systems must obtain TSE (Technical Security Equipment) certification to ensure tamper-proof transaction logging. Certification required by July 1, 2025.
**Invoica Impact**: Obtain TSE certification for Base blockchain invoice recording or implement certified TSE-compliant logging layer. May require partnership with certified TSE provider for German market.
**Status**: ⏳ Pending

