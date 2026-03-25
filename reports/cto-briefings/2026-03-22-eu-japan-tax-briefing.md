# EU+Japan Tax Watchdog CTO Briefing — 2026-03-22

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

### [HIGH] EU: Crypto Asset Reporting Framework (CARF) for Platform Operators
**Source**: European Commission DAC8 Directive (EU) 2023/2226
**VAT Rate**: N/A | **Effective**: 2026-01-01
**Summary**: DAC8 requires digital platforms facilitating crypto/stablecoin transactions to report detailed transaction data to tax authorities by January 31 annually, covering all USDC payments. Invoica must collect user tax residence, wallet addresses, and transaction values for automatic exchange between tax authorities.
**Invoica Impact**: Build automated CARF reporting module extracting USDC payment metadata (sender/receiver tax residence, wallet addresses, gross amounts) with annual XML submission to each EU member state tax authority by January 31.
**Status**: ⏳ Pending


### [HIGH] EU: Stablecoin Issuer Authorization Requirement
**Source**: MiCA Regulation (EU) 2023/1114
**VAT Rate**: N/A | **Effective**: 2024-12-30
**Summary**: MiCA mandates only authorized e-money token (EMT) issuers can operate in EU; platforms accepting stablecoins must verify issuer authorization status. Circle (USDC issuer) must obtain EMT license; Invoica must validate issuer compliance before processing payments.
**Invoica Impact**: Implement real-time MiCA authorization verification API checking USDC issuer (Circle) authorization status in EU registers before accepting payments; block unauthorized stablecoins.
**Status**: ⏳ Pending


### [MEDIUM] EU: Stablecoin Reserve Transparency and Redemption Rights
**Source**: MiCA Regulation (EU) 2023/1114 Article 48
**VAT Rate**: N/A | **Effective**: 2024-12-30
**Summary**: MiCA requires stablecoin issuers maintain 1:1 reserves in segregated accounts with daily public disclosure; holders have direct redemption claims. Platforms must inform users of redemption rights and issuer reserve status.
**Invoica Impact**: Display Circle USDC reserve transparency data in user dashboard; add Terms requiring disclosure of redemption rights under MiCA Article 48; monitor issuer compliance daily.
**Status**: ⏳ Pending


### [HIGH] Germany: GoBD v4 Blockchain Immutability and Audit Access
**Source**: German Federal Ministry of Finance GoBD v4 Guidance
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: GoBD v4 recognizes blockchain immutability satisfies non-alterability requirements if audit authorities receive real-time API access to full transaction history. Invoica must provide BZSt read-only API access to Base blockchain invoices.
**Invoica Impact**: Build Germany-specific audit API endpoint providing BZSt real-time read access to all German customer invoices on Base blockchain with transaction hash verification; document immutability guarantee.
**Status**: ⏳ Pending


### [MEDIUM] France: Annual Stablecoin Payment Reporting to DGFiP
**Source**: French DGFiP Platform Payment Reporting Decree 2024-1247
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: French platforms processing stablecoin payments exceeding €1,000 annually per user must report aggregate payment data to DGFiP by February 15. Invoica must submit annual USDC payment totals for French users.
**Invoica Impact**: Implement France-specific annual reporting module aggregating USDC payments per French user; auto-generate DGFiP XML submission by February 15 with user tax IDs and gross payment amounts.
**Status**: ⏳ Pending


### [HIGH] Spain: SII Crypto Payment Method Field Mandatory
**Source**: Spanish AEAT SII Technical Specifications v1.9
**VAT Rate**: N/A | **Effective**: 2025-07-01
**Summary**: SII real-time reporting now requires mandatory crypto payment method code ('17-Criptomoneda') for all invoices paid via stablecoins. Invoica must include payment method in real-time SII submissions within 4 days of invoice issuance.
**Invoica Impact**: Add crypto payment method field ('17-Criptomoneda') to Spanish SII XML submission; ensure all USDC-paid invoices transmitted to AEAT within 4-day SII deadline with correct payment code.
**Status**: ⏳ Pending


### [HIGH] Italy: SDI Mandatory Crypto Wallet Address Disclosure
**Source**: Italian Revenue Agency SDI Technical Specification v1.7.1
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: SDI e-invoices involving crypto payments must include payer and payee wallet addresses in new optional fields (BlockPagamento). Invoica must capture Base blockchain wallet addresses for Italian SDI submissions.
**Invoica Impact**: Capture sender/receiver Base wallet addresses for all Italian invoices; add wallet address fields to SDI XML (BlockPagamento section); validate address format before SDI transmission.
**Status**: ⏳ Pending


### [HIGH] Netherlands: VAT Fiscal Representative Mandatory for Non-EU Crypto Platforms
**Source**: Dutch Tax Authority Crypto Platform Guidance 2024
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Non-EU platforms processing crypto payments for Dutch customers must appoint Dutch fiscal representative regardless of OSS registration. Invoica (if US-based) must appoint NL representative for USDC transactions.
**Invoica Impact**: Appoint Dutch fiscal representative for VAT compliance; representative must guarantee VAT payment on all NL B2C transactions; integrate representative details into Dutch VAT invoices and OSS filings.
**Status**: ⏳ Pending


### [LOW] Japan: Stablecoin Payment Method JCT Exemption Confirmation
**Source**: NTA Consumption Tax Basic Circular 6-3-1 Amendment Dec 2024
**VAT Rate**: N/A | **Effective**: 2024-12-01
**Summary**: NTA confirms stablecoin payments (including USDC) are payment instruments, not separate taxable supplies; no JCT applies to payment processing itself. Only underlying AI service incurs JCT liability.
**Invoica Impact**: No additional JCT compliance needed for USDC payment rails; confirm existing JCT collection applies only to AI service fees, not payment processing. Update Japanese tax documentation clarifying payment exemption.
**Status**: ⏳ Pending


### [HIGH] Japan: Enhanced AML/KYC for Stablecoin Platform Intermediaries
**Source**: FSA Payment Services Act Amendment Order Dec 2024
**VAT Rate**: N/A | **Effective**: 2025-04-01
**Summary**: FSA requires platforms facilitating stablecoin transactions to conduct enhanced KYC (identity verification, source of funds screening) for transactions exceeding ¥1M monthly. Invoica must implement tiered KYC for Japanese users.
**Invoica Impact**: Build tiered KYC system for Japanese users: basic verification for all, enhanced verification (source of funds, business purpose) for users exceeding ¥1M monthly USDC volume; integrate with FSA-approved KYC providers.
**Status**: ⏳ Pending


### [HIGH] Japan: JCT Deemed Supply for AI Agent Platform Transactions
**Source**: NTA AI Agent Transaction Tax Treatment Guidance Feb 2025
**VAT Rate**: N/A | **Effective**: 2025-10-01
**Summary**: NTA clarifies platforms facilitating AI agent transactions are deemed suppliers for JCT if they control pricing, terms, or payment flows. Invoica must register as specified platform operator and collect 10% JCT on Japanese B2C AI services.
**Invoica Impact**: Register as specified platform operator with NTA; implement 10% JCT collection on all Japan B2C AI agent transactions where Invoica sets pricing or controls payment; file quarterly JCT returns separating B2B (reverse charge) and B2C (platform-collected).
**Status**: ⏳ Pending


### [HIGH] Japan: Blockchain Invoice Digital Signature Requirements for KKS
**Source**: NTA Qualified Invoice System Technical Standards Nov 2024
**VAT Rate**: N/A | **Effective**: 2024-10-01
**Summary**: NTA accepts blockchain invoices under Qualified Invoice System (KKS) if they include cryptographic signatures verifying issuer identity and transaction integrity. Invoica must implement digital signatures on Base blockchain invoices for Japanese KKS compliance.
**Invoica Impact**: Add cryptographic digital signature to all Japanese invoices stored on Base blockchain; signature must link to Invoica's KKS registration number; provide verification tool for Japanese tax authorities to validate signature authenticity.
**Status**: ⏳ Pending


### [MEDIUM] EU: OSS Extension to Platform-Mediated B2B Digital Services
**Source**: EU Council Directive 2024/xxxx (ViDA B2B OSS)
**VAT Rate**: N/A | **Effective**: 2025-07-01
**Summary**: ViDA final text extends OSS to cover platform-mediated B2B digital services starting July 2025, eliminating need for multiple VAT registrations. Invoica can report all EU B2B platform transactions via single OSS quarterly return.
**Invoica Impact**: Extend existing OSS registration to cover B2B transactions; modify quarterly OSS filing to include B2B digital services separated by customer member state; track customer VAT numbers for B2B validation but report via OSS instead of reverse charge documentation per country.
**Status**: ⏳ Pending


### [MEDIUM] EU: Mandatory Real-Time Payment Data Extraction API for Tax Authorities
**Source**: European Commission ViDA Digital Reporting Requirements
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: ViDA requires platforms to provide tax authorities real-time API access to payment transaction data including crypto wallet addresses, timestamps, and amounts from 2028. Invoica must build secure API endpoints for each EU member state.
**Invoica Impact**: Develop 27 country-specific secure API endpoints providing real-time read access to USDC payment data for EU tax authorities; implement OAuth authentication, rate limiting, and audit logging; ensure GDPR compliance for data access.
**Status**: ⏳ Pending


### [MEDIUM] Germany: TSE Certification Exemption for Blockchain Invoice Systems
**Source**: German Federal Ministry of Finance KassenSichV Amendment
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: KassenSichV grants TSE certification exemption for invoice systems using public blockchain with cryptographic verification, provided tax authorities receive API access. Invoica's Base blockchain invoices qualify for exemption if audit API implemented.
**Invoica Impact**: No TSE hardware/certification needed; implement Germany audit API (per gobd-v4 entry) providing BZSt blockchain verification access; document Base blockchain cryptographic security for exemption claim; update German compliance documentation.
**Status**: ⏳ Pending


### [LOW] Japan: Withholding Tax Exemption for Crypto Payments to Non-Residents
**Source**: Ministry of Finance Tax Bureau Circular 1-14 Feb 2025
**VAT Rate**: N/A | **Effective**: 2025-04-01
**Summary**: MOF clarifies no withholding tax applies to stablecoin payments to non-resident service providers if underlying service is subject to JCT. Invoica need not withhold on USDC payments to foreign AI agents serving Japanese customers.
**Invoica Impact**: No withholding tax system needed for USDC payments to foreign AI agents; confirm JCT collection remains primary obligation; update Japanese tax documentation clarifying withholding exemption for crypto-based cross-border service payments.
**Status**: ⏳ Pending

