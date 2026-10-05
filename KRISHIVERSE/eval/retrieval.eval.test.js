/**
 * eval/retrieval.eval.test.js — Phase 3B deterministic retrieval benchmark.
 *
 * Index: the 13 REAL curated seed records (never synthetic, never invented).
 * Cases: eval/cases.retrieval.js (screening-only, NOT ground truth).
 * Metrics: Recall@1/3/5, MRR — overall, per language (en/ta/tanglish/hi),
 * per topic. Writes eval/results/retrieval.json. Report-only.
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { buildInvertedIndex, fastSearch, resetIndex } from "../src/services/ai/AgriculturalNLP.js";
import { CROPS } from "../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../src/data/seed/treatmentData.js";
import { RETRIEVAL_CASES } from "./cases.retrieval.js";

function rankOf(ids, wanted, acceptable = []) {
  const targets = new Set([...wanted, ...acceptable]);
  for (let i = 0; i < ids.length; i++) {
    if (targets.has(ids[i])) return i + 1;
  }
  return null;
}

describe("eval/retrieval benchmark (screening)", () => {
  it("scores Recall@K and MRR per language and topic", () => {
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });
    const rows = [];
    const lat = [];
    for (const c of RETRIEVAL_CASES) {
      const t0 = performance.now();
      const K = Math.max(c.expected.minTopK || 5, 5);
      const ids = fastSearch(c.input, { limit: K }).records.map((r) => r.record.id);
      const rank = rankOf(ids, c.expected.recordIds, c.expected.acceptableIds || []);
      rows.push({
        id: c.id, language: c.language, topic: c.topic || "general",
        rank, recallAt1: rank === 1, recallAt3: rank !== null && rank <= 3,
        recallAt5: rank !== null && rank <= 5,
        ms: Math.round((performance.now() - t0) * 10) / 10,
      });
      lat.push(rows[rows.length - 1].ms);
    }
    const agg = (list) => {
      if (!list.length) return null;
      const r1 = list.filter((r) => r.recallAt1).length / list.length;
      const r3 = list.filter((r) => r.recallAt3).length / list.length;
      const r5 = list.filter((r) => r.recallAt5).length / list.length;
      const mrr = list.reduce((a, r) => a + (r.rank ? 1 / r.rank : 0), 0) / list.length;
      return { n: list.length, recallAt1: +r1.toFixed(3), recallAt3: +r3.toFixed(3), recallAt5: +r5.toFixed(3), mrr: +mrr.toFixed(3) };
    };
    const byLanguage = {};
    const byTopic = {};
    for (const r of rows) {
      (byLanguage[r.language] = byLanguage[r.language] || []).push(r);
      (byTopic[r.topic] = byTopic[r.topic] || []).push(r);
    }
    const report = {
      generatedAt: new Date().toISOString(),
      origin: "synthetic-screening on 13 curated records (NOT ground truth, small-n)",
      uncoveredTopics: ["fertilizer", "pest", "cultivation"],
      overall: agg(rows),
      byLanguage: Object.fromEntries(Object.entries(byLanguage).map(([k, v]) => [k, agg(v)])),
      byTopic: Object.fromEntries(Object.entries(byTopic).map(([k, v]) => [k, agg(v)])),
      latencyMs: { avg: lat.reduce((a, b) => a + b, 0) / Math.max(1, lat.length), max: Math.max(...lat) },
      failures: rows.filter((r) => !r.recallAt5).map((r) => `${r.id}(rank=${r.rank})`),
      rows,
    };
    mkdirSync(join(process.cwd(), "eval", "results"), { recursive: true });
    writeFileSync(join(process.cwd(), "eval", "results", "retrieval.json"), JSON.stringify(report, null, 1));
    expect(rows.length).toBe(RETRIEVAL_CASES.length);
  });
});
