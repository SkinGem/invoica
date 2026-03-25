# EU+Japan Tax Watchdog CTO Briefing — 2026-03-14

## Summary
EU ViDA reform (2025-2030) introduces mandatory e-invoicing, real-time reporting, and potential platform VAT liability, requiring Invoica to become deemed supplier for B2C transactions. Japan's Specified Platform Operator rules (2021) require JCT collection if Invoica controls transaction terms for Japanese customers. OSS expansion mandates single EU registration for cross-border B2C VAT compliance. Standard VAT rates confirmed: Germany 19%, France 20%, Spain 21%, Italy 22%, Netherlands 21%, Japan 10%.

## Invoica Product Impact
Invoica must: (1) Implement EU-compliant e-invoicing standard (EN 16931) with real-time VAT reporting API by 2025, (2) Register for EU OSS and collect/remit local VAT rates for all B2C transactions, (3) Build deemed supplier VAT collection mechanism if ViDA platform rules apply, (4) Register as Japan Specified Platform Operator and collect 10% JCT if controlling transaction terms, (5) Implement country-specific VAT rate engine (19-22% EU, 10% Japan) with customer location detection, (6) Create quarterly OSS filing automation for EU and Japan tax authority reporting.

## Compliance Gaps (Product Action Required)
1. No EU-compliant e-invoicing format (EN 16931) implemented for 2025 deadline
2. No OSS registration in any EU Member State for cross-border B2C VAT
3. No deemed supplier VAT collection mechanism for platform liability scenarios
4. No Japan Specified Platform Operator registration or JCT collection system
5. No automated customer location detection for correct VAT/JCT rate application
6. No quarterly tax authority reporting automation for OSS (EU) or NTA (Japan)
7. Unclear if Invoica controls transaction terms sufficiently to trigger platform operator status
8. No real-time VAT reporting API for ViDA compliance

## Priority Actions
1. 1. URGENT (Q2 2025): Determine if Invoica meets 'deemed supplier' or 'Specified Platform Operator' criteria in EU and Japan - requires legal assessment of transaction control
2. 2. HIGH (Q3 2025): Register for EU OSS in strategic Member State (Germany or Netherlands recommended) before ViDA mandatory deadline
3. 3. HIGH (Q3 2025): Implement dynamic VAT/JCT rate engine with geolocation: DE 19%, FR 20%, ES 21%, IT 22%, NL 21%, JP 10%
4. 4. HIGH (Q4 2025): Build EN 16931 e-invoicing format generator and real-time VAT reporting API for ViDA compliance
5. 5. HIGH (Q4 2025): If platform operator status confirmed, register with Japan NTA and implement JCT collection at 10%
6. 6. MEDIUM (Q1 2026): Automate quarterly OSS filing with Member State authorities and Japan NTA reporting
7. 7. MEDIUM (ongoing): Monitor ViDA final regulations (expected late 2024) for platform VAT liability scope and adjust deemed supplier logic

## VAT Rate Reference
- Germany: 19%
- France: 20%
- Spain: 21%
- Italy: 22%
- Netherlands: 21%
- Japan_standard: 10%
- Japan_reduced: 8%

## New Regulatory Entries

### [HIGH] EU: Mandatory e-invoicing for intra-EU B2B transactions
**Source**: European Commission ViDA Proposal COM(2022) 701 final
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: ViDA reform mandates real-time e-invoicing and reporting for all intra-EU B2B transactions by 2030, with phased implementation from 2025. Platforms facilitating payments may face VAT collection liability as deemed suppliers.
**Invoica Impact**: Invoica must implement EU-compliant e-invoicing format (likely EN 16931) and real-time VAT reporting API for transactions between EU businesses by 2025-2030 rollout.
**Status**: ⏳ Pending


### [HIGH] EU: Platform VAT collection liability under ViDA
**Source**: Council of the EU ViDA negotiations (consilium.europa.eu)
**VAT Rate**: Varies by Member State | **Effective**: 2025-01-01
**Summary**: Under negotiation: platforms facilitating digital payments may become liable for VAT collection if deemed to control transaction flow, similar to e-commerce marketplace rules. Expected decision by end 2024 for 2025 implementation.
**Invoica Impact**: Invoica may be deemed supplier for VAT purposes, requiring collection and remittance of VAT on behalf of AI agent service providers across all EU B2C transactions.
**Status**: ⏳ Pending


### [HIGH] EU: Mandatory OSS registration for digital platforms
**Source**: European Commission OSS expansion under ViDA
**VAT Rate**: Varies by Member State | **Effective**: 2025-01-01
**Summary**: ViDA proposes mandatory OSS registration for platforms facilitating B2C digital transactions, even if not directly supplying services. Single quarterly return covers all Member States.
**Invoica Impact**: Invoica must register for OSS in one EU Member State and file quarterly returns reporting all B2C transactions, collecting local VAT rates for each customer location.
**Status**: ⏳ Pending


### [HIGH] Japan: Specified Platform Operator JCT obligations
**Source**: NTA Consumption Tax on Cross-Border Services (nta.go.jp)
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Since 2021 amendments, platforms controlling digital transaction processes must collect JCT on behalf of service providers for Japanese customers. Applies if platform sets pricing, payment terms, or service conditions.
**Invoica Impact**: If Invoica controls payment flows or terms for AI services to Japanese customers, must register as Specified Platform Operator and collect 10% JCT on all transactions.
**Status**: ✅ Implemented


### [MEDIUM] Spain: Spanish standard VAT rate
**Source**: Spanish Tax Agency (AEAT)
**VAT Rate**: 21% | **Effective**: In effect
**Summary**: Standard VAT rate in Spain is 21% for digital services, applicable to B2C transactions where customer is located in Spain.
**Invoica Impact**: Invoica must charge 21% VAT on B2C digital services to Spanish consumers, reported through OSS.
**Status**: ✅ Implemented


### [MEDIUM] Italy: Italian standard VAT rate
**Source**: Italian Revenue Agency (Agenzia delle Entrate)
**VAT Rate**: 22% | **Effective**: In effect
**Summary**: Standard VAT rate in Italy is 22% for digital services, highest in EU5, applicable to B2C transactions where customer is located in Italy.
**Invoica Impact**: Invoica must charge 22% VAT on B2C digital services to Italian consumers, reported through OSS.
**Status**: ✅ Implemented


### [MEDIUM] Netherlands: Dutch standard VAT rate
**Source**: Dutch Tax and Customs Administration (Belastingdienst)
**VAT Rate**: 21% | **Effective**: In effect
**Summary**: Standard VAT rate in Netherlands is 21% for digital services, applicable to B2C transactions where customer is located in Netherlands.
**Invoica Impact**: Invoica must charge 21% VAT on B2C digital services to Dutch consumers, reported through OSS.
**Status**: ✅ Implemented


### [LOW] Japan: JCT reduced rate exclusions
**Source**: NTA Outline of Consumption Tax (nta.go.jp)
**VAT Rate**: 10% | **Effective**: 2019-10-01
**Summary**: 8% reduced JCT rate applies only to food/beverages (excluding alcohol and dining out), not digital services. AI/software services taxed at standard 10%.
**Invoica Impact**: Invoica must apply 10% JCT rate to all digital services for Japanese customers; reduced rate not applicable to platform services.
**Status**: ✅ Implemented

