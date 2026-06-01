import request from "supertest";
import express from "express";

jest.mock("../../lib/prisma", () => ({ prisma: {}, default: {} }));
jest.mock("../../lib/redis", () => ({ redis: {}, default: {} }));

import aiaxRouter from "../static-server";

const app = express();
app.use("/aiax", aiaxRouter);

const ENDPOINTS = [
  "/aiax/manifest.json",
  "/aiax/sections/create_invoice.json",
  "/aiax/reference/index.json",
];

describe("AIAX static response headers", () => {
  test.each(ENDPOINTS)("%s — Cache-Control: public, max-age=300", async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toMatch(/public/);
    expect(res.headers["cache-control"]).toMatch(/max-age=300/);
  });

  test.each(ENDPOINTS)("%s — ETag is present and non-empty", async (url) => {
    const res = await request(app).get(url);
    expect(res.headers["etag"]).toBeTruthy();
    expect(res.headers["etag"].length).toBeGreaterThan(0);
  });

  test("304 returned when If-None-Match matches ETag", async () => {
    const first = await request(app).get("/aiax/manifest.json");
    const etag = first.headers["etag"];
    const second = await request(app)
      .get("/aiax/manifest.json")
      .set("If-None-Match", etag);
    expect(second.status).toBe(304);
  });
});
