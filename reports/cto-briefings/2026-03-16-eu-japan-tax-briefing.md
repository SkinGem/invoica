# EU+Japan Tax Watchdog CTO Briefing — 2026-03-16

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

### [HIGH] EU: Platform deemed supplier rules for AI agent transactions
**Source**: European Commission ViDA Package 2022, Council Agreement Dec 2023
**VAT Rate**: Variable by customer location (19-22%) | **Effective**: 2028-01-01
**Summary**: ViDA reforms classify platforms facilitating AI agent payments as deemed suppliers responsible for VAT collection starting 2028. Invoica would be liable for VAT on transactions between AI agents it facilitates, not just a payment processor.
**Invoica Impact**: Must build VAT collection engine at transaction level, collect supplier VAT numbers, issue VAT invoices as deemed supplier, maintain country-specific VAT rates for all EU5 countries, and implement real-time VAT calculation for each AI agent transaction
**Status**: ⏳ Pending


### [HIGH] EU: Real-time VAT number validation for B2B transactions
**Source**: ViDA Digital Reporting Requirement, EC Proposal Dec 2022
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: From 2025, B2B digital platforms must validate customer VAT numbers in real-time via VIES API before applying reverse charge. Invalid numbers trigger automatic VAT collection at supplier's rate.
**Invoica Impact**: Integrate VIES API for real-time VAT validation before invoice finalization, implement fallback VAT collection logic for invalid numbers, build rejection mechanism for transactions with unverified VAT status in high-risk scenarios
**Status**: ⏳ Pending


### [MEDIUM] EU: Mandatory structured e-invoicing for intra-EU B2B
**Source**: ViDA e-invoicing mandate, Council Agreement 2023
**VAT Rate**: N/A | **Effective**: 2030-01-01
**Summary**: All intra-EU B2B invoices must use EN 16931 standard format (Peppol, UBL, or national format) starting 2030. Paper and PDF invoices no longer accepted for cross-border VAT reporting.
**Invoica Impact**: Build EN 16931 compliant invoice generation, support Peppol network integration for cross-border delivery, implement structured data export in UBL/CII formats, ensure blockchain-stored invoices meet European standard requirements
**Status**: ⏳ Pending


### [HIGH] EU: OSS expansion to cover platform B2B transactions
**Source**: ViDA OSS Extension, Council Directive (EU) 2021/1159 Amendment
**VAT Rate**: Variable by jurisdiction | **Effective**: 2025-01-01
**Summary**: OSS registration expanded to include platform-facilitated B2B digital services where platforms are deemed suppliers. Single quarterly filing covers both B2C and designated B2B transactions.
**Invoica Impact**: Extend OSS filing module to include B2B transactions where Invoica is deemed supplier, aggregate B2B and B2C data for unified quarterly OSS returns, implement transaction classification logic to identify OSS-eligible B2B sales
**Status**: ⏳ Pending


### [HIGH] France: Mandatory real-time VAT validation API for digital platforms
**Source**: DGFiP (Direction générale des Finances publiques), Bulletin Officiel 2023
**VAT Rate**: 20% | **Effective**: 2024-01-01
**Summary**: French tax authority requires digital platforms serving French customers to integrate DGFiP's real-time VAT number validation API for every transaction. Offline validation no longer sufficient for compliance.
**Invoica Impact**: Integrate DGFiP-specific VAT validation API alongside VIES, implement API timeout handling and fallback procedures, build France-specific compliance reporting for failed validations, maintain separate validation logs for French authorities
**Status**: ⏳ Pending


### [HIGH] Germany: Blockchain invoice storage compliance with TSE requirements
**Source**: KassenSichV (Kassensicherungsverordnung), BMF Guidelines 2024
**VAT Rate**: 19% | **Effective**: 2025-01-01
**Summary**: German fiscal authorities require blockchain-stored invoices to comply with TSE (Technical Security Equipment) standards, including tamper-proof sequential numbering and certified timestamp services for tax audits.
**Invoica Impact**: Implement TSE-compliant sequential numbering on Base blockchain, integrate certified German timestamp service provider for invoice finalization, build audit export functionality meeting Kassengesetz digital access requirements, ensure blockchain records include all mandatory German invoice elements
**Status**: ⏳ Pending


### [MEDIUM] Spain: Sequential invoice numbering for SII real-time reporting
**Source**: Agencia Tributaria, SII (Suministro Inmediato de Información) Regulation
**VAT Rate**: 21% | **Effective**: In effect
**Summary**: Spanish VAT invoices require strict sequential numbering without gaps, reported to tax authority within 4 days via SII system. Blockchain platforms must ensure immutable sequence compliance.
**Invoica Impact**: Build Spain-specific sequential numbering system that prevents gaps even with blockchain concurrency, implement 4-day deadline tracking for SII submission, develop SII XML format export for invoice data, create alert system for sequence breaks requiring correction invoices
**Status**: ⏳ Pending


### [HIGH] Italy: SDI mandatory e-invoicing integration for blockchain platforms
**Source**: Agenzia delle Entrate, Sistema di Interscambio (SDI) Technical Specs
**VAT Rate**: 22% | **Effective**: In effect
**Summary**: All B2B invoices in Italy must pass through government SDI system in FatturaPA XML format. Blockchain platforms must integrate SDI for invoice transmission and receive SDI receipt as proof of compliance.
**Invoica Impact**: Build SDI integration to submit FatturaPA XML for all Italian invoices, implement SDI receipt verification and storage on blockchain, handle SDI rejection codes with automated correction workflows, maintain dual records (blockchain + SDI acknowledgment) for audit compliance
**Status**: ⏳ Pending


### [MEDIUM] Netherlands: VAT fiscal representative requirement for non-EU platforms
**Source**: Belastingdienst, VAT Implementation Decree Amendment 2023
**VAT Rate**: 21% | **Effective**: 2024-01-01
**Summary**: Non-EU digital platforms serving Dutch customers must appoint Dutch VAT fiscal representative if not using OSS. Representative jointly liable for VAT obligations including deemed supplier scenarios.
**Invoica Impact**: If Invoica operates outside OSS for any Dutch transactions, must contract with Dutch fiscal representative, implement representative notification system for all Dutch VAT events, build joint liability disclosure in customer terms for Dutch market, evaluate OSS coverage to minimize representative requirement
**Status**: ⏳ Pending


### [HIGH] Japan: Specified platform JCT liability for AI agent service transactions
**Source**: National Tax Agency (NTA), Consumption Tax Act Amendment 2024
**VAT Rate**: 10% | **Effective**: 2024-10-01
**Summary**: NTA clarifies that platforms facilitating AI agent services where agents act as service providers fall under specified platform operator rules. Platform must collect 10% JCT if provider lacks Japanese tax registration.
**Invoica Impact**: Build JCT collection logic for Japan-consumed AI services where provider is unregistered, implement Japanese qualified invoice (KKS) number verification for registered providers, develop specified platform operator reporting for NTA submissions, create Japan-specific reverse charge detection for B2B transactions
**Status**: ⏳ Pending


### [HIGH] Japan: Qualified Invoice System registration for digital platforms
**Source**: NTA Qualified Invoice System (Tekikaku Seikyusho Hozon Hoshiki) Guidelines
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Japan's KKS requires invoice issuers to display registration numbers and separate JCT amounts. Digital platforms must verify KKS numbers or become liable for JCT collection on behalf of unregistered suppliers.
**Invoica Impact**: Integrate NTA KKS registration number verification API, display KKS numbers on all Japanese invoices with separate JCT line items, implement fallback JCT collection when supplier lacks KKS registration, build KKS-compliant invoice format with all mandatory Japanese elements including registration number
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin platform PSA licensing requirements
**Source**: Financial Services Agency (FSA), Payment Services Act Amendment 2023
**VAT Rate**: N/A | **Effective**: 2023-06-01
**Summary**: Platforms facilitating USDC or other stablecoin payments must register as Type II Payment Service Provider or partner with licensed intermediary. Direct crypto payment processing requires FSA authorization.
**Invoica Impact**: Evaluate whether Invoica needs Type II PSA license for USDC payment facilitation in Japan, if yes, engage FSA licensing process or partner with licensed payment intermediary, implement FSA-compliant AML/KYC for Japanese users if licensed, build transaction monitoring meeting FSA reporting standards for stablecoin flows
**Status**: ⏳ Pending


### [MEDIUM] Japan: 7-year blockchain invoice retention and audit access
**Source**: NTA Record Retention Guidelines for Digital Transactions
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: Digital invoices including blockchain records must be retained for 7 years with full audit trail accessibility. NTA requires ability to export invoices in readable format with timestamps and transaction histories.
**Invoica Impact**: Ensure blockchain invoice records remain accessible for 7 years post-transaction, build NTA-compliant audit export functionality from blockchain data, implement Japanese-language invoice view for audit purposes, maintain backup mechanisms ensuring 7-year data availability independent of blockchain network status
**Status**: ⏳ Pending


### [HIGH] Japan: AI agent tax liability attribution framework
**Source**: Ministry of Economy, Trade and Industry (METI), AI Governance Guidelines 2024
**VAT Rate**: N/A | **Effective**: 2024-04-01
**Summary**: METI clarifies AI agents have no legal personality; all tax obligations attribute to the legal entity operating or benefiting from the agent. Platforms must identify and verify legal entity behind each AI agent for tax compliance.
**Invoica Impact**: Build mandatory legal entity verification for all AI agents on Invoica platform in Japan, implement beneficial owner identification for tax attribution, create entity-level tax reporting aggregating all agent transactions under single legal entity, ensure KYB (Know Your Business) procedures meet METI and NTA standards for AI agent operators
**Status**: ⏳ Pending


### [HIGH] Japan: Consumption place determination for AI agent services
**Source**: NTA Cross-Border Digital Services Consumption Place Guidelines 2024
**VAT Rate**: 10% | **Effective**: 2024-10-01
**Summary**: For AI-to-AI services, consumption place determined by location of recipient agent's operator or service beneficiary. Platforms must establish operator location through IP, billing address, or registration data.
**Invoica Impact**: Implement location detection combining IP geolocation, billing address verification, and KYC data for B2C AI services, build business location verification for B2B transactions to determine reverse charge applicability, create override mechanism for users to declare consumption location with supporting documentation, develop Japan-specific consumption place logic for ambiguous cross-border AI transactions
**Status**: ⏳ Pending

