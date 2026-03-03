# Changelog

All notable changes to Invoica are documented here.

## [1.7.0] — 2026-03-02

- Deployed multi-chain x402 architecture supporting Base, Polygon, and Solana with 9 new chain integration tasks (CHAIN-001 through CHAIN-009)
- Released 8 backend SDK enhancements including authentication, payment, and database improvements (AUTH-002, AUTH-003, PAY-001, PAY-002, PAY-003, DB-001)
- Added frontend dashboard enhancements for invoice management and company-scoped ledger views (FE-020, FE-021)
- Implemented autonomous CI/CD with git autodeploy (5-min polling), PM2 process watchdog, and Telegram alerts for infrastructure health
- Fixed orchestrator deliverables schema mismatch and added CEO owner directives pipeline for strategic execution
- Completed sprint 10 delivery: multi-chain infrastructure, autonomous post-sprint testing, and CMO content planning automation

## [1.6.0] — 2026-03-01

- Enabled autonomous post-sprint pipeline: test → CTO review → Vercel deploy without manual intervention
- Launched CMO weekly content plan generator with CEO approval gate and Sunday automation (06:00 UTC)
- Implemented live docs auto-generation system: changelog and API reference auto-update on every deploy
- Added institutional memory agent (memory-agent) — black box system for persistent knowledge retention
- Integrated Mission Control ops visibility platform for real-time agent monitoring and performance tracking
- Secured agent wallets: migrated hardcoded addresses to environment variables with X402_SELLER_WALLET support

## [1.5.0] — 2026-02-27

- Activated agent wallet spending with X402 payments — agents can now spend USDC on LLM calls via seller wallet configuration
- Added executive dashboard for CEO agent with real system context injection to eliminate hallucinations
- Implemented real execution tools for CEO bot: shell commands, file writes, GitHub issue creation, and live balance checks
- Launched Telegram support bot with MiniMax integration and live agent status monitoring
- Fixed TypeScript compilation pipeline with ecosystem GitHub Actions CI gate to prevent broken deployments
- Added legal pages (Terms of Service, Privacy Policy, Acceptable Use) and beta-mode UI across dashboard

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
