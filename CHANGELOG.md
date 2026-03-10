# Changelog

All notable changes to Invoica are documented here.

## [1.10.0] — 2026-03-09

- Completed @invoica/sdk TypeScript package with npm publish workflow and GitHub OIDC authentication
- Fixed critical API issues: api-key routes, Supabase persistence, webhook delivery, and invoice SQL queries
- Deployed CEOBot iteration cap optimization (25→8 iterations) with improved model routing and context management
- Integrated X algorithm posting guidelines into CMO weekly plan generation for better engagement
- Added FORCE_SLOT override and hardened CMO no-roadmap guardrails in x-admin agent
- Published invoica-mcp Model Context Protocol server for Claude integration with invoice operations

## [1.9.0] — 2026-03-05

- Introduced X DM outreach automation with personalization via Claude and state deduplication
- Added TypeScript syntax validation gate with tsc checks before supervisor review and commit
- Implemented landing page narrative overhaul with Public Beta badge and owner-direct governance
- Deployed complexity-aware task routing with CEO cost reduction via MiniMax for simpler tasks
- Added edge function health check with 15-second timeout for improved reliability
- Established sustainable MiniMax pipeline with auto-skip cascades and transitive dependency resolution

## [1.8.0] — 2026-03-02

- Released Mission Control dashboard for real-time agent operations visibility and orchestration
- Deployed live documentation auto-generation system with data-driven changelog and API reference
- Implemented multi-chain x402 settlement infrastructure with batched USDC processing (50-call batches or 5-min flush)
- Added complexity-aware LLM routing for cost optimization — new files to Claude Sonnet, edits to MiniMax
- Integrated invoices router with corrected v1 API routes and proper route ordering
- Established PM2 ecosystem with self-healing CEO bot, isolated from backend restarts

## [1.7.0] — 2026-03-01

- Activated x402 agent wallet spending — agents now spend USDC on LLM calls with MiniMax model optimization
- Implemented autonomous post-sprint pipeline with test execution, CTO review, and Vercel auto-deployment
- Added CMO Sunday weekly content plan generator with CEO approval workflow
- Deployed git auto-deploy system with 5-minute GitHub polling for continuous deployment
- Integrated Telegram bot with full team coordination tools (/report, /pm2, /health, /sprint commands)
- Established memory-agent black box system for institutional knowledge persistence across agent runs

## [1.6.0] — 2026-02-28

- Launched autonomous X (Twitter) posting agent with CEO and CTO review gates
- Added email support monitoring via support@invoica.ai with IMAP/SMTP integration
- Implemented PM2 process watchdog with Telegram alerting for service health
- Added /pull and /sprint commands to CEO bot for sprint management
- Deployed pre-deploy TypeScript validation gate before all production changes
- Hardened security by removing hardcoded wallet addresses and loading from environment variables

## [1.5.0] — 2026-02-27

- Added Telegram bot integration with CEO assistant and customer support channels
- Implemented real API keys management page with full CRUD operations
- Added system status monitoring pages for dashboard and public website
- Introduced self-service signup and onboarding flow with company profile verification
- Integrated Stripe billing system with usage analytics tracking
- Added support ticket system powered by Supabase backend

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
