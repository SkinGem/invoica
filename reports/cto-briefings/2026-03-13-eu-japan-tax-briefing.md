# EU+Japan Tax Watchdog CTO Briefing — 2026-03-13

## Summary
EU ViDA reforms (2025-2028) will classify Invoica as deemed supplier for platform-facilitated AI transactions, requiring VAT collection, mandatory e-invoicing, and real-time digital reporting. Japan requires JCT registration at JPY 10M threshold with 10% standard rate, applying reverse charge for B2B and platform collection for B2C. Both jurisdictions treat AI agent transactions as electronically supplied services with no micropayment exemptions. OSS quarterly filing is mandatory for EU cross-border B2C transactions under current rules.

## Invoica Product Impact
Build: (1) VAT/JCT collection engine supporting all EU+Japan rates with micropayment handling, (2) OSS registration and quarterly filing automation, (3) real-time DRR reporting to EU authorities by 2028, (4) mandatory e-invoicing for intra-EU transactions, (5) customer classification logic (B2B/B2C, jurisdiction detection), (6) JCT threshold monitoring for Japan market, (7) reverse charge invoice templates for Japanese B2B customers, (8) deemed supplier compliance workflows under ViDA

## Compliance Gaps (Product Action Required)
1. No deemed supplier VAT collection infrastructure for platform-facilitated transactions
2. Missing real-time digital reporting capability for EU DRR compliance (2028 deadline)
3. No mandatory e-invoicing system for intra-EU transactions
4. Lacking JCT registration workflow and threshold monitoring for Japan market
5. No customer type verification (B2B vs B2C) for differential tax treatment
6. Missing OSS quarterly filing automation and multi-country VAT aggregation
7. No micropayment VAT calculation with proper rounding for sub-euro transactions
8. Absent reverse charge invoice templates and documentation for Japanese B2B customers

## Priority Actions
1. 1. HIGH: Implement deemed supplier VAT collection for ViDA compliance (2025-2028 deadlines)
2. 2. HIGH: Build OSS registration and quarterly filing automation for current EU B2C transactions
3. 3. HIGH: Develop real-time DRR reporting system for 2028 EU deadline
4. 4. MEDIUM: Create customer classification engine (B2B/B2C, jurisdiction) for differential tax treatment
5. 5. MEDIUM: Implement JCT registration workflow with JPY 10M threshold monitoring for Japan
6. 6. MEDIUM: Build mandatory e-invoicing capability for intra-EU transactions (2028)
7. 7. MEDIUM: Add micropayment VAT handling with proper rounding logic
8. 8. LOW: Develop reverse charge invoice templates for Japanese B2B compliance

## VAT Rate Reference
- Germany: 19%
- France: 20%
- Spain: 21%
- Italy: 22%
- Netherlands: 21%
- Japan_standard: 10%
- Japan_reduced: 8%

## New Regulatory Entries

### [HIGH] EU: ViDA Platform Deemed Supplier Rules
**Source**: European Commission COM(2022) 701 final, Council of the EU
**VAT Rate**: Various EU rates | **Effective**: 2028-01-01
**Summary**: Under VAT in the Digital Age reform, platforms facilitating taxable supplies become deemed suppliers liable for VAT collection. Implementation staggered 2025-2028, with e-invoicing/DRR starting 2028.
**Invoica Impact**: Invoica may be classified as deemed supplier for AI agent transactions, requiring VAT collection infrastructure, OSS registration expansion, and mandatory e-invoicing capabilities for intra-EU transactions
**Status**: ⏳ Pending


### [HIGH] EU: Digital Reporting Requirement (DRR)
**Source**: European Commission ViDA Proposal COM(2022) 701 final
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: DRR replaces current recapitulative statements with real-time digital reporting for intra-EU transactions. Mandatory for platforms from 2028.
**Invoica Impact**: Build automated real-time transaction reporting system to EU tax authorities for all cross-border AI agent payments; integrate with existing invoice generation
**Status**: ⏳ Pending


### [MEDIUM] EU: OSS Expansion to B2B Transactions
**Source**: Council Directive (EU) 2021/1159, ViDA reforms
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: OSS scheme expands beyond B2C to include certain B2B transactions and mandatory platform registration under ViDA.
**Invoica Impact**: Extend OSS registration logic to cover B2B AI agent transactions; update VAT calculation engine to handle mixed B2B/B2C scenarios under single OSS portal
**Status**: ⏳ Pending


### [MEDIUM] Japan: Specified Platform JCT Registration
**Source**: National Tax Agency (NTA) Consumption Tax Act amendments
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Foreign platforms facilitating digital services to Japanese consumers must register for JCT if acting as intermediary. Applies if taxable sales exceed JPY 10M in previous two years.
**Invoica Impact**: Monitor Japan-based transaction volume; implement JCT registration workflow when threshold approached; build JCT collection (10% rate) for Japanese B2C transactions
**Status**: ⏳ Pending


### [MEDIUM] Japan: B2B Reverse Charge for Digital Services
**Source**: National Tax Agency (NTA)
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Japanese business customers self-assess JCT on imported digital services under reverse charge mechanism since 2015.
**Invoica Impact**: Issue invoices to Japanese B2B customers without JCT; provide documentation supporting reverse charge; implement customer type verification (B2B vs B2C) for Japan
**Status**: ⏳ Pending


### [LOW] Japan: JCT Registration Threshold JPY 10M
**Source**: National Tax Agency (NTA)
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Foreign digital service providers must register for JCT if taxable sales in Japan exceed JPY 10 million over previous two years.
**Invoica Impact**: Build automated tracking of Japan-sourced revenue in JPY equivalent; create alert system at 80% threshold (JPY 8M); prepare JCT registration process documentation
**Status**: ⏳ Pending


### [HIGH] EU: OSS Quarterly Declaration
**Source**: Council Directive (EU) 2021/1159
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: Businesses using OSS must file quarterly VAT returns covering all EU member states where B2C digital services are supplied.
**Invoica Impact**: Implement quarterly OSS filing calendar with automated data aggregation by member state; track VAT collected per country for consolidated reporting
**Status**: ⏳ Pending


### [MEDIUM] EU: VAT on Micropayments
**Source**: VAT Directive 2006/112/EC
**VAT Rate**: Various EU rates | **Effective**: In effect
**Summary**: No de minimis exemption exists for B2C digital services; VAT applies to all transactions including micropayments (e.g., €0.01 API calls).
**Invoica Impact**: Ensure VAT calculation engine handles micropayments with proper rounding; accumulate and remit small VAT amounts; consider bundling strategy for ultra-low-value transactions
**Status**: ⏳ Pending

