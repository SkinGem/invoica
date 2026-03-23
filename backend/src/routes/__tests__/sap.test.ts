import request from 'supertest';
import express from 'express';
import { PublicKey } from '@solana/web3.js';
import { getSapClient } from '../../lib/sap-client';
import { requireApiKey } from '../../middleware/auth';
import sapRoutes from '../sap';

jest.mock('../../lib/sap-client');
jest.mock('../../middleware/auth');

const mockGetSapClient = getSapClient as jest.MockedFunction<typeof getSapClient>;
const mockRequireApiKey = requireApiKey as jest.MockedFunction<typeof requireApiKey>;

const app = express();
app.use(express.json());
app.use('/v1/sap', mockRequireApiKey, sapRoutes);

describe('SAP Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireApiKey.mockImplementation((req, res, next) => next());
  });

  describe('GET /v1/sap/network', () => {
    it('should return network overview', async () => {
      const mockClient = {
        discovery: {
          getNetworkOverview: jest.fn().mockResolvedValue({
            totalAgents: 150,
            activeAgents: 120,
            totalTools: 45
          })
        }
      };
      mockGetSapClient.mockReturnValue(mockClient as any);

      const response = await request(app).get('/v1/sap/network');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalAgents: 150,
        activeAgents: 120,
        totalTools: 45,
        programId: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ'
      });
    });
  });

  describe('GET /v1/sap/agents', () => {
    it('should return agents by capability with 20 result limit', async () => {
      const mockAgents = Array.from({ length: 25 }, (_, i) => ({
        name: `Agent ${i}`,
        walletAddress: `wallet${i}`,
        description: `Description ${i}`
      }));
      
      const mockClient = {
        discovery: {
          findAgentsByCapability: jest.fn().mockResolvedValue(mockAgents)
        }
      };
      mockGetSapClient.mockReturnValue(mockClient as any);

      const response = await request(app)
        .get('/v1/sap/agents')
        .query({ capability: 'payment:invoice' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(20);
      expect(mockClient.discovery.findAgentsByCapability).toHaveBeenCalledWith('payment:invoice');
    });

    it('should return 400 without capability parameter', async () => {
      const response = await request(app).get('/v1/sap/agents');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /v1/sap/agents/me', () => {
    it('should return 503 when SAP_AGENT_PDA not set', async () => {
      delete process.env.SAP_AGENT_PDA;
      
      const response = await request(app).get('/v1/sap/agents/me');
      
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Invoica not yet registered on SAP');
    });

    it('should return agent profile when SAP_AGENT_PDA is set', async () => {
      process.env.SAP_AGENT_PDA = '11111111111111111111111111111112';
      
      const mockProfile = {
        credentialData: { name: 'Invoica' },
        capabilities: ['payment:invoice'],
        stats: { totalTransactions: 100 }
      };
      
      const mockClient = {
        discovery: {
          getAgentProfile: jest.fn().mockResolvedValue(mockProfile)
        }
      };
      mockGetSapClient.mockReturnValue(mockClient as any);

      const response = await request(app).get('/v1/sap/agents/me');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
    });
  });
});