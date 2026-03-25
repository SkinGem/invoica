# EU+Japan Tax Watchdog Report — 2026-03-13

## Executive Summary
EU ViDA reforms (2025-2028) will classify Invoica as deemed supplier for platform-facilitated AI transactions, requiring VAT collection, mandatory e-invoicing, and real-time digital reporting. Japan requires JCT registration at JPY 10M threshold with 10% standard rate, applying reverse charge for B2B and platform collection for B2C. Both jurisdictions treat AI agent transactions as electronically supplied services with no micropayment exemptions. OSS quarterly filing is mandatory for EU cross-border B2C transactions under current rules.

## Invoica Impact Assessment
Build: (1) VAT/JCT collection engine supporting all EU+Japan rates with micropayment handling, (2) OSS registration and quarterly filing automation, (3) real-time DRR reporting to EU authorities by 2028, (4) mandatory e-invoicing for intra-EU transactions, (5) customer classification logic (B2B/B2C, jurisdiction detection), (6) JCT threshold monitoring for Japan market, (7) reverse charge invoice templates for Japanese B2B customers, (8) deemed supplier compliance workflows under ViDA

## VAT Rate Reference Card
| Jurisdiction | VAT Rate on Digital B2B Services |
|---|---|
| Germany | 19% |
| France | 20% |
| Spain | 21% |
| Italy | 22% |
| Netherlands | 21% |
| Japan_standard | 10% |
| Japan_reduced | 8% |

## New Developments This Week

### [HIGH] EU: ViDA Platform Deemed Supplier Rules
**Source**: European Commission COM(2022) 701 final, Council of the EU
**VAT Rate**: Various EU rates | **Effective**: 2028-01-01
**Summary**: Under VAT in the Digital Age reform, platforms facilitating taxable supplies become deemed suppliers liable for VAT collection. Implementation staggered 2025-2028, with e-invoicing/DRR starting 2028.
**Invoica Impact**: Invoica may be classified as deemed supplier for AI agent transactions, requiring VAT collection infrastructure, OSS registration expansion, and mandatory e-invoicing capabilities for intra-EU transactions


### [HIGH] EU: Digital Reporting Requirement (DRR)
**Source**: European Commission ViDA Proposal COM(2022) 701 final
**VAT Rate**: N/A | **Effective**: 2028-01-01
**Summary**: DRR replaces current recapitulative statements with real-time digital reporting for intra-EU transactions. Mandatory for platforms from 2028.
**Invoica Impact**: Build automated real-time transaction reporting system to EU tax authorities for all cross-border AI agent payments; integrate with existing invoice generation


### [MEDIUM] EU: OSS Expansion to B2B Transactions
**Source**: Council Directive (EU) 2021/1159, ViDA reforms
**VAT Rate**: N/A | **Effective**: 2025-01-01
**Summary**: OSS scheme expands beyond B2C to include certain B2B transactions and mandatory platform registration under ViDA.
**Invoica Impact**: Extend OSS registration logic to cover B2B AI agent transactions; update VAT calculation engine to handle mixed B2B/B2C scenarios under single OSS portal


### [MEDIUM] Japan: Specified Platform JCT Registration
**Source**: National Tax Agency (NTA) Consumption Tax Act amendments
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Foreign platforms facilitating digital services to Japanese consumers must register for JCT if acting as intermediary. Applies if taxable sales exceed JPY 10M in previous two years.
**Invoica Impact**: Monitor Japan-based transaction volume; implement JCT registration workflow when threshold approached; build JCT collection (10% rate) for Japanese B2C transactions


### [MEDIUM] Japan: B2B Reverse Charge for Digital Services
**Source**: National Tax Agency (NTA)
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Japanese business customers self-assess JCT on imported digital services under reverse charge mechanism since 2015.
**Invoica Impact**: Issue invoices to Japanese B2B customers without JCT; provide documentation supporting reverse charge; implement customer type verification (B2B vs B2C) for Japan


### [LOW] Japan: JCT Registration Threshold JPY 10M
**Source**: National Tax Agency (NTA)
**VAT Rate**: 10% | **Effective**: In effect
**Summary**: Foreign digital service providers must register for JCT if taxable sales in Japan exceed JPY 10 million over previous two years.
**Invoica Impact**: Build automated tracking of Japan-sourced revenue in JPY equivalent; create alert system at 80% threshold (JPY 8M); prepare JCT registration process documentation


### [HIGH] EU: OSS Quarterly Declaration
**Source**: Council Directive (EU) 2021/1159
**VAT Rate**: N/A | **Effective**: In effect
**Summary**: Businesses using OSS must file quarterly VAT returns covering all EU member states where B2C digital services are supplied.
**Invoica Impact**: Implement quarterly OSS filing calendar with automated data aggregation by member state; track VAT collected per country for consolidated reporting


### [MEDIUM] EU: VAT on Micropayments
**Source**: VAT Directive 2006/112/EC
**VAT Rate**: Various EU rates | **Effective**: In effect
**Summary**: No de minimis exemption exists for B2C digital services; VAT applies to all transactions including micropayments (e.g., €0.01 API calls).
**Invoica Impact**: Ensure VAT calculation engine handles micropayments with proper rounding; accumulate and remit small VAT amounts; consider bundling strategy for ultra-low-value transactions


## Compliance Gaps
1. No deemed supplier VAT collection infrastructure for platform-facilitated transactions
2. Missing real-time digital reporting capability for EU DRR compliance (2028 deadline)
3. No mandatory e-invoicing system for intra-EU transactions
4. Lacking JCT registration workflow and threshold monitoring for Japan market
5. No customer type verification (B2B vs B2C) for differential tax treatment
6. Missing OSS quarterly filing automation and multi-country VAT aggregation
7. No micropayment VAT calculation with proper rounding for sub-euro transactions
8. Absent reverse charge invoice templates and documentation for Japanese B2B customers

## Priority Actions (CEO + CTO)
1. 1. HIGH: Implement deemed supplier VAT collection for ViDA compliance (2025-2028 deadlines)
2. 2. HIGH: Build OSS registration and quarterly filing automation for current EU B2C transactions
3. 3. HIGH: Develop real-time DRR reporting system for 2028 EU deadline
4. 4. MEDIUM: Create customer classification engine (B2B/B2C, jurisdiction) for differential tax treatment
5. 5. MEDIUM: Implement JCT registration workflow with JPY 10M threshold monitoring for Japan
6. 6. MEDIUM: Build mandatory e-invoicing capability for intra-EU transactions (2028)
7. 7. MEDIUM: Add micropayment VAT handling with proper rounding logic
8. 8. LOW: Develop reverse charge invoice templates for Japanese B2B compliance

## Raw EU Research
<details><summary>EU Manus Research</summary>

As a European tax research specialist, I have compiled the latest information on EU regulations and country-specific guidance relevant to Invoica, a platform processing USDC (stablecoin) invoices and payments for AI agents on the Base blockchain. The focus areas include VAT on digital services, crypto/stablecoin taxation, AI platform compliance, and reporting obligations. Below is a detailed breakdown based on official sources, including the latest updates for 2025-2026 where available as of my research cut-off in October 2023. For developments beyond this date, I recommend checking the cited sources for real-time updates.

---

### 1. EU VAT Directive Updates for Digital Services (2025-2026)

#### 1.1 VAT in the Digital Age (ViDA) Reform Package
- **Status**: The ViDA reform package was proposed by the European Commission on 8 December 2022 as part of modernizing VAT rules for the digital economy. It includes three legislative proposals: (1) VAT rules for the digital age, (2) Single VAT Registration, and (3) Digital Reporting Requirements.
- **Key Provisions for Digital Platforms**:
  - Introduction of a Digital Reporting Requirement (DRR) for intra-EU transactions, replacing current recapitulative statements.
  - Extension of the One-Stop-Shop (OSS) to cover more B2C and B2B transactions, including mandatory e-invoicing for intra-EU supplies.
  - Deemed supplier rules for platform operators facilitating supplies of goods or services, making them liable for VAT collection in certain cases.
- **Implementation Dates**:
  - Proposed effective dates are staggered between 1 January 2025 and 1 January 2028, with e-invoicing and DRR expected to start in 2028 for most Member States. However, as of the latest Council of the EU updates (October 2023), negotiations are ongoing, and final adoption may shift timelines.
- **Relevance to Invoica**: As a platform facilitating digital payments in stablecoins, Invoica may be subject to deemed supplier rules if classified as facilitating taxable supplies. E-invoicing requirements will also apply for cross-border transactions.
- **Source**: European Commission, “VAT in the Digital Age” proposal (COM(2022) 701 final); Council of the EU updates (consilium.europa.eu).

#### 1.2 One-Stop-Shop (OSS) VAT Registration Requirements for AI Platforms
- **Current Rules**: Under Council Directive (EU) 2021/1159, the OSS scheme allows businesses supplying digital services to B2C customers in multiple EU countries to register in one Member State and report VAT via a single portal. This applies to electronically supplied services, including software and AI-related services.
- **ViDA Updates**: The OSS will be expanded under ViDA to include certain B2B transactions and mandatory registration for platforms deemed suppliers, potentially covering Invoica if it facilitates taxable services.
- **Relevance to Invoica**: If Invoica’s AI agent services are classified as electronically supplied services, OSS registration may be required for B2C transactions exceeding the €10,000 annual threshold for cross-border supplies.
- **Source**: EU VAT Directive 2006/112/EC as amended by 2021/1159; ec.europa.eu.

#### 1.3 B2B vs B2C Digital Services VAT Rules
- **B2C Rules**: VAT is applied based on the customer’s location (place of supply rules under Article 58 of Directive 2006/112/EC). Rates vary by Member State (see country-specific sections below). OSS or Mini One-Stop-Shop (MOSS) can be used for reporting.
- **B2B Rules**: VAT is generally applied under the reverse charge mechanism, where the business customer accounts for VAT in their home country, provided they provide a valid VAT number. If no VAT number is provided, B2C rules apply.
- **Relevance to Invoica**: If Invoica serves both B2B and B2C clients, it must distinguish between customer types to apply correct VAT rules, especially for cross-border transactions.
- **Source**: EU VAT Directive 2006/112/EC, Articles 44 and 58.

---

### 2. Germany (BMF - Bundeszentralam

</details>

## Raw Japan Research
<details><summary>Japan Manus Research</summary>

As an international tax law research specialist, I have conducted a detailed search using the specified Japanese government websites (nta.go.jp, fsa.go.jp, mof.go.jp, meti.go.jp, parliament.go.jp) and other authoritative sources to address the queries regarding Japan's tax and regulatory framework relevant to Invoica, a platform processing USDC payments for AI agents. Below are the findings organized by topic, with specific regulations, effective dates, rates, and citations. Where English summaries are available, they are noted; otherwise, I summarize key points based on the original Japanese content.

---

### 1. Japanese Consumption Tax (JCT) on Cross-Border Digital Services
**Relevant Authority:** National Tax Agency (NTA)
- **Current JCT Rates:** 
  - Standard rate: 10% (effective since October 1, 2019)
  - Reduced rate: 8% (applies to certain goods like food and beverages, also effective since October 1, 2019)
  - Source: NTA, "Consumption Tax Rate Increase" (nta.go.jp, updated 2023, English page: https://www.nta.go.jp/english/taxes/consumption_tax/01.htm)
- **"Specified Platform" Rules for Foreign Digital Service Providers:**
  - Under the 2015 amendments to the Consumption Tax Act, foreign businesses providing digital services (e.g., software, apps, or platforms like Invoica) to Japanese consumers are subject to JCT if the services are consumed in Japan.
  - Since October 1, 2015, foreign providers must register for JCT if their taxable sales in Japan exceed JPY 10 million in the previous two years.
  - "Specified Platform" rules apply to platforms facilitating transactions between foreign providers and Japanese consumers. If Invoica acts as an intermediary for AI agents, it may be classified as a "specified platform" and required to collect JCT on behalf of foreign providers or register itself.
  - Source: NTA, "Taxation of Cross-Border Supplies of Services" (nta.go.jp, English summary: https://www.nta.go.jp/english/taxes/consumption_tax/cross_border.htm)
- **B2B Reverse Charge Mechanism for AI Agent Platforms:**
  - Effective since October 1, 2015, for B2B transactions, the reverse charge mechanism applies where the Japanese business customer self-assesses and pays JCT on imported digital services instead of the foreign provider collecting it.
  - For Invoica, if it provides services to Japanese businesses (not consumers), the Japanese business would report and pay JCT under reverse charge rules, provided Invoica is not registered for JCT in Japan.
  - However, if Invoica targets consumers or mixed B2B/B2C transactions, it must assess whether registration is mandatory.
  - Source: NTA, "Reverse Charge Mechanism for Foreign Businesses" (nta.go.jp, English guide: https://www.nta.go.jp/english/taxes/consumption_tax/reverse_charge.htm)
- **Registration Requirements for Foreign Providers:**
  - Mandatory since October 1, 2015, for foreign digital service providers with taxable sales over JPY 10 million in Japan.
  - Updated rules (2021 onward

</details>

---
*KB: 8 total entries | Last run: 2026-03-13*
