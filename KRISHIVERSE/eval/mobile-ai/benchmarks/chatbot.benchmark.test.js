/**
 * eval/mobile-ai/benchmarks/chatbot.benchmark.test.js
 *
 * Rice chatbot arm benchmark (spec §5/§6/§7). Runs the runnable arms over the
 * rice screening set, records the non-runnable arms as SKIPPED with exact
 * how-to-run instructions, and writes eval/mobile-ai/results/chatbot-arms.json.
 *
 * Report-only: screening failures are findings, not suite failures.
 * Production code is imported read-only; nothing in src/ is modified.
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { ARMS } from "../adapters/registry.js";
import { needleAvailability, runNeedle } from "../adapters/needle.js";
import { buildInvertedIndex, resetIndex } from "../../../src/services/ai/AgriculturalNLP.js";
import { CROPS } from "../../../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../../../src/data/seed/treatmentData.js";
import { scoreLocalArm, summarizeArm, passRate, groupPassRate, latencyStats } from "../scoring.js";
import { RICE_CHATBOT_CASES, RICE_DATASET_SUMMARY } from "../datasets/riceChatbotCases.js";
import { buildRunMeta } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");

/** Needle arm scoring — only executed when the Needle adapter is available. */
function scoreNeedleArm(armDef) {
  const rows = [];
  const lat = [];
  const caps = new Set(armDef.capabilities || []);
  const taskMap = {
    "language-identification": "language_identification",
    "intent-classification": "intent",
    "crop-extraction": "extract",
    "symptom-extraction": "extract",
    "disease-extraction": "extract",
    "plant-part-extraction": "extract",
    "farmer-context-extraction": "extract",
    "clarification-selection": "clarify",
  };
  for (const c of RICE_CHATBOT_CASES) {
    if (!["intent", "chatbot", "decision"].includes(c.type)) continue;
    for (const [task, needleTask] of Object.entries(taskMap)) {
      if (!caps.has(task)) continue;
      let expected = null;
      if (task === "language-identification") expected = c.language;
      else if (task === "intent-classification") expected = c.expected?.intent;
      else if (task === "crop-extraction") expected = c.expected?.crop;
      else if (task === "symptom-extraction") expected = c.expected?.symptom;
      else if (task === "disease-extraction") continue; // no expert-labelled disease entity targets in this set
      else if (task === "plant-part-extraction") expected = c.expected?.plantPart;
      else if (task === "farmer-context-extraction") expected = c.expected?.farmerContext?.location ?? null;
      else if (task === "clarification-selection") expected = c.expected?.needsClarification;
      if (expected === undefined || expected === null) continue;
      const t0 = performance.now();
      const out = runNeedle(needleTask, c.input);
      lat.push(performance.now() - t0);
      let actual = null;
      let ok = null;
      if (out.ok) {
        const r = out.result || {};
        if (task === "language-identification") actual = r.language ?? null;
        else if (task === "intent-classification") actual = r.intent ?? null;
        else if (task === "crop-extraction") actual = r.crop ? r.crop.toLowerCase() : null;
        else if (task === "symptom-extraction") actual = r.symptom ? r.symptom.toLowerCase() : null;
        else if (task === "plant-part-extraction") actual = r.plant_part ?? null;
        else if (task === "farmer-context-extraction") actual = r.location ? r.location.toLowerCase() : null;
        else if (task === "clarification-selection") actual = Boolean(r.needs_clarification);
        ok = actual === expected;
      }
      rows.push({ arm: armDef.id, caseId: c.id, language: c.language, task, ok, actual, expected,
        confidence: out.confidence ?? null, error: out.error || null });
    }
  }
  return { arm: armDef.id, rows, latencyMs: latencyStats(lat) };
}

describe("eval/mobile-ai chatbot arms (rice screening)", () => {
  it("runs arms A–G, records H–P as measured-or-skipped, writes results", async () => {
    // Production warm-up equivalence: the production router parses against a
    // warmed inverted index (kbService buildInvertedIndex at boot). Without it,
    // parseQuery's fuzzy-misspell pass is dead code and the benchmark would
    // measure a non-production pipeline.
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });

    const armRecords = [];
    const allRows = [];

    for (const armDef of ARMS) {
      if (armDef.state === "not-applicable") {
        armRecords.push({ id: armDef.id, label: armDef.label, state: "not-applicable", skipReason: armDef.skipReason });
        continue;
      }
      if (armDef.external && armDef.state === "skipped") {
        const availability = armDef.external === "needle" ? needleAvailability() : null;
        armRecords.push({
          id: armDef.id,
          label: armDef.label,
          state: "skipped",
          skipReason: armDef.skipReason || availability?.reason || "external adapter unavailable",
          howToRun: armDef.howToRun || availability?.howToRun || null,
          capabilities: armDef.capabilities || [],
        });
        continue;
      }
      if (armDef.external && armDef.state === "measured" && !armDef.build) {
        // External arm marked available (e.g. small-llm via KV_BENCH_LLM_URL) —
        // scored by its own adapter run, never faked here.
        armRecords.push({
          id: armDef.id,
          label: armDef.label,
          state: "measured",
          metrics: { note: "external adapter arm — scored by its own adapter run, not the local scorer" },
          latencyMs: null,
          capabilities: armDef.capabilities || [],
        });
        continue;
      }

      // Runnable arm
      const result = armDef.external === "needle"
        ? scoreNeedleArm(armDef)
        : await scoreLocalArm(armDef, RICE_CHATBOT_CASES);
      const summary = summarizeArm(result);
      allRows.push(...result.rows);
      armRecords.push({
        id: armDef.id,
        label: armDef.label,
        state: "measured",
        metrics: {
          overall: summary.overall,
          byTask: summary.byTask,
          byLanguage: summary.byLanguage,
          failures: summary.failures,
        },
        latencyMs: summary.latencyMs,
        capabilities: armDef.capabilities || [],
      });
      for (const sub of armDef.subArms || []) {
        armRecords.push({
          id: sub.id,
          label: sub.label,
          state: sub.available ? "measured" : "skipped",
          ...(sub.available ? { metrics: { note: "see decision.benchmark results" }, latencyMs: null }
            : { skipReason: sub.skipReason, howToRun: sub.howToRun }),
        });
      }
    }

    const result = {
      dataClass: DATA_CLASS,
      title: "Rice chatbot arms benchmark (screening pass rates, NOT accuracy)",
      runMeta: buildRunMeta("rice-chatbot-arms-v1",
        ["eval/mobile-ai/datasets/riceChatbotCases.js"],
        { arms: "A-P per spec §3", seed: "fixed (deterministic rules, no sampling)" }),
      dataset: {
        ...RICE_DATASET_SUMMARY,
        origin: "synthetic-screening (0 expert-labelled cases)",
        path: "KRISHIVERSE/eval/mobile-ai/datasets/riceChatbotCases.js",
      },
      arms: armRecords,
      taskBreakdown: {
        measured: ["language-identification", "intent-classification", "crop-extraction", "symptom-extraction",
          "plant-part-extraction", "farmer-context-extraction", "query-normalization", "kb-retrieval",
          "clarification-selection"],
        notMeasuredHere: {
          "disease-extraction": "no expert-labelled disease-entity targets in the rice set; Needle extract arm reports when available",
          "answer-generation": "requires arm N/O (WebGPU browser or local LLM server)",
          "grounding": "see grounding.benchmark.test.js (GroundingGuard)",
          "safety": "shared ResponseValidator layer — see grounding.benchmark.test.js",
          "unknown-query-handling": "answer-level scoring requires answer-generation arms",
        },
      },
      rowAggregates: {
        overallByArm: Object.fromEntries(Object.entries(
          allRows.reduce((acc, r) => { (acc[r.arm] = acc[r.arm] || []).push(r); return acc; }, {}),
        ).map(([k, v]) => [k, passRate(v)])),
        byLanguage: groupPassRate(allRows, (r) => r.language),
      },
      limitations: [
        "Screening set: 0 expert-labelled cases — pass rates are pipeline screening signals, never accuracy.",
        "Arms H–M skipped in this environment (cactus-needle not installed); N/O skipped (WebGPU session or KV_BENCH_LLM_URL) — see howToRun.",
        "Wall-clock latency measured on a desktop reference (node), not on a low-end Android device.",
        "Tamil/Tanglish expectations are word-level; agronomic correctness is governed by the KB, not by this set.",
      ],
    };
    validateBenchmarkResult(result);

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "chatbot-arms.json"), JSON.stringify(result, null, 1));

    expect(result.arms.length).toBeGreaterThanOrEqual(ARMS.length); // + G/K sub-arms
    for (const armDef of ARMS) expect(result.arms.map((a) => a.id)).toContain(armDef.id);
    expect(result.arms.filter((a) => a.state === "measured").length).toBeGreaterThanOrEqual(7); // A–G
    const measured = result.arms.filter((a) => a.state === "measured");
    expect(measured.every((a) => a.metrics && a.latencyMs)).toBe(true);
    const skipped = result.arms.filter((a) => a.state === "skipped");
    expect(skipped.every((a) => a.skipReason && a.skipReason.length > 0)).toBe(true);
    if (result.arms.some((a) => a.metrics?.overall?.passRate < 0.6)) {
      console.log("[mobile-ai/chatbot] low-screening arms present — see failures in results/chatbot-arms.json");
    }
  }, 120000);
});
