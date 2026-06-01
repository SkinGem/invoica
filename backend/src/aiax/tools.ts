// AIAX MCP tool handlers — 6 tools wrapping the Invoica AIAX surface.
// All tools are stateless: no session state, no DB access.
// x402 tools pass the X-PAYMENT header through from the MCP caller.
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const API_BASE = process.env.INVOICA_API_URL ?? "https://api.invoica.ai";

function ok(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}
function err(msg: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: msg }] };
}
async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  const body = await res.json() as unknown;
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

export async function createInvoice(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const payment = args.x_payment as string | undefined;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (payment) headers["X-PAYMENT"] = payment;
    const data = await fetchJson(`${API_BASE}/api/x402/invoice`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        issuer:      args.issuer,
        recipient:   args.recipient,
        email:       args.email,
        amount:      args.amount,
        currency:    args.currency ?? "USDC",
        description: args.description,
      }),
    });
    return ok(JSON.stringify(data, null, 2));
  } catch (e) { return err(String(e)); }
}

export async function settleInvoice(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const payment = args.x_payment as string | undefined;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (payment) headers["X-PAYMENT"] = payment;
    const data = await fetchJson(`${API_BASE}/api/x402/settle`, {
      method: "POST",
      headers,
      body: JSON.stringify({ invoiceId: args.invoice_id }),
    });
    return ok(JSON.stringify(data, null, 2));
  } catch (e) { return err(String(e)); }
}

export async function queryMandate(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const data = await fetchJson(`${API_BASE}/v1/public/mandates/${args.mandate_id}`, {
      method: "GET",
    });
    return ok(JSON.stringify(data, null, 2));
  } catch (e) { return err(String(e)); }
}

export async function disputeOpen(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const apiKey = args.api_key as string | undefined;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;
    const data = await fetchJson(`${API_BASE}/v1/mandates/${args.mandate_id}/dispute`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: args.reason }),
    });
    return ok(JSON.stringify(data, null, 2));
  } catch (e) { return err(String(e)); }
}

export async function getPricing(_args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const data = await fetchJson(`${API_BASE}/aiax/pricing.json`, { method: "GET" });
    return ok(JSON.stringify(data, null, 2));
  } catch (e) { return err(String(e)); }
}

export async function getTrustSignals(_args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const data = await fetchJson(`${API_BASE}/aiax/trust_signals.json`, { method: "GET" });
    return ok(JSON.stringify(data, null, 2));
  } catch (e) { return err(String(e)); }
}
