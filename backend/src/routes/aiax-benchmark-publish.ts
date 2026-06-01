// POST /aiax/benchmark/publish — admin-gated endpoint for the Kognai benchmark harness.
// Writes benchmark.json to disk and fires aiax.benchmark.published webhook.
// Auth: x-admin-key header must match ADMIN_API_KEY env var.
import { Router, type Request, type Response, type NextFunction } from "express";
import * as fs from "fs";
import * as path from "path";
import { createWebhookEvent } from "../services/webhook/events";
import { dispatch } from "../services/webhook/dispatch";
import { WebhookRepository } from "../services/webhook/types";

const BENCHMARK_PATH = path.join(__dirname, "../../public/aiax/benchmark.json");

let _repo: WebhookRepository | null = null;
function getRepo(): WebhookRepository {
  if (!_repo) {
    // Import lazily to avoid circular deps / heavy boot cost on startup
    const { createWebhookRepository } = require("../services/webhook/repository");
    _repo = createWebhookRepository();
  }
  return _repo;
}

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-key"];
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || key !== expected) {
    res.status(401).json({ success: false, error: { code: "unauthorized", message: "Invalid admin key" } });
    return;
  }
  next();
}

const router = Router();

router.post("/", adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({ success: false, error: { code: "invalid_body", message: "JSON body required" } });
      return;
    }
    // Validate required top-level fields
    if (typeof payload.summary?.median_atrr !== "number") {
      res.status(400).json({ success: false, error: { code: "missing_field", message: "summary.median_atrr (number) is required" } });
      return;
    }

    const published_at = new Date().toISOString();
    const doc = { ...payload, published_at };
    fs.mkdirSync(path.dirname(BENCHMARK_PATH), { recursive: true });
    fs.writeFileSync(BENCHMARK_PATH, JSON.stringify(doc, null, 2));

    // Fire webhook — registered + wired + fires in same PR (anti-phantom-events)
    const event = createWebhookEvent("aiax.benchmark.published", {
      published_at,
      median_atrr: payload.summary.median_atrr,
      raw_logs_url: payload.reproducibility?.raw_logs_url ?? null,
    });
    dispatch(event, getRepo()).catch((e) =>
      console.error("[aiax-benchmark-publish] webhook dispatch failed:", e),
    );

    res.json({ success: true, published_at });
  } catch (e) { next(e); }
});

export default router;
