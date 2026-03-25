# EU+Japan Tax Watchdog CTO Briefing — 2026-03-19

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

### [HIGH] EU: Platform VAT Liability for AI Agent Transactions
**Source**: European Commission COM/2022/701 - ViDA Proposal
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: ViDA reform explicitly includes AI-to-AI transactions in platform deemed supplier rules starting January 2025. Platforms facilitating automated digital services between AI agents may be liable for VAT collection even in B2B scenarios if agents lack clear legal entity attribution.
**Invoica Impact**: Invoica must implement legal entity verification for all AI agent users and determine whether platform is deemed supplier for VAT purposes. System must flag transactions where AI agent lacks verified legal entity and apply appropriate VAT treatment.
**Status**: ⏳ Pending


### [HIGH] EU: Real-Time Digital Reporting for Cross-Border Transactions
**Source**: European Commission ViDA - Digital Reporting Requirements
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: Digital Reporting Requirements (DRR) mandate near real-time reporting of cross-border B2B transactions to tax authorities starting January 2025. All platform-mediated digital services require transaction-level VAT data submission within 48 hours.
**Invoica Impact**: Build real-time VAT reporting API integration with EU Member State tax authorities. Transaction metadata must include VAT numbers, service classification, amounts, and blockchain transaction references for audit trail.
**Status**: ⏳ Pending


### [MEDIUM] EU: Mandatory Structured E-Invoicing Format
**Source**: European Commission ViDA - E-Invoicing Mandate
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: From January 2028, all intra-EU B2B invoices must use standardized structured format (EN 16931 compliant). Blockchain-based invoices must be convertible to this format for tax authority access.
**Invoica Impact**: Invoica invoices must be EN 16931 compliant or provide automatic conversion to this standard. Blockchain storage must include mappings to required EU e-invoice fields (VAT ID, invoice number, line items, VAT breakdown).
**Status**: ⏳ Pending


### [HIGH] EU: OSS Extension to Platform B2B Transactions
**Source**: EU VAT Implementing Regulation 282/2011 Amendment
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: OSS extended to cover platform-mediated B2B digital services from January 2025, eliminating separate registrations. Platforms must verify customer VAT numbers in real-time and report all B2B transactions quarterly.
**Invoica Impact**: Extend Invoica OSS registration to include B2B transactions. Implement real-time VIES validation for all EU business customers and automated quarterly OSS filing covering both B2C and B2B supplies.
**Status**: ⏳ Pending


### [MEDIUM] Germany: GoBD v4 Blockchain Audit Access Requirements
**Source**: German Federal Ministry of Finance - GoBD v4
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: GoBD version 4 requires blockchain invoice platforms to provide German tax authorities with direct audit access to transaction data including wallet addresses and smart contract interactions. Must maintain 10-year accessible audit trail.
**Invoica Impact**: Build German tax authority audit access portal with blockchain transaction explorer. Must link USDC payments to invoices with full transaction history, wallet addresses, and smart contract events queryable by German tax auditors.
**Status**: ⏳ Pending


### [HIGH] France: Mandatory Real-Time B2B VAT Number Validation
**Source**: French DGFiP - Real-Time VAT Validation Mandate
**VAT Rate**: 20% | **Effective**: 2025-01-01
**Summary**: From January 2025, digital platforms serving French B2B customers must validate VAT numbers via DGFiP API before invoice issuance. Invalid VAT numbers trigger automatic consumer VAT treatment.
**Invoica Impact**: Integrate DGFiP real-time VAT validation API for all French B2B transactions. System must reject or convert to B2C treatment if VAT validation fails, applying 20% French VAT automatically.
**Status**: ⏳ Pending


### [MEDIUM] Spain: SII Real-Time Reporting Extended to Digital Platforms
**Source**: Spanish Tax Agency (AEAT) - SII Extension
**VAT Rate**: 21% | **Effective**: 2025-07-01
**Summary**: Suministro Inmediato de Información (SII) extended to foreign digital platforms serving Spanish customers from July 2025. Requires invoice data submission within 4 days of issuance.
**Invoica Impact**: Build SII API integration for Spanish transactions. Invoica must submit invoice details to AEAT within 4 days including customer VAT, service description, amounts, and payment method (USDC must be reported as digital payment).
**Status**: ⏳ Pending


### [MEDIUM] Italy: SDI Stablecoin Payment Method Reporting Requirement
**Source**: Italian Revenue Agency (Agenzia delle Entrate) - SDI Update
**VAT Rate**: 22% | **Effective**: 2025-01-01
**Summary**: From January 2025, all e-invoices submitted to Sistema di Interscambio (SDI) must declare stablecoin payments using new payment method code 'MP23'. Blockchain transaction hash must be included in invoice payment terms field.
**Invoica Impact**: Update SDI integration to include MP23 payment method code for USDC payments. Add blockchain transaction hash to PaymentTerms field in FatturaPA XML format for Italian invoices.
**Status**: ⏳ Pending


### [HIGH] Netherlands: VAT Fiscal Representative Mandatory for Non-EU SaaS Platforms
**Source**: Dutch Tax Authority (Belastingdienst) - VAT Representative Rules
**VAT Rate**: 21% | **Effective**: 2025-01-01
**Summary**: From January 2025, all non-EU SaaS platforms with Dutch customers must appoint Dutch fiscal representative regardless of transaction volume. Previous €100k threshold eliminated for digital service platforms.
**Invoica Impact**: Invoica must appoint Dutch fiscal representative if serving Dutch customers. Representative must be registered before first Dutch transaction and handle all Dutch VAT compliance including returns and payments.
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin Payment Method JCT Exemption Clarification
**Source**: National Tax Agency (NTA) - Stablecoin Tax Treatment
**VAT Rate**: 10% | **Effective**: 2024-12-01
**Summary**: NTA clarified in December 2024 that stablecoin payments (including USDC) are JCT-exempt as payment instruments under Payment Services Act, not taxable crypto-asset transfers. Actual service provided remains subject to standard 10% JCT.
**Invoica Impact**: Confirm Invoica platform service fees and AI agent transaction facilitation are subject to 10% JCT. USDC payment processing itself is exempt, but service layer must apply JCT based on customer location and status (B2B reverse charge or B2C platform collection).
**Status**: ⏳ Pending


### [MEDIUM] Japan: Stablecoin Platform Intermediary Registration Requirement
**Source**: Financial Services Agency (FSA) - Payment Services Act Amendment
**VAT Rate**: N/A | **Effective**: 2024-04-01
**Summary**: FSA requires platforms processing stablecoin payments for Japanese users to register as Electronic Payment Instruments Intermediaries under PSA by April 2024. Registration mandatory for platforms exceeding ¥100 million annual transaction volume.
**Invoica Impact**: If Invoica Japan transaction volume exceeds ¥100M annually, must register with FSA as Electronic Payment Instruments Intermediary. Requires Japanese legal entity, ¥10M capital, compliance officer, and AML/KYC procedures.
**Status**: ⏳ Pending


### [MEDIUM] Japan: Blockchain Invoice Format Requirements for Qualified Invoice System
**Source**: National Tax Agency - Qualified Invoice System (KKS) Digital Format
**VAT Rate**: N/A | **Effective**: 2024-01-01
**Summary**: NTA issued guidance allowing blockchain-based invoices under KKS if they contain all required fields and are accessible in human-readable format for 7 years. Digital signatures acceptable as substitute for company seal.
**Invoica Impact**: Ensure Invoica invoices for Japanese customers include all KKS required fields: registration number, transaction date, customer name, description, tax-inclusive amount, applicable tax rate, and JCT amount. Provide PDF or readable export format.
**Status**: ⏳ Pending


### [HIGH] Japan: Consumption Place Determination for AI Agent Services
**Source**: National Tax Agency - AI Service Consumption Tax Guidance
**VAT Rate**: 10% | **Effective**: 2024-10-01
**Summary**: NTA clarified that AI agent services are taxed based on service recipient's location (not AI agent's server location). For B2B, recipient's business location determines JCT application; for B2C, consumer's usual residence applies.
**Invoica Impact**: Invoica must determine customer location for all transactions. Implement customer location verification (business address for B2B, residence for B2C). Apply 10% JCT for Japanese customers via reverse charge (B2B) or direct collection (B2C if Invoica registered).
**Status**: ⏳ Pending


### [MEDIUM] Japan: Quarterly Threshold Monitoring for JCT Registration
**Source**: National Tax Agency - Specified Platform Threshold Monitoring
**VAT Rate**: N/A | **Effective**: 2024-01-01
**Summary**: Specified platforms must monitor taxable sales quarterly and register for JCT within 30 days of exceeding ¥10M threshold. Retroactive JCT collection required from threshold breach date.
**Invoica Impact**: Implement quarterly Japan sales tracking. Alert system when approaching ¥10M threshold. If exceeded, initiate JCT registration process within 30 days and backfill JCT collection for transactions since threshold breach.
**Status**: ⏳ Pending


### [HIGH] EU: Stablecoin Issuer Authorization for Platform Integration
**Source**: EU Markets in Crypto-Assets Regulation (MiCA)
**VAT Rate**: N/A | **Effective**: 2024-06-30
**Summary**: From June 2024, only MiCA-authorized stablecoins can be used by EU platforms for payment services. Platforms must verify issuer authorization and maintain due diligence records.
**Invoica Impact**: Verify Circle (USDC issuer) has MiCA authorization for EU operations. Maintain documentation of issuer authorization status. If Circle lacks authorization, may need alternative EUR stablecoin or traditional payment rails for EU customers.
**Status**: ⏳ Pending


### [MEDIUM] EU: Mandatory Cross-Border Invoice XML Standard (EN 16931)
**Source**: European Commission ViDA - Invoice Standard Specification
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: All cross-border EU invoices must use EN 16931 semantic data model from January 2028. XML or UBL format required with standardized fields for VAT calculation, rates, exemptions, and reverse charge indicators.
**Invoica Impact**: Map Invoica invoice data model to EN 16931 standard. Generate compliant XML/UBL output for all EU invoices. Include VAT reverse charge indicator, VAT category codes (S=Standard, AE=Reverse Charge), and standardized country codes.
**Status**: ⏳ Pending

