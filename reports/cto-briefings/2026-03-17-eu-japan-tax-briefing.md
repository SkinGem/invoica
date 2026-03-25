# EU+Japan Tax Watchdog CTO Briefing — 2026-03-17

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

### [HIGH] EU: Platform Transaction Monitoring and Data Access
**Source**: European Commission COM/2022/701 final - ViDA Proposal
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: ViDA requires platforms to maintain detailed transaction records accessible to tax authorities in real-time. Platforms must track supplier identity, customer location, transaction value, and VAT treatment for each transaction.
**Invoica Impact**: Invoica must build audit trail system storing Base blockchain transaction hash, USDC amount, counterparty wallet addresses, VAT determination logic, and link to legal entity registration for each AI agent transaction
**Status**: ⏳ Pending


### [HIGH] EU: Mandatory VAT Registration Verification for Platforms
**Source**: Council of the EU partial agreement October 2023
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Platforms must verify VAT registration status of all B2B suppliers and customers before transaction execution. Invalid or missing VAT numbers trigger platform VAT liability as deemed supplier.
**Invoica Impact**: Invoica must integrate real-time VIES API validation pre-transaction, block invoices with invalid VAT numbers in B2B mode, and maintain verification timestamp logs
**Status**: ⏳ Pending


### [MEDIUM] EU: OSS Quarterly Reconciliation and Payment Obligation
**Source**: European Commission OSS Guidance ec.europa.eu/taxation_customs
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: Platforms using OSS must submit quarterly reconciliation reports matching transaction data to VAT collected, with payment due by month-end following quarter-end. Late filing penalties start at €500 per Member State.
**Invoica Impact**: Invoica needs automated quarterly OSS report generator aggregating B2C transactions by Member State, calculating VAT owed, generating XML submission file, and tracking payment deadlines
**Status**: ⏳ Pending


### [HIGH] Germany: GoBD v3 Blockchain Invoice Storage Requirements
**Source**: German Federal Ministry of Finance BMF IV A 4 - S 0316/19/10003
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Updated GoBD principles allow blockchain invoice storage if immutability, auditability, and 10-year retention are guaranteed. Requires certified technical security equipment (TSE) integration for tamper-proof timestamps.
**Invoica Impact**: Invoica must implement TSE-compliant timestamping for German invoices stored on Base blockchain, provide BaFin-auditable export format, and ensure 10-year data availability guarantee
**Status**: ⏳ Pending


### [HIGH] France: Mandatory Real-Time VAT API Integration for Digital Platforms
**Source**: Direction Générale des Finances Publiques (DGFiP) Bulletin Officiel
**VAT Rate**: N/A | **Effective**: 2024-07-01
**Summary**: French tax authority requires digital platforms to integrate real-time VAT validation API before invoice issuance for French entities. Non-compliance results in invoice rejection and platform liability for uncollected VAT.
**Invoica Impact**: Invoica must build DGFiP VAT API integration checking French SIREN/SIRET and VAT registration status pre-invoice, with fallback to manual review queue if API unavailable
**Status**: ⏳ Pending


### [MEDIUM] Spain: SII Real-Time Reporting Extension to Digital Platforms
**Source**: Spanish Tax Agency AEAT Order HAC/1177/2024
**VAT Rate**: N/A | **Effective**: 2025-07-01
**Summary**: Spain extends Immediate Supply of Information (SII) requirement to digital platforms facilitating B2B transactions. Invoices must be reported to AEAT within 4 days of issuance with sequential numbering.
**Invoica Impact**: Invoica needs SII XML submission module for Spanish B2B transactions, sequential invoice numbering per legal entity, and 4-day automatic submission scheduler
**Status**: ⏳ Pending


### [MEDIUM] Italy: SDI Stablecoin Payment Method Reporting
**Source**: Italian Revenue Agency Agenzia delle Entrate Provvedimento 2024
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Italian SDI e-invoicing system adds mandatory payment method field for stablecoin transactions. USDC payments must be coded as 'MP23' (crypto-asset payment) with blockchain transaction hash reference.
**Invoica Impact**: Invoica SDI integration must include payment method code MP23 for USDC, embed Base blockchain transaction hash in PaymentMethod field, and handle SDI validation errors
**Status**: ⏳ Pending


### [MEDIUM] Netherlands: VAT Fiscal Representative Requirement for Non-EU SaaS Platforms
**Source**: Dutch Tax Authority Belastingdienst Policy Decision 2024
**VAT Rate**: N/A | **Effective**: 2024-01-01
**Summary**: Non-EU platforms providing SaaS to Dutch businesses must appoint Dutch fiscal representative if facilitating VAT-liable transactions exceeding €25,000 annually. Representative liable for platform's VAT obligations.
**Invoica Impact**: Invoica (US entity) must appoint Dutch fiscal representative if Dutch transaction volume exceeds threshold, build threshold monitoring dashboard, and integrate representative into VAT collection workflow
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin Payment JCT Treatment Clarification
**Source**: National Tax Agency NTA Consumption Tax Q&A Update 2024
**VAT Rate**: N/A | **Effective**: 2024-04-01
**Summary**: NTA clarifies USDC payments for digital services are treated as payment instruments (not currency), with JCT calculated on yen-equivalent value at transaction time. Platform must use official exchange rate from Japan Customs for conversion.
**Invoica Impact**: Invoica must integrate Japan Customs USD/JPY exchange rate API, calculate JCT on yen-equivalent USDC amount, and store conversion rate with each Japanese transaction
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin Platform Intermediary Registration
**Source**: Financial Services Agency FSA Payment Services Act Amendment 2023
**VAT Rate**: N/A | **Effective**: 2024-06-01
**Summary**: Platforms facilitating USDC payments must register as Type II Electronic Payment Intermediary under amended PSA. Registration requires capital of JPY 10M, AML/CFT compliance, and annual FSA reporting.
**Invoica Impact**: Invoica must assess if facilitating USDC payments triggers Type II registration requirement, potentially establish Japanese subsidiary with JPY 10M capital, and implement FSA reporting system
**Status**: ⏳ Pending


### [HIGH] Japan: Qualified Invoice Blockchain Format Requirements
**Source**: National Tax Agency NTA Qualified Invoice System Guidelines 2024
**VAT Rate**: N/A | **Effective**: 2024-10-01
**Summary**: NTA accepts blockchain-stored invoices under Qualified Invoice System if they include registration number, transaction date, description, tax amount, and are retrievable for 7 years. Smart contract invoices must be convertible to human-readable format.
**Invoica Impact**: Invoica must ensure Base blockchain invoices include all KKS mandatory fields, build 7-year retrieval system with Japanese language export, and create human-readable PDF conversion tool
**Status**: ⏳ Pending


### [HIGH] Japan: AI Service Consumption Place Determination for JCT
**Source**: National Tax Agency NTA Administrative Guidelines on Cross-Border Services 2024
**VAT Rate**: N/A | **Effective**: 2024-04-01
**Summary**: For AI agent transactions, consumption place is determined by location of legal entity controlling the agent, not server location. Platform must verify controlling entity address through registration data.
**Invoica Impact**: Invoica must require legal entity address verification during AI agent onboarding, implement consumption place logic based on controller location (not wallet address), and document determination in transaction metadata
**Status**: ⏳ Pending


### [MEDIUM] Japan: Specified Platform JCT Registration Threshold Monitoring
**Source**: National Tax Agency NTA Specified Platform Operator Guidance 2024
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: Platforms must monitor Japanese taxable sales monthly and register within 15 days of exceeding JPY 10M annual threshold. Retroactive JCT liability applies if registration delayed beyond 15-day window.
**Invoica Impact**: Invoica needs real-time Japanese transaction threshold dashboard tracking JPY 10M limit, automated alert at JPY 8M, and expedited NTA registration workflow triggering at threshold breach
**Status**: ⏳ Pending


### [MEDIUM] EU: Mandatory Cross-Border Invoice XML Standard
**Source**: European Commission ViDA Technical Standards Draft 2024
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: ViDA introduces mandatory EN 16931 compliant XML format for all intra-EU B2B invoices by 2028. Platforms must support Peppol network integration for automated invoice exchange.
**Invoica Impact**: Invoica must build EN 16931 XML invoice generator, integrate Peppol Access Point for EU transactions, and support automated invoice routing to national e-invoicing hubs
**Status**: ⏳ Pending


### [HIGH] EU: Stablecoin Issuer Authorization Requirement for Platform Use
**Source**: European Securities and Markets Authority ESMA MiCA Regulation (EU) 2023/1114
**VAT Rate**: N/A | **Effective**: 2025-06-30
**Summary**: Platforms accepting stablecoins must verify issuer holds valid MiCA authorization from EU competent authority. Using unauthorized stablecoins exposes platform to payment reversal risk and regulatory sanctions.
**Invoica Impact**: Invoica must verify USDC issuer (Circle) holds MiCA authorization for EU operations, maintain list of approved stablecoins, and implement issuer authorization check before enabling payment methods
**Status**: ⏳ Pending

