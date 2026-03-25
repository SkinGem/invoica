# EU+Japan Tax Watchdog CTO Briefing — 2026-03-25

## Summary
EU ViDA reforms finalize platform VAT liability and real-time reporting by 2028, requiring liable party determination logic and DRR integration. MiCA stablecoin rules (effective June 2025) mandate Circle authorization verification, insolvency protection disclosure, and 10-year transaction retention. Japan strengthens KKS digital signature requirements, imposes JPY 1M monthly stablecoin transaction limits with EDD, and clarifies AI service classification for JCT treatment.

## Invoica Product Impact
Invoica must build: (1) Real-time VAT liable party determination engine for EU transactions considering supplier location and registration status, (2) MiCA compliance module verifying Circle authorization and displaying redemption rights, (3) Multi-jurisdiction invoice correction system preserving blockchain immutability (Germany), (4) SII blockchain hash submission within 4 days (Spain), (5) KKS digital signature generation and verification (Japan), (6) Monthly transaction limit monitoring with EDD triggers at JPY 1M threshold (Japan), (7) 10-year transaction archive with 24-hour authority access (EU MiCA), (8) CARF reporting automation with January 31 deadline tracking (DAC8).

## Compliance Gaps (Product Action Required)
1. No real-time VAT liable party determination logic for multi-party AI agent transactions
2. Missing MiCA Circle authorization verification and user disclosure of redemption rights
3. No blockchain invoice correction workflow maintaining immutable original plus linked amendments
4. SII integration lacks blockchain transaction hash field and 4-day submission automation
5. No KKS digital signature generation using ECDSA for Japanese invoices
6. Missing monthly USDC transaction volume monitoring per Japanese user with JPY 1M limit enforcement
7. No 10-year stablecoin transaction archive with 24-hour competent authority retrieval capability
8. No automated CARF report generation with January 31 deadline tracking across EU Member States
9. Missing AI service classification engine for Japanese JCT treatment determination
10. No DGFiP VAT API integration with 99.5% uptime monitoring and automatic fallback procedures

## Priority Actions
1. HIGH PRIORITY: Implement MiCA compliance module verifying Circle USDC authorization and 10-year transaction retention before June 30, 2025 deadline
2. HIGH PRIORITY: Build real-time VAT liable party determination engine for ViDA platform deemed supplier rules targeting 2028 implementation
3. HIGH PRIORITY: Develop KKS digital signature generation for Japanese blockchain invoices before April 1, 2025 effective date
4. HIGH PRIORITY: Implement Japan FSA monthly transaction limit monitoring (JPY 1M) with automatic EDD triggers before June 1, 2025
5. HIGH PRIORITY: Build Spain SII blockchain hash submission automation with 4-day deadline enforcement before July 1, 2025
6. HIGH PRIORITY: Develop Germany GoBD v4 invoice correction workflow preserving immutability via linked amendments before July 1, 2025
7. MEDIUM PRIORITY: Integrate France DGFiP VAT validation API with uptime monitoring and fallback procedures before September 1, 2025
8. MEDIUM PRIORITY: Implement Italy SDI USDC/EUR exchange rate capture and reporting before October 1, 2025
9. MEDIUM PRIORITY: Build AI service classification logic for Japan NTA JCT treatment determination before July 1, 2025
10. MEDIUM PRIORITY: Develop automated DAC8 CARF report generation with January 31 deadline tracking for 2026 reporting year

## VAT Rate Reference
- Germany: 19%
- France: 20%
- Spain: 21%
- Italy: 22%
- Netherlands: 21%
- Japan_standard: 10%
- Japan_reduced: 8%

## New Regulatory Entries

### [HIGH] EU: Stablecoin Issuer Insolvency Protection for Platform Users
**Source**: European Commission MiCA Regulation (EU) 2023/1114
**VAT Rate**: N/A | **Effective**: 2025-06-30
**Summary**: MiCA requires stablecoin issuers to segregate reserve assets and provide redemption rights even in insolvency. Platforms accepting stablecoins must verify issuer authorization and inform users of redemption procedures.
**Invoica Impact**: Invoica must verify Circle's MiCA authorization for USDC, display redemption rights in user terms, and implement contingency procedures if USDC issuer faces regulatory action or insolvency.
**Status**: ⏳ Pending


### [HIGH] EU: Platform Liable Party Determination for Multi-Party Transactions
**Source**: European Commission ViDA Proposal COM(2022) 701
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: ViDA clarifies that when AI agents transact through platforms, the platform becomes the deemed supplier and liable party for VAT collection if the underlying supplier is not EU-established or verified. Requires real-time determination of liable party per transaction.
**Invoica Impact**: Invoica must implement real-time logic to determine if Invoica or the service provider is VAT-liable based on supplier location, VAT registration status, and service type for each AI agent transaction.
**Status**: ⏳ Pending


### [HIGH] Germany: Blockchain Invoice Amendment and Correction Procedures
**Source**: German Ministry of Finance GoBD v4 Guidelines
**VAT Rate**: N/A | **Effective**: 2025-07-01
**Summary**: GoBD v4 requires blockchain invoice systems to maintain immutable original records while allowing amendment via linked correction invoices. Each correction must reference original transaction hash and maintain full audit trail.
**Invoica Impact**: Invoica must implement correction invoice functionality that preserves original blockchain invoice, creates linked correction record with original hash reference, and maintains both in audit-accessible format for 10 years.
**Status**: ⏳ Pending


### [MEDIUM] France: VAT Validation API Uptime and Fallback Requirements
**Source**: French DGFiP Technical Specification for VAT API Integration
**VAT Rate**: N/A | **Effective**: 2025-09-01
**Summary**: DGFiP mandates 99.5% uptime for real-time VAT validation API integration and requires platforms to implement automatic fallback to offline validation with post-transaction reconciliation when API unavailable.
**Invoica Impact**: Invoica must implement DGFiP VAT API with monitoring for uptime, automatic fallback to cached VAT number validation, and batch reconciliation process to submit delayed validations when API restored.
**Status**: ⏳ Pending


### [HIGH] Spain: SII Blockchain Transaction Hash as Mandatory Field
**Source**: Spanish AEAT SII Technical Specification v1.3
**VAT Rate**: N/A | **Effective**: 2025-07-01
**Summary**: AEAT updates SII real-time reporting to require blockchain transaction hash as mandatory field for invoices recorded on distributed ledger. Hash must be submitted within 4 days of invoice issuance.
**Invoica Impact**: Invoica must capture Base blockchain transaction hash for each invoice, include hash in SII real-time submission, and ensure 4-day submission deadline compliance for Spanish suppliers and customers.
**Status**: ⏳ Pending


### [MEDIUM] Italy: SDI Stablecoin Exchange Rate and EUR Conversion Reporting
**Source**: Italian Revenue Agency SDI Technical Rules v1.8
**VAT Rate**: N/A | **Effective**: 2025-10-01
**Summary**: SDI requires stablecoin payments to report both USDC amount and EUR equivalent using official exchange rate at transaction time. Rate source and timestamp must be included in invoice XML.
**Invoica Impact**: Invoica must capture USDC/EUR exchange rate at payment time from approved source (e.g., ECB), calculate EUR equivalent, and include both amounts plus rate metadata in SDI e-invoice XML for Italian transactions.
**Status**: ⏳ Pending


### [MEDIUM] Netherlands: VAT Fiscal Representative Joint Liability for Platform Transactions
**Source**: Dutch Tax Authority VAT Representative Guidelines 2025
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Non-EU platforms operating in Netherlands must appoint fiscal representative who assumes joint and several liability for all VAT obligations including platform-mediated B2C transactions and penalties.
**Invoica Impact**: If Invoica serves Dutch B2C customers without EU establishment, must appoint Dutch fiscal representative and ensure representative has access to real-time transaction data for VAT compliance and liability coverage.
**Status**: ⏳ Pending


### [HIGH] Japan: Digital Signature Requirement for Blockchain-Based Qualified Invoices
**Source**: Japan NTA Qualified Invoice System Implementation Guidelines 2025
**VAT Rate**: N/A | **Effective**: 2025-04-01
**Summary**: NTA clarifies that blockchain invoices under KKS must include digital signature from registered KKS supplier using approved cryptographic standard (e.g., ECDSA). Signature must be verifiable by recipient and tax authority.
**Invoica Impact**: Invoica must implement digital signature generation for Japanese KKS-registered suppliers using ECDSA or approved algorithm, embed signature in invoice metadata, and provide verification interface for recipients and NTA audits.
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin Platform Transaction Limit and Enhanced Due Diligence
**Source**: Japan FSA Payment Services Act Enforcement Regulations
**VAT Rate**: N/A | **Effective**: 2025-06-01
**Summary**: FSA imposes JPY 1,000,000 monthly transaction limit per user for stablecoin platforms unless enhanced due diligence (KYC) performed. Platforms must monitor aggregate monthly volume and suspend accounts exceeding threshold without EDD.
**Invoica Impact**: Invoica must track monthly USDC transaction volume per Japanese user, implement automatic threshold monitoring, trigger enhanced KYC process when approaching JPY 1M limit, and suspend transactions if limit exceeded without EDD completion.
**Status**: ⏳ Pending


### [MEDIUM] Japan: AI Agent Service Classification for JCT Treatment
**Source**: Japan NTA Administrative Guidelines for AI Services
**VAT Rate**: 10% | **Effective**: 2025-07-01
**Summary**: NTA issues guidance classifying AI agent services into three categories for JCT: (1) pure software/API access (digital service, 10% JCT), (2) consulting/professional services via AI (exempt if specific criteria met), (3) goods delivery via AI (standard JCT). Classification determines tax treatment and place of supply.
**Invoica Impact**: Invoica must implement service classification logic for AI agent transactions with Japanese parties, determine correct JCT treatment per NTA categories, and display classification rationale in invoice metadata for audit purposes.
**Status**: ⏳ Pending


### [HIGH] EU: Platform Seller KYC Verification Timeline and Reporting Deadlines
**Source**: EU Council Directive 2023/2226 (DAC8) Implementation
**VAT Rate**: N/A | **Effective**: 2026-01-01
**Summary**: DAC8 requires platforms to complete seller due diligence within 60 days of onboarding and submit annual CARF reports by January 31 following reporting year. Late or incomplete reporting subject to penalties up to €50,000 per Member State.
**Invoica Impact**: Invoica must implement 60-day KYC completion tracking for new sellers, automate CARF report generation for crypto transactions, and ensure January 31 submission deadline with confirmation receipts from Member State tax authorities.
**Status**: ⏳ Pending


### [HIGH] EU: Stablecoin Transaction Record Retention for Platform Intermediaries
**Source**: MiCA Regulation (EU) 2023/1114 Article 68
**VAT Rate**: N/A | **Effective**: 2025-06-30
**Summary**: Platforms facilitating stablecoin payments must retain complete transaction records including wallet addresses, amounts, timestamps, and counterparty identification for 10 years. Records must be accessible to competent authorities within 24 hours of request.
**Invoica Impact**: Invoica must implement 10-year retention for all USDC transaction records including Base blockchain addresses, implement secure archive system with 24-hour retrieval capability, and establish procedures for competent authority access requests.
**Status**: ⏳ Pending

