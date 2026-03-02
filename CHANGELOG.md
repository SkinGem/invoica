# Changelog

All notable changes to Invoica are documented here.

## [1.5.0] — 2026-03-02

- Added x402 agent wallet spending — agents can now autonomously spend USDC on LLM calls with X402_SELLER_WALLET configuration
- Implemented multichain x402 expansion with standing sprint priority for broader payment network support
- Released SDK-060 through SDK-062 enhancements for improved TypeScript SDK compatibility and type safety
- Added AUTH-002 and AUTH-003 authentication improvements for enhanced security
- Deployed PAY-001, PAY-002, PAY-003 payment processing features for invoice settlements
- Fixed critical backend startup issue with missing invoiceEvents and Supabase stubs

## [1.6.0] — 2026-03-01

- Launched autonomous agent framework with Mission Control integration for real-time ops visibility and CEO review gates
- Implemented memory-agent black box system for institutional knowledge retention across autonomous operations
- Added live docs auto-generation system to keep API documentation in sync with codebase changes
- Enabled event-driven CEO review + sprint trigger mechanism for autonomous decision-making with human oversight
- Deployed multi-agent autonomous pipeline: post-sprint test→CTO review→Vercel deploy cycle
- Activated git-autodeploy server self-deployment from GitHub (5-minute polling cycle)

## [1.7.0] — 2026-02-28

- Released CEO bot with real execution tools: /sprint command, /pull updates, git operations, and GitHub issue creation
- Implemented Telegram bot suite with /report, /pm2, /health, /sprint commands for team coordination and system monitoring
- Added x-admin autonomous X posting agent with CEO + CTO review gates and content calendar management
- Deployed heartbeat watchdog system with 6-hour Telegram summaries and PM2 dead-man switch health checks
- Enhanced ceoBot with multi-RPC USDC balance checking and wallet alert deduplication to prevent spam
- Fixed backend critical crash loop by adding lib/prisma.ts and backend-wrapper.sh PM2 entry point

## [1.8.0] — 2026-02-27

- Launched Invoica Ledger page for company-scoped transaction tracking with email verification
- Added CTO email support monitoring script (cto-email-support) for support@invoica.ai IMAP/SMTP integration
- Deployed real API keys page with TypeScript SDK build and proper authentication flows
- Fixed mixed content issues via Next.js rewrites and web3 no-email beta bypass for improved accessibility
- Implemented full CRUD webhooks management dashboard — add, delete, and toggle webhook endpoints
- Added Telegram deep link support detection for mobile (tg://) and desktop (web.telegram.org) environments

## [1.9.0] — 2026-02-26

- Launched beta mode infrastructure with BetaBanner replacing pricing CTAs across homepage and dashboard
- Deployed Telegram support card integration with live support button on dashboard help section
- Added comprehensive TypeScript strict mode fixes across middleware, routes, and SDK modules for production stability
- Implemented Conway governance layer v2.0 with mandatory CEO deployment rules and sprint launch protocols via GitHub milestones
- Enhanced CTO daily scan and cto-email-support PM2 jobs with full email support monitoring capabilities
- Fixed Supabase, Redis, viem, and Prisma type compatibility issues across inference and middleware layers

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
