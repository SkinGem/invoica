import request from "supertest";
import express from "express";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import router from "../public-mandates";

const app = express();
app.use(express.json());
app.use("/v1/public/mandates", router);

function mockSb(data: Record<string, unknown> | null, error: unknown = null) {
  const single = jest.fn().mockResolvedValue({ data, error });
  const eq = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  (createClient as jest.Mock).mockReturnValue({ from });
}

const FULL_MANDATE = {
  id: "test-uuid-1234",
  state: "signed_by_both",
  pact_mandate_hash: "0xabc123",
  anchor_tx_hash: "0xdef456",
  created_at: "2026-05-28T10:00:00.000Z",
  proposer_agent_id: "helixa-synagent",
  counterparty_agent_id: "invoica-core",
  signing_secret: "should-not-appear",
  customer_id: "internal-id-should-not-appear",
  signatures: { proposer: "sig1", counterparty: "sig2" },
  context: { raw: "payload-should-not-appear" },
};

describe("GET /v1/public/mandates/:id — redaction", () => {
  test("returns 200 with correct public fields", async () => {
    mockSb(FULL_MANDATE);
    const res = await request(app).get("/v1/public/mandates/test-uuid-1234");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("test-uuid-1234");
    expect(res.body.state).toBe("signed_by_both");
    expect(res.body.mandate_hash).toBe("0xabc123");
    expect(res.body.anchor_tx_hash).toBe("0xdef456");
    expect(res.body.created_at).toBeDefined();
  });

  test("parties array contains role+name only", async () => {
    mockSb(FULL_MANDATE);
    const res = await request(app).get("/v1/public/mandates/test-uuid-1234");
    expect(Array.isArray(res.body.parties)).toBe(true);
    expect(res.body.parties[0]).toHaveProperty("role");
    expect(res.body.parties[0]).toHaveProperty("name");
    expect(res.body.parties[0]).not.toHaveProperty("email");
  });

  test("does NOT expose signing_secret", async () => {
    mockSb(FULL_MANDATE);
    const res = await request(app).get("/v1/public/mandates/test-uuid-1234");
    expect(JSON.stringify(res.body)).not.toContain("signing_secret");
  });

  test("does NOT expose signatures", async () => {
    mockSb(FULL_MANDATE);
    const res = await request(app).get("/v1/public/mandates/test-uuid-1234");
    expect(res.body.signatures).toBeUndefined();
  });

  test("does NOT expose customer_id", async () => {
    mockSb(FULL_MANDATE);
    const res = await request(app).get("/v1/public/mandates/test-uuid-1234");
    expect(JSON.stringify(res.body)).not.toContain("customer_id");
  });

  test("does NOT expose context payload", async () => {
    mockSb(FULL_MANDATE);
    const res = await request(app).get("/v1/public/mandates/test-uuid-1234");
    expect(res.body.context).toBeUndefined();
  });

  test("returns 404 when mandate not found", async () => {
    mockSb(null, { message: "not found" });
    const res = await request(app).get("/v1/public/mandates/nonexistent");
    expect(res.status).toBe(404);
  });
});
