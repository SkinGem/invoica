import request from "supertest";
import express from "express";
import * as path from "path";
import * as fs from "fs";

jest.mock("../../lib/prisma", () => ({ prisma: {}, default: {} }));
jest.mock("../../lib/redis", () => ({ redis: {}, default: {} }));

import aiaxRouter from "../static-server";

const app = express();
app.use("/aiax", aiaxRouter);

const PUBLIC_DIR = path.join(__dirname, "../../../public");

describe("AIAX manifest (Tier 0)", () => {
  test("GET /aiax/manifest.json returns 200", async () => {
    const res = await request(app).get("/aiax/manifest.json");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  test("manifest contains aiax_version 0.1", async () => {
    const res = await request(app).get("/aiax/manifest.json");
    expect(res.body.aiax_version).toBe("0.1");
  });

  test("manifest contains all 6 section ids", async () => {
    const res = await request(app).get("/aiax/manifest.json");
    const ids = res.body.sections.map((s: { id: string }) => s.id);
    for (const id of ["create_invoice", "settle_invoice", "query_mandate", "dispute_flow", "pricing", "trust_signals"]) {
      expect(ids).toContain(id);
    }
  });

  test("GET /aiax/manifest.json includes Cache-Control header", async () => {
    const res = await request(app).get("/aiax/manifest.json");
    expect(res.headers["cache-control"]).toMatch(/public/);
    expect(res.headers["cache-control"]).toMatch(/max-age/);
  });

  test("GET /aiax/manifest.json includes non-empty ETag header", async () => {
    const res = await request(app).get("/aiax/manifest.json");
    expect(res.headers["etag"]).toBeTruthy();
  });

  test("manifest.json file on disk is valid JSON", () => {
    const p = path.join(PUBLIC_DIR, ".well-known", "aiax.json");
    expect(() => JSON.parse(fs.readFileSync(p, "utf-8"))).not.toThrow();
  });
});
