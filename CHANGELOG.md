# Changelog

All notable changes to Invoica are documented here.

## [1.7.0] — 2026-03-05

- Shipped complexity-aware LLM routing with cost reduction optimization for agent inference
- Fixed Prisma enum crash by replacing with plain const objects in invoices module
- Implemented sustainable MiniMax pipeline with auto-skip cascades and truncation retry logic
- Added orchestrator poll-based backend readiness checks with 15s timeout for health validation
- Enhanced edge function health checks with increased 15s timeout for reliability
- Published auto-generated changelog and API reference (28 endpoints) with data-driven frontend pages

## [1.6.0] — 2026-03-01

- Launched autonomous post-sprint pipeline with test→CTO review→Vercel deployment automation
- Added CMO weekly content plan generator with CEO approval gating (Sunday 06:00 UTC cron)
- Implemented x-admin autonomous X posting agent with content calendar and CEO+CTO review gates
- Added PM2 service watchdog with Telegram alerts and pre-deploy TypeScript validation
- Integrated Mission Control for agent operations visibility and orchestrator state tracking
- Implemented git-autodeploy — server self-deploys from GitHub every 5 minutes

## [1.5.0] — 2026-02-27

- Added Telegram bot integration with CEO assistant and customer support capabilities
- Implemented x402 payment settlement with USDC batching (0.003 USDC pricing, flush every 50 calls or 5 min)
- Added GET /invoices/number/:number endpoint for invoice lookup by number
- Fixed invoices router with v1 routes and correct route ordering
- Implemented multi-RPC balance checking for wallet monitoring across multiple blockchain nodes
- Added real execution tools to CEO bot: run_shell, write_file, and create_github_issue

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
