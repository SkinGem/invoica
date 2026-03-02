# Changelog

All notable changes to Invoica are documented here.

## [1.7.0] — 2026-03-02

- Expand x402 to multi-chain architecture — support Base, Polygon, and Solana with CHAIN-001 through CHAIN-009 endpoints
- Add institutional memory system (memory-agent) — black box persistent context for CEO and agent teams across sessions
- Implement live docs auto-generation system — auto-update CHANGELOG.md and API reference from git commits daily
- Launch advanced SDK features (SDK-060a through SDK-062) — enhanced wallet integration, batch operations, and streaming support
- Add heartbeat watchdog with 6-hour Telegram summaries and dead-man's switch — detects PM2 process gaps and agent offline states

## [1.6.0] — 2026-02-28

- Implement autonomous post-sprint CI/CD pipeline — auto-trigger tests, CTO review, and Vercel deploy after each sprint
- Add CMO weekly content plan generator with CEO approval gate — Sunday 06:00 UTC recurring task via PM2
- Launch Mission Control integration for real-time agent operations visibility and monitoring
- Add sprint-runner PM2 cron — closes CEO↔execution loop by auto-triggering sprints and post-sprint pipelines
- Strengthen pre-deploy TypeScript validation gate — catches missing files, type errors, and TS syntax issues before production

## [1.5.0] — 2026-02-27

- Launch x402 agent wallet spending — agents can now spend USDC on LLM calls with configurable seller wallet
- Add Telegram CEO bot with real execution tools — /report, /sprint, /pull commands + shell execution and GitHub issue creation
- Implement multi-RPC balance checking for agent wallets — prevents false zero balances across network nodes
- Add CTO email support monitoring via IMAP/SMTP — support@invoica.ai now routes to CTO agent for real-time response
- Launch autonomous X posting agent (@invoica_ai) with CEO + CTO review gates before publishing content

## [1.4.0] — 2026-02-20

- New Web3 Growth plan at $24/mo with 5,000 invoices and 25,000 API calls
- Web3 projects see tailored pricing during onboarding
- Registered companies see Free + Pro ($49) + Enterprise tiers
- Added Plans & Pricing documentation page

## [1.3.0] — 2026-02-16

- Added backend API routes for invoices, API keys, webhooks, and settlements
- Added Express app entry point with middleware stack
- Completed SDK test coverage for retry, debug, and client-config modules

## [1.2.0] — 2026-02-15

- Fixed SDK import chain — all modules now use v2 transport and error handling
- Added SDK tests for pagination, events, and timeout modules
- New documentation pages: error handling, environments, quickstart

## [1.1.0] — 2026-02-14

- SDK consolidation — barrel exports, interceptors, environment detection
- New tests for rate-limit, error-compat, and request-builder
- Added webhook events and quickstart documentation

## [1.0.0] — 2026-02-13

- Initial release of Invoica TypeScript SDK
- Core client with invoice, settlement, and API key management
- Webhook signature verification and rate limiting
