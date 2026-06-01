#!/usr/bin/env ts-node
// AIAX MCP smoke test — run against a live environment.
// Usage: INVOICA_API_URL=https://api.invoica.ai npx ts-node scripts/aiax-mcp-smoke.ts [mandate_id]
// Exits non-zero on any failure.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const BASE = process.env.INVOICA_API_URL ?? "https://api.invoica.ai";
const MCP_URL = `${BASE}/aiax/mcp`;
const MANDATE_ID = process.argv[2] ?? "test-mandate-id";

async function main(): Promise<void> {
  console.log(`[smoke] connecting to ${MCP_URL}`);
  const client = new Client({ name: "aiax-smoke", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);

  // 1. List tools — expect exactly 6
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  console.log(`[smoke] tools (${tools.length}):`, names.join(", "));
  const EXPECTED = [
    "invoica_create_invoice",
    "invoica_dispute_open",
    "invoica_get_pricing",
    "invoica_get_trust_signals",
    "invoica_query_mandate",
    "invoica_settle_invoice",
  ];
  for (const name of EXPECTED) {
    if (!names.includes(name)) throw new Error(`Missing tool: ${name}`);
  }
  if (tools.length !== 6) throw new Error(`Expected 6 tools, got ${tools.length}`);
  console.log("[smoke] tools OK");

  // 2. invoica_get_pricing
  const pricing = await client.callTool({ name: "invoica_get_pricing", arguments: {} });
  if (pricing.isError) throw new Error(`invoica_get_pricing error: ${JSON.stringify(pricing.content)}`);
  const pricingText = (pricing.content[0] as { text: string }).text;
  const pricingData = JSON.parse(pricingText);
  if (pricingData.section_id !== "pricing") throw new Error("pricing.section_id mismatch");
  console.log("[smoke] invoica_get_pricing OK — section_id:", pricingData.section_id);

  // 3. invoica_query_mandate
  const mandate = await client.callTool({
    name: "invoica_query_mandate",
    arguments: { mandate_id: MANDATE_ID },
  });
  if (mandate.isError) {
    // 404 is acceptable for a smoke test with a fake mandate id
    const text = (mandate.content[0] as { text: string }).text ?? "";
    if (!text.includes("404") && !text.includes("not_found")) {
      throw new Error(`invoica_query_mandate unexpected error: ${text}`);
    }
    console.log("[smoke] invoica_query_mandate returned 404 (expected for fake id) OK");
  } else {
    const mandateData = JSON.parse((mandate.content[0] as { text: string }).text);
    if (!mandateData.id) throw new Error("mandate response missing id");
    console.log("[smoke] invoica_query_mandate OK — state:", mandateData.state);
  }

  await client.close();
  console.log("[smoke] all checks passed");
}

main().catch((e) => { console.error("[smoke] FAILED:", e.message); process.exit(1); });
