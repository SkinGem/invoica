# EU+Japan Tax Watchdog CTO Briefing — 2026-03-15

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

### [HIGH] EU: Real-time digital transaction reporting
**Source**: European Commission ViDA Proposal COM(2022) 701 final
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: ViDA mandates real-time digital reporting for intra-EU B2B transactions from 2028, requiring platforms to transmit transaction data to tax authorities immediately. All cross-border B2B digital services must be reported electronically within specified timeframes.
**Invoica Impact**: Invoica must build real-time API integration with EU tax authorities to transmit transaction metadata (parties, amounts, VAT treatment) for each invoice upon creation or payment settlement.
**Status**: ⏳ Pending


### [HIGH] EU: Mandatory platform operator VAT registration
**Source**: Council Directive (EU) 2021/1159 amendments via ViDA
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: From January 2025, platforms facilitating taxable digital services must register for VAT in at least one EU Member State regardless of transaction volume. Platform operators deemed suppliers must collect and remit VAT on transactions they facilitate.
**Invoica Impact**: Invoica must obtain EU VAT registration (recommend Ireland or Netherlands) and implement VAT calculation/collection logic for B2C transactions across all EU27 member states, storing customer location data.
**Status**: ⏳ Pending


### [MEDIUM] EU: OSS €10,000 threshold removal for platforms
**Source**: European Commission OSS Portal updates
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: ViDA eliminates the €10,000 de minimis threshold for platform operators under OSS from 2025. All B2C digital service platforms must use OSS regardless of transaction volume.
**Invoica Impact**: Invoica must implement OSS registration and quarterly filing automation even for low-volume B2C transactions, tracking VAT per Member State with no exemption threshold.
**Status**: ⏳ Pending


### [HIGH] EU: Stablecoin payment VAT exemption
**Source**: EU VAT Directive 2006/112/EC Article 135(1)(e) + ECJ Case C-264/14
**VAT Rate**: 19-25% | **Effective**: In effect
**Summary**: USDC and stablecoin transactions are treated as exempt financial services under Article 135(1)(e) when used as payment instruments, not subject to VAT. However, platform fees for facilitating payments are taxable digital services at standard rates.
**Invoica Impact**: Invoica's USDC payment processing is VAT-exempt, but subscription fees or transaction fees charged to AI agents are taxable at 19-25% depending on customer location, requiring separate invoicing streams.
**Status**: ⏳ Pending


### [MEDIUM] Germany: Blockchain invoice storage compliance
**Source**: German Federal Ministry of Finance (BMF) Kassengesetz guidance
**VAT Rate**: 19% | **Effective**: 2025-01-01
**Summary**: Germany's Kassengesetz requires electronic accounting systems to provide tamper-proof storage with audit trail. Blockchain-based invoices must provide export functionality in German tax authority format (DATEV or GoBD-compliant).
**Invoica Impact**: Invoica must build DATEV export format for German customers and provide certified audit log mapping blockchain transaction hashes to invoice records for BZSt compliance.
**Status**: ⏳ Pending


### [HIGH] France: Real-time VAT number validation requirement
**Source**: French DGFiP VIES and VAT API documentation
**VAT Rate**: 20% | **Effective**: In effect
**Summary**: France requires real-time VAT number validation via VIES API for all B2B cross-border transactions before applying reverse charge. Invalid VAT numbers mandate charging French VAT (20%) instead of reverse charge.
**Invoica Impact**: Invoica must integrate VIES API validation in invoice creation workflow, blocking reverse charge treatment if validation fails and auto-applying 20% French VAT for French customers.
**Status**: ⏳ Pending


### [MEDIUM] Spain: Sequential invoice numbering mandate
**Source**: Spanish Tax Agency (AEAT) invoicing regulations
**VAT Rate**: 21% | **Effective**: In effect
**Summary**: Spain requires invoices to follow sequential numbering without gaps, with separate sequences per calendar year. Blockchain-generated transaction IDs must map to compliant sequential invoice numbers.
**Invoica Impact**: Invoica must generate Spain-specific sequential invoice numbers (separate from blockchain TX hashes) and maintain gap-free annual sequences per Spanish legal entity.
**Status**: ⏳ Pending


### [HIGH] Italy: Mandatory SDI e-invoicing for B2B
**Source**: Italian Revenue Agency (Agenzia delle Entrate) SDI system
**VAT Rate**: 22% | **Effective**: In effect
**Summary**: Italy requires all B2B invoices to be transmitted through the Sistema di Interscambio (SDI) in FatturaPA XML format. Foreign suppliers to Italian businesses must use SDI or appoint Italian tax representative.
**Invoica Impact**: Invoica must build FatturaPA XML export and SDI transmission capability for Italian B2B customers, or partner with Italian fiscal representative to handle submission.
**Status**: ⏳ Pending


### [MEDIUM] Netherlands: Non-EU platform VAT representative
**Source**: Dutch Tax Authority (Belastingdienst) VAT guidelines
**VAT Rate**: 21% | **Effective**: In effect
**Summary**: Netherlands requires non-EU digital platforms with Dutch customers to appoint a fiscal representative or use simplified OSS registration. Representative is jointly liable for VAT compliance.
**Invoica Impact**: Invoica (US-based) must either appoint Dutch fiscal representative or register under Non-Union OSS scheme to service Dutch customers, requiring legal entity setup or third-party contract.
**Status**: ⏳ Pending


### [HIGH] Japan: Qualified Invoice System (KKS) registration
**Source**: National Tax Agency (NTA) Qualified Invoice System
**VAT Rate**: 10% | **Effective**: 2023-10-01
**Summary**: From October 2023, Japan's Qualified Invoice System requires suppliers to obtain registration number and issue compliant invoices with specific fields (registration number, VAT breakdown, supplier details). Only registered businesses can charge recoverable JCT.
**Invoica Impact**: Invoica must enable Japanese registration number collection from AI agents serving Japanese customers and include registration number, 10% JCT breakdown, and Japanese-language invoice fields in templates.
**Status**: ⏳ Pending


### [HIGH] Japan: Stablecoin licensing under Payment Services Act
**Source**: Financial Services Agency (FSA) Payment Services Act amendments
**VAT Rate**: N/A | **Effective**: 2023-06-01
**Summary**: From June 2023, stablecoins like USDC are regulated as "electronic payment instruments" under PSA, requiring platform operators facilitating stablecoin payments to register as Type II fund transfer service providers. Foreign platforms must establish Japanese subsidiary or appoint authorized agent.
**Invoica Impact**: Invoica must register with FSA as Type II fund transfer service provider or partner with licensed Japanese payment processor to legally facilitate USDC invoice payments for Japanese customers.
**Status**: ⏳ Pending


### [HIGH] Japan: Specified platform JCT liability for AI agent transactions
**Source**: National Tax Agency (NTA) Platform Operator Guidelines
**VAT Rate**: 10% | **Effective**: 2024-04-01
**Summary**: NTA guidance extends specified platform rules to AI-to-AI service marketplaces. Platforms facilitating taxable digital services between AI agents must collect 10% JCT if underlying service provider lacks Japanese registration.
**Invoica Impact**: Invoica must determine JCT registration status of each AI agent service provider; if unregistered, Invoica becomes liable to collect and remit 10% JCT on transactions involving Japanese customers.
**Status**: ⏳ Pending


### [MEDIUM] Japan: 7-year invoice retention requirement
**Source**: National Tax Agency (NTA) Corporate Tax Law Article 126
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: Japan requires businesses to retain all invoices and transaction records for 7 years in retrievable format. Blockchain-based invoices must be accessible to NTA auditors with Japanese-language metadata.
**Invoica Impact**: Invoica must provide 7-year data retention guarantee with Japanese-language export capability and audit trail mapping blockchain records to human-readable invoice formats for NTA compliance.
**Status**: ⏳ Pending


### [HIGH] Japan: AI agent tax liability attribution
**Source**: Ministry of Economy, Trade and Industry (METI) AI Guidelines
**VAT Rate**: N/A | **Effective**: 2024-01-01
**Summary**: METI confirms AI agents have no legal personality for tax purposes. Tax liability for AI agent transactions rests with the registered business operating the agent (developer, deployer, or authorized representative).
**Invoica Impact**: Invoica must implement mandatory legal entity verification for all AI agents on platform, requiring human/corporate owner identification and tax registration details before enabling transaction capabilities.
**Status**: ⏳ Pending


### [MEDIUM] EU: Stablecoin issuer authorization requirement
**Source**: EU Markets in Crypto-Assets Regulation (MiCA)
**VAT Rate**: N/A | **Effective**: 2024-12-30
**Summary**: MiCA requires stablecoin issuers and service providers to obtain authorization from EU regulators. Platforms facilitating stablecoin payments must conduct due diligence on issuer compliance and maintain transaction records.
**Invoica Impact**: Invoica must verify Circle (USDC issuer) holds MiCA authorization for EU operations and implement KYC/transaction monitoring to comply with crypto-asset service provider obligations if deemed in-scope.
**Status**: ⏳ Pending

