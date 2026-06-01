import request from "supertest";
import express from "express";
import * as path from "path";
import * as fs from "fs";

jest.mock("../../lib/prisma", () => ({ prisma: {}, default: {} }));
jest.mock("../../lib/redis", () => ({ redis: {}, default: {} }));

import aiaxRouter from "../static-server";

const app = express();
app.use("/aiax", aiaxRouter);

const SECTIONS = ["create_invoice", "settle_invoice", "query_mandate", "dispute_flow", "pricing", "trust_signals"];
const SECTIONS_DIR = path.join(__dirname, "../../../public/aiax");

describe("AIAX Tier 1 section files", () => {
  test.each(SECTIONS)("GET /aiax/%s.json returns 200", async (name) => {
    const res = await request(app).get(`/aiax/${name}.json`);
    expect(res.status).toBe(200);
  });

  test.each(SECTIONS)("%s.json has Cache-Control: public + ETag", async (name) => {
    const res = await request(app).get(`/aiax/${name}.json`);
    expect(res.headers["cache-control"]).toMatch(/public/);
    expect(res.headers["etag"]).toBeTruthy();
  });

  test.each(SECTIONS)("%s.json has correct section_id", async (name) => {
    const res = await request(app).get(`/aiax/${name}.json`);
    expect(res.body.section_id).toBe(name);
  });

  test.each(SECTIONS)("%s.json file on disk is valid JSON", (name) => {
    const p = path.join(SECTIONS_DIR, `${name}.json`);
    expect(() => JSON.parse(fs.readFileSync(p, "utf-8"))).not.toThrow();
  });

  test.each(SECTIONS)("%s.json has tools array with at least one entry", async (name) => {
    const res = await request(app).get(`/aiax/${name}.json`);
    expect(Array.isArray(res.body.tools)).toBe(true);
    expect(res.body.tools.length).toBeGreaterThan(0);
  });

  test("GET /aiax/nonexistent.json returns 404", async () => {
    const res = await request(app).get("/aiax/nonexistent.json");
    expect(res.status).toBe(404);
  });
});
