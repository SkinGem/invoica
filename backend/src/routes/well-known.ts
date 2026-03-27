// well-known.ts — SAP/x402 discovery manifest
// No auth required — public endpoint for agent auto-discovery
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/x402', (_req: Request, res: Response) => {
  res.json({
    version: '1.0',
    agent: {
      name: 'Invoica',
      description: 'x402-native invoice middleware for AI agents — invoice, settle, and comply autonomously',
      wallet: process.env.INVOICA_AGENT_WALLET || '26z3UHjGbF2LKbgS2r34BSzBH3DBBoLofF1c2EvaEwWQ',
      pda: process.env.SAP_AGENT_PDA || 'F7ZgQpK1yXahRrHav5DFfaibuMEcNHn8KVBHWWsKop7P'
    },
    x402Endpoint: 'https://api.invoica.ai/api/sap/execute',
    capabilities: [
      { id: 'payment:invoice', price: 0.01, currency: 'USDC', description: 'Create an x402 invoice for a completed agent service' },
      { id: 'payment:settle', price: 0.005, currency: 'USDC', description: 'Check on-chain settlement status for an invoice' },
      { id: 'compliance:tax', price: 0.02, currency: 'USDC', description: '12-country tax classification and compliance report' }
    ],
    networks: ['solana-mainnet'],
    programId: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ'
  });
});

export default router;