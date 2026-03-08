# Changelog

All notable changes to Invoica are documented here.

## [1.7.0] — 2026-03-07

- Hardened agent orchestration with TypeScript syntax gate before supervisor review
- Implemented multi-chain architecture supporting Base, Polygon, and Solana with unified settlement
- Added complexity-aware LLM routing to reduce CEO token spend by 40% while maintaining quality
- Enhanced orchestrator with deliverable file verification in git and path normalization
- Fixed agent memory protocol to prevent hallucination and ensure consistent {tasks:[]} format across all pipelines
- Added PM2 process watchdog with restart limits and Telegram alerts for system stability

## [1.6.0] — 2026-03-01

- Launched post-sprint automation pipeline: test → CTO review → Vercel deploy with no manual intervention
- Added autonomous CMO weekly content plan generator with Sunday scheduling and CEO approval gates
- Implemented agent wallet spending on USDC for LLM calls with configurable settlement batching
- Added git-autodeploy system — server self-deploys from GitHub every 5 minutes with crash recovery
- Implemented live docs auto-generation system with weekly changelog and API reference updates
- Added Telegram bot with real execution tools: /run shell commands, /write files, create GitHub issues

## [1.5.0] — 2026-02-27

- Added agent memory protocol — all 37 agents now write back to long-term memory after every sprint
- Implemented x402 payment settlement with USDC pricing (0.003 USDC per call) and batched queue processing
- Added autonomous X posting agent (@invoica_ai) with CEO/CTO review gates and content calendar
- Implemented Mission Control integration for real-time agent operations visibility
- Added Telegram support bot with /report, /pm2, /health, /sprint commands for ops monitoring

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
