import request from "supertest";
import express from "express";

jest.mock("../../lib/prisma", () => ({ prisma: {}, default: {} }));
jest.mock("../../lib/redis", () => ({ redis: {}, default: {} }));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { createAiaxMcpRouter } from "../mcp-server";

const app = express();
app.use(express.json());
app.use("/aiax/mcp", createAiaxMcpRouter());

// MCP Streamable HTTP returns text/event-stream SSE responses.
// Parse the first "data:" line to extract the JSON-RPC payload.
function parseSse(text: string): unknown {
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      return JSON.parse(line.slice(6));
    }
  }
  throw new Error(`No SSE data line found in: ${text.slice(0, 200)}`);
}

const MCP_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/event-stream",
};

function mockFetchOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

const PRICING_FIXTURE = {
  section_id: "pricing",
  version: "0.1",
  model: "x402_micropayment_plus_api_key",
  tiers: [],
  tools: [{ name: "invoica_get_pricing" }],
  examples: [],
};

describe("AIAX HTTP MCP server", () => {
  beforeEach(() => jest.clearAllMocks());

  test("tools/list returns exactly 6 tools", async () => {
    const res = await request(app)
      .post("/aiax/mcp")
      .set(MCP_HEADERS)
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    expect(res.status).toBe(200);
    const payload = parseSse(res.text) as { result: { tools: Array<{ name: string }> } };
    const tools = payload.result?.tools ?? [];
    expect(tools).toHaveLength(6);
    const names = tools.map((t) => t.name).sort();
    expect(names).toContain("invoica_create_invoice");
    expect(names).toContain("invoica_settle_invoice");
    expect(names).toContain("invoica_query_mandate");
    expect(names).toContain("invoica_dispute_open");
    expect(names).toContain("invoica_get_pricing");
    expect(names).toContain("invoica_get_trust_signals");
  });

  test("invoica_get_pricing returns spec-shaped response", async () => {
    mockFetchOk(PRICING_FIXTURE);
    const res = await request(app)
      .post("/aiax/mcp")
      .set(MCP_HEADERS)
      .send({
        jsonrpc: "2.0", id: 2, method: "tools/call",
        params: { name: "invoica_get_pricing", arguments: {} },
      });
    expect(res.status).toBe(200);
    const payload = parseSse(res.text) as { result: { content: Array<{ type: string; text: string }> } };
    const content = payload.result?.content?.[0];
    expect(content?.type).toBe("text");
    const data = JSON.parse(content.text);
    expect(data.section_id).toBe("pricing");
    expect(data.model).toBe("x402_micropayment_plus_api_key");
  });

  test("invoica_query_mandate passes mandate_id in URL", async () => {
    const mandateFixture = {
      id: "test-id",
      state: "signed_by_both",
      mandate_hash: "0xabc",
      anchor_tx_hash: null,
      created_at: "2026-06-01T00:00:00.000Z",
      parties: [{ role: "proposer", name: "a" }, { role: "counterparty", name: "b" }],
    };
    mockFetchOk(mandateFixture);
    const res = await request(app)
      .post("/aiax/mcp")
      .set(MCP_HEADERS)
      .send({
        jsonrpc: "2.0", id: 3, method: "tools/call",
        params: { name: "invoica_query_mandate", arguments: { mandate_id: "test-id" } },
      });
    expect(res.status).toBe(200);
    const callUrl = (mockFetch.mock.calls[0] as [string])[0];
    expect(callUrl).toContain("test-id");
    const payload = parseSse(res.text) as { result: { content: Array<{ type: string; text: string }> } };
    const content = payload.result?.content?.[0];
    const data = JSON.parse(content.text);
    expect(data.state).toBe("signed_by_both");
  });
});
