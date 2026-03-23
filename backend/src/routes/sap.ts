import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { getSapClient } from '../lib/sap-client';
import { logger } from '../lib/logger';

const router = Router();

// Validation schemas
const capabilityQuerySchema = z.object({
  capability: z.string().min(1, 'Capability parameter is required')
});

/**
 * GET /v1/sap/network
 * Returns SAP global registry statistics
 */
router.get('/network', async (req: Request, res: Response) => {
  try {
    logger.info('[sap-routes] method=GET path=/v1/sap/network');
    
    const sapClient = getSapClient();
    const networkOverview = await sapClient.discovery.getNetworkOverview();
    
    const response = {
      totalAgents: networkOverview.totalAgents,
      activeAgents: networkOverview.activeAgents,
      totalTools: networkOverview.totalTools,
      programId: process.env.SAP_PROGRAM_ID || 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ'
    };
    
    res.json(response);
  } catch (error) {
    logger.error('[sap-routes] Network overview error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch SAP network overview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /v1/sap/agents?capability=payment:invoice
 * Query SAP agents by capability
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const validation = capabilityQuerySchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors
      });
    }
    
    const { capability } = validation.data;
    
    logger.info(`[sap-routes] method=GET path=/v1/sap/agents capability=${capability}`);
    
    const sapClient = getSapClient();
    const agents = await sapClient.discovery.findAgentsByCapability(capability);
    
    // Limit to max 20 results
    const limitedAgents = agents.slice(0, 20);
    
    logger.info(`[sap-discovery] capability=${capability} found=${limitedAgents.length}`);
    
    const response = limitedAgents.map(agent => ({
      name: agent.name,
      walletAddress: agent.walletAddress,
      description: agent.description,
      capabilityDetails: agent.capabilityDetails
    }));
    
    res.json(response);
  } catch (error) {
    logger.error('[sap-routes] Agent discovery error:', error);
    res.status(500).json({ 
      error: 'Failed to discover SAP agents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /v1/sap/agents/me
 * Returns Invoica's own SAP profile
 */
router.get('/agents/me', async (req: Request, res: Response) => {
  try {
    logger.info('[sap-routes] method=GET path=/v1/sap/agents/me');
    
    const sapAgentPda = process.env.SAP_AGENT_PDA;
    
    if (!sapAgentPda) {
      return res.status(503).json({
        error: 'Invoica not yet registered on SAP'
      });
    }
    
    let agentPublicKey: PublicKey;
    try {
      agentPublicKey = new PublicKey(sapAgentPda);
    } catch (error) {
      logger.error('[sap-routes] Invalid SAP_AGENT_PDA format:', error);
      return res.status(500).json({
        error: 'Invalid SAP agent PDA configuration',
        message: 'SAP_AGENT_PDA is not a valid Solana public key'
      });
    }
    
    const sapClient = getSapClient();
    const agentProfile = await sapClient.discovery.getAgentProfile(agentPublicKey);
    
    const response = {
      credentialData: agentProfile.credentialData,
      capabilities: agentProfile.capabilities,
      stats: agentProfile.stats,
      agentPda: sapAgentPda
    };
    
    res.json(response);
  } catch (error) {
    logger.error('[sap-routes] Agent profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch SAP agent profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;