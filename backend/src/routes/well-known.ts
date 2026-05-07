// well-known.ts — SAP/x402 discovery manifest
// No auth required — public endpoint for agent auto-discovery
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/x402', (_req: Request, res: Response) => {
  const sellerWallet = process.env.X402_SOLANA_SELLER_WALLET || 'G21o7DdeBzqMDYswJzbsp2BZ6jGLxbvxDVvtmLvo4N8k';
  res.json({
    version: '1.0',
    agent: {
      name: 'Invoica',
      description: 'x402-native invoice middleware for AI agents — invoice, settle, and comply autonomously',
      wallet: sellerWallet,
      pda: process.env.SAP_AGENT_PDA || 'F7ZgQpK1yXahRrHav5DFfaibuMEcNHn8KVBHWWsKop7P'
    },
    // Standard x402 v2 endpoints (PayAI facilitator) — preferred for pay.sh-style discovery.
    x402Endpoints: {
      invoice: 'https://api.invoica.ai/api/x402/invoice',
      settle:  'https://api.invoica.ai/api/x402/settle',
      tax:     'https://api.invoica.ai/api/x402/tax'
    },
    facilitator: 'https://facilitator.payai.network',
    // Legacy custom-protocol endpoint kept for back-compat.
    x402Endpoint: 'https://api.invoica.ai/api/sap/execute',
    capabilities: [
      { id: 'payment:invoice', price: 0.01,  currency: 'USDC', description: 'Create an x402 invoice for a completed agent service' },
      { id: 'payment:settle',  price: 0.005, currency: 'USDC', description: 'Check on-chain settlement status for an invoice' },
      { id: 'compliance:tax',  price: 0.02,  currency: 'USDC', description: 'Tax classification — 27 EU countries + UK + 5 US states (CA, TX, NY, FL, WA)' }
    ],
    networks: ['solana-mainnet', 'base-mainnet', 'polygon-mainnet', 'arbitrum-mainnet', 'skale-base-mainnet'],
    programId: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ'
  });
});

export default router;