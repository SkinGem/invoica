# Changelog

All notable changes to Invoica are documented here.

## [1.7.0] — 2026-03-06

- Implemented complexity-aware LLM routing with CEO cost reduction and model selection optimization
- Added sustainable MiniMax pipeline with auto-skip cascades and transitive dependency resolution
- Fixed heartbeat edge function health checks with increased 15s timeout for reliability
- Introduced orchestrator poll-based backend readiness detection after PM2 reload
- Enhanced invoices router with Prisma enum replacement using plain const objects to prevent crashes
- Added agent autonomy improvements including self-healing capabilities and post-sprint smoke testing

## [1.6.0] — 2026-03-01

- Implemented autonomous post-sprint CI/CD pipeline with automated testing and Vercel deployment
- Added CMO weekly content plan generator with CEO approval gate and Sunday scheduling
- Introduced agent wallet spending for x402 USDC-based LLM inference cost management
- Added Mission Control dashboard for real-time agent operations visibility and orchestration
- Implemented live documentation auto-generation system with data-driven changelog and API reference
- Added institutional memory system for autonomous agent knowledge persistence

## [1.5.0] — 2026-02-27

- Added real API keys management page with full CRUD operations for dashboard
- Implemented x402 payment integration with 0.003 USDC per-call pricing and batched settlement queue
- Added multi-chain support for Base, Polygon, and Solana blockchain networks
- Fixed invoice router with v1 routes and correct route ordering for reliable endpoint access
- Launched Telegram support bot integration with CEO assistant and customer support channels
- Added company profile with registry verification across 12 countries during onboarding

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
