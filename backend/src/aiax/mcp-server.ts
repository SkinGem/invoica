// AIAX HTTP MCP server — POST /aiax/mcp
// Uses StreamableHTTP transport (stateless mode — no session IDs).
// Coexists with backend/src/mcp/invoica-mcp-server.ts (stdio, Claude Desktop).
// DO NOT merge these two; they serve different clients and auth models.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  createInvoice,
  settleInvoice,
  queryMandate,
  disputeOpen,
  getPricing,
  getTrustSignals,
} from "./tools";

export function createAiaxMcpRouter(): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return router;
}

function buildServer(): McpServer {
  const server = new McpServer({ name: "invoica-aiax", version: "0.1.0" });

  server.tool(
    "invoica_create_invoice",
    "Create a machine-payable invoice via x402 (0.01 USDC on Solana). Pass x_payment header for the x402 proof.",
    {
      issuer:      z.string().describe("Seller name or agent id"),
      recipient:   z.string().optional().describe("Buyer name or agent id"),
      email:       z.string().email().optional().describe("Buyer email"),
      amount:      z.number().positive().optional().describe("Invoice amount (default 0.01)"),
      currency:    z.string().optional().default("USDC"),
      description: z.string().optional(),
      x_payment:   z.string().optional().describe("Base64 x402 payment proof"),
    },
    async (args) => createInvoice(args as Record<string, unknown>),
  );

  server.tool(
    "invoica_settle_invoice",
    "Check settlement state of an invoice via x402 (0.005 USDC). Pass invoice_id and x_payment.",
    {
      invoice_id: z.string().uuid().describe("Invoice UUID"),
      x_payment:  z.string().optional().describe("Base64 x402 payment proof"),
    },
    async (args) => settleInvoice(args as Record<string, unknown>),
  );

  server.tool(
    "invoica_query_mandate",
    "Fetch the public redacted view of a PACT mandate (no auth required). Returns state, hashes, party names.",
    {
      mandate_id: z.string().describe("Mandate UUID"),
    },
    async (args) => queryMandate(args as Record<string, unknown>),
  );

  server.tool(
    "invoica_dispute_open",
    "Open a dispute on a PACT mandate (requires api_key). Mandate must be in signed_by_both or in_progress state.",
    {
      mandate_id: z.string().describe("Mandate UUID"),
      reason:     z.string().min(10).describe("Human-readable dispute reason"),
      api_key:    z.string().describe("Invoica API key (x-api-key)"),
    },
    async (args) => disputeOpen(args as Record<string, unknown>),
  );

  server.tool(
    "invoica_get_pricing",
    "Fetch the current Invoica pricing schedule for all capabilities (x402 + API key tiers).",
    {},
    async (args) => getPricing(args as Record<string, unknown>),
  );

  server.tool(
    "invoica_get_trust_signals",
    "Fetch live trust signals: DRS receipt count, mandates anchored, invoices settled, partnerships. Rebuilt nightly.",
    {},
    async (args) => getTrustSignals(args as Record<string, unknown>),
  );

  return server;
}
