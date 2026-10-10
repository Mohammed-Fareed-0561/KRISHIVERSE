/**
 * eval/mobile-ai/benchmarks/rag.benchmark.test.js
 *
 * RAG/retrieval benchmark (spec §10): Recall@1/3/5 + MRR + latency, broken
 * down by language and topic, over the committed retrieval cases + the rice
 * retrieval cases. Arms: existing production lexical retrieval, hybrid
 * benchmark-local prototype, and optional external embedding arms (skipped
 * unless explicitly enabled). Production ranking is NOT modified.
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { RETRIEVAL_CASES } from "../../cases.retrieval.js";
import { RICE_CHATBOT_CASES } from "../datasets/riceChatbotCases.js";
import { retrievalArms, optionalRetrievalArms } from "../adapters/kbRag.js";
import { buildInvertedIndex, resetIndex } from "../../../src/services/ai/AgriculturalNLP.js";
import { CROPS } from "../../../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../../../src/data/seed/treatmentData.js";
import { buildRunMeta, hashFile, fileSize } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";
import { latencyStats } from "../scoring.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");

const RICE_RETRIEVAL = RICE_CHATBOT_CASES
  .filter((c) => c.type === "rag")
  .map((c) => ({ ...c, topic: c.notes?.includes("KB honesty") ? "general" : "treatment" }));

const CASES = [...RETRIEVAL_CASES, ...RICE_RETRIEVAL];

function rankOf(ids, wanted) {
  const targets = new Set(wanted);
  for (let i = 0; i < ids.length; i++) if (targets.has(ids[i])) return i + 1;
  return null;
}

function agg(rows) {
  if (!rows.length) return { n: 0, recallAt1: null, recallAt3: null, recallAt5: null, mrr: null };
  const r = (k) => +(rows.filter((x) => x.rank !== null && x.rank <= k).length / rows.length).toFixed(3);
  const mrr = +(rows.reduce((a, x) => a + (x.rank ? 1 / x.rank : 0), 0) / rows.length).toFixed(3);
  return { n: rows.length, recallAt1: r(1), recallAt3: r(3), recallAt5: r(5), mrr };
}

function runArm(arm, cases) {
  const rows = [];
  const lat = [];
  for (const c of cases) {
    const t0 = performance.now();
    const ids = arm.run(c.input, 10);
    const ms = performance.now() - t0;
    lat.push(ms);
    rows.push({
      id: c.id, language: c.language, topic: c.topic || "general",
      rank: rankOf(ids, [...c.expected.recordIds, ...(c.expected.acceptableIds || [])]),
      topIds: ids.slice(0, 5),
      ms: +ms.toFixed(2),
    });
  }
  const group = (key) => Object.fromEntries(
    [...new Set(rows.map((x) => x[key]))].map((k) => [k, agg(rows.filter((x) => x[key] === k))]),
  );
  return { arm: arm.id, label: arm.label, overall: agg(rows), byLanguage: group("language"), byTopic: group("topic"),
    latencyMs: latencyStats(lat), rows };
}

describe("eval/mobile-ai RAG benchmark (retrieval screening)", () => {
  it("scores Recall@K and MRR for existing + hybrid arms, records external arms", () => {
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });

    const arms = [runArm(retrievalArms.existing, CASES), runArm(retrievalArms.hybrid, CASES)];

    const external = optionalRetrievalArms().map((a) => ({
      id: a.id, label: a.label, state: a.external ? "skipped" : "measured",
      skipReason: a.external ? "external arm requires explicit env opt-in (see howToRun)" : undefined,
      howToRun: a.id === "backend-rag" ? "KV_BENCH_RAG_URL=http://localhost:8000/rag/ask npx vitest run eval/mobile-ai/benchmarks/rag.benchmark.test.js"
        : "pip install cactus-needle; KV_BENCH_NEEDLE_MODEL=<needle3.cact> (see docs/ai/needle-evaluation.md)",
    }));
    // Needle embeddings arm is always listed so the registry is complete.
    if (!external.some((e) => e.id === "needle-embeddings")) {
      external.push({ id: "needle-embeddings", label: "Needle embeddings retrieval", state: "skipped",
        skipReason: "KV_BENCH_NEEDLE_MODEL not set (cactus-needle not installed)",
        howToRun: "pip install cactus-needle && KV_BENCH_NEEDLE_MODEL=<needle3.cact> npx vitest run eval/mobile-ai/benchmarks/rag.benchmark.test.js" });
    }

    const seedBytes = ["src/data/seed/cropData.js", "src/data/seed/diseaseData.js", "src/data/seed/treatmentData.js"]
      .reduce((a, rel) => a + (fileSize(join(process.cwd(), rel)) || 0), 0);

    const result = {
      dataClass: DATA_CLASS,
      title: "Rice+curated RAG retrieval benchmark (screening, NOT ground truth)",
      runMeta: buildRunMeta("rice-rag-retrieval-v1",
        ["eval/cases.retrieval.js", "eval/mobile-ai/datasets/riceChatbotCases.js"],
        { topK: 10, fusion: "RRF k=60 for hybrid arm", productionRanking: "unmodified" }),
      dataset: {
        total: CASES.length,
        fromRetrievalRegistry: RETRIEVAL_CASES.length,
        fromRiceSet: RICE_RETRIEVAL.length,
        origin: "synthetic-screening (0 expert-labelled); expected ids are real committed KB record ids",
        note: "Topic coverage: fertilizer/pest/cultivation under-represented (see existing retrieval.json)",
      },
      arms: [
        { id: arms[0].arm, label: arms[0].label, state: "measured", metrics: { overall: arms[0].overall, byLanguage: arms[0].byLanguage, byTopic: arms[0].byTopic }, latencyMs: arms[0].latencyMs },
        { id: arms[1].arm, label: arms[1].label, state: "measured", metrics: { overall: arms[1].overall, byLanguage: arms[1].byLanguage, byTopic: arms[1].byTopic }, latencyMs: arms[1].latencyMs },
        ...external.map((e) => ({ ...e, latencyMs: null })),
      ],
      index: { sourceRecords: 13 + RICE_RETRIEVAL.length, seedBytes, format: "inverted index over curated seeds (KB v2 not indexed in node harness)" },
      taskBreakdown: { measured: ["kb-retrieval"] },
      latencyMs: { existing: arms[0].latencyMs, hybrid: arms[1].latencyMs },
      failures: arms.map((a) => ({ arm: a.arm, rankMiss5: a.rows.filter((r) => r.rank === null || r.rank > 5).map((r) => r.id) })),
      limitations: [
        "Screening cases over 13 curated seed records + rice pilot records — NOT the full KB v2 (15k records, quarantined bulk excluded).",
        "Embedding arms (Needle/all-MiniLM) require explicit env opt-in; no vectors were downloaded for this run.",
        "Index size measured as seed source bytes; runtime RAM measured separately in mobile.benchmark.test.js.",
      ],
    };
    validateBenchmarkResult(result);

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "rag-benchmark.json"), JSON.stringify(result, null, 1));

    expect(result.arms.length).toBeGreaterThanOrEqual(3);
    expect(arms[0].rows.length).toBe(CASES.length);
    expect(hashFile(join(process.cwd(), "eval", "cases.retrieval.js"))).toBeTruthy();
  }, 60000);
});
