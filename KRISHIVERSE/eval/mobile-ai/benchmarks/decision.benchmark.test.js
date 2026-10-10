/**
 * eval/mobile-ai/benchmarks/decision.benchmark.test.js
 *
 * Laya/decision benchmark (spec §9): existing decision logic vs Needle vs
 * Laya vs Needle+Laya, for ambiguity resolution, clarification selection and
 * candidate selection ONLY. Hard invariant asserted here: no decision engine
 * may override ResponseValidator safety (a 0.99-confidence 'laya' source must
 * still be blocked for unsourced dosage).
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { existingLocal, layaLive } from "../adapters/decisions.js";
import { needleAvailability } from "../adapters/needle.js";
import { RICE_CHATBOT_CASES } from "../datasets/riceChatbotCases.js";
import { SCREENING_CASES } from "../../cases.screening.js";
import { validateResponse } from "../../../src/services/ai/ResponseValidator.js";
import { buildInvertedIndex, resetIndex } from "../../../src/services/ai/AgriculturalNLP.js";
import { CROPS } from "../../../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../../../src/data/seed/treatmentData.js";
import { buildRunMeta } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";
import { latencyStats } from "../scoring.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");
const DECISION_CASES = [...SCREENING_CASES, ...RICE_CHATBOT_CASES].filter((c) => c.type === "decision");

async function runLocal() {
  const rows = [];
  const lat = [];
  for (const c of DECISION_CASES) {
    const t0 = performance.now();
    const d = await existingLocal.decide(c.task, c.state, c.candidates || [], []);
    lat.push(performance.now() - t0);
    let ok = null;
    let actual = null;
    if (c.task === "clarification") {
      ok = d.needsClarification === c.expected.needsClarification;
      actual = d.needsClarification;
    } else if (c.task === "intent_classification") {
      ok = d.decision.intent === c.expected.intent;
      actual = d.decision.intent;
    } else if (c.task === "candidate_selection") {
      actual = d.decision.selected?.id ?? d.decision.selected;
      ok = actual === c.expected.selectedId;
    }
    rows.push({ caseId: c.id, task: c.task, language: c.language, ok, actual, engine: d.engine });
  }
  const scored = rows.filter((r) => r.ok !== null);
  return {
    rows,
    metrics: {
      overall: { n: scored.length, ok: scored.filter((r) => r.ok).length,
        passRate: scored.length ? +(scored.filter((r) => r.ok).length / scored.length).toFixed(3) : null },
      byTask: Object.fromEntries([...new Set(rows.map((r) => r.task))].map((t) => {
        const sub = rows.filter((r) => r.task === t && r.ok !== null);
        return [t, { n: sub.length, ok: sub.filter((r) => r.ok).length,
          passRate: sub.length ? +(sub.filter((r) => r.ok).length / sub.length).toFixed(3) : null }];
      })),
      failures: rows.filter((r) => r.ok === false).map((r) => `${r.caseId}(${r.actual})`),
    },
    latencyMs: latencyStats(lat),
  };
}

describe("eval/mobile-ai decision/Laya benchmark", () => {
  it("compares existing decision vs external arms and enforces safety non-override", async () => {
    // Production warm-up equivalence: decideClarification's evidence check runs
    // fastSearch, which is empty until the inverted index is built (the engine
    // fail-safes to "clarify" without it — correct offline, wrong to score by).
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });

    const local = await runLocal();
    const needle = needleAvailability();
    const laya = layaLive.available();

    const arms = [
      { id: "existing-decision", label: "Existing decision logic (LocalDecisionEngine)", state: "measured",
        metrics: local.metrics, latencyMs: local.latencyMs },
      { id: "needle-clarify", label: "Needle (clarification/ambiguity arm)", state: needle.available ? "measured" : "skipped",
        skipReason: needle.available ? undefined : needle.reason, howToRun: needle.howToRun, latencyMs: null,
        ...(needle.available ? { metrics: { note: "run via chatbot-arms Needle scoring (arm K sub-arm)" } } : {}) },
      { id: "laya-live", label: "Laya sidecar (live)", state: laya ? "measured" : "skipped",
        skipReason: laya ? undefined : layaLive.skipReason, howToRun: layaLive.howToRun, latencyMs: null,
        ...(laya ? { metrics: { note: "live sub-arm results appended by adapter run" } } : {}) },
      { id: "needle+laya", label: "Needle + Laya (routing: Needle pre-filter → Laya decision)",
        state: "skipped",
        skipReason: `requires both external arms: needle[${needle.reason}] laya[${laya ? "ok" : layaLive.skipReason}]`,
        howToRun: "enable KV_BENCH_NEEDLE_MODEL and KV_BENCH_API together", latencyMs: null },
    ];

    // HARD invariant: decision/sidecar confidence must never bypass ResponseValidator.
    const doseBlock = validateResponse({
      answer: "Spray 2.5ml per litre of pesticide every 7 days before harvest.",
      source: "laya", confidence: 0.99, evidence: [],
    });
    expect(doseBlock.verdict).toBe("blocked");

    const result = {
      dataClass: DATA_CLASS,
      title: "Ambiguity / clarification / candidate-selection decision benchmark",
      runMeta: buildRunMeta("rice-decision-laya-v1",
        ["eval/cases.screening.js", "eval/mobile-ai/datasets/riceChatbotCases.js"],
        { decisionVersion: "laya-decision-v1", layaFlagProduction: "VITE_ENABLE_LAYA_DECISIONS default false" }),
      dataset: {
        total: DECISION_CASES.length,
        origin: "synthetic-screening (0 expert-labelled)",
        note: "covers intent_classification, clarification, candidate_selection tasks only (spec §9 scope)",
      },
      arms,
      taskBreakdown: { measured: ["clarification-selection"],
        notMeasuredHere: { "answer-generation": "decision engines never generate answers by design" } },
      safetyInvariant: { check: "unsourced dosage via source=laya confidence=0.99", verdict: doseBlock.verdict, expected: "blocked", passed: doseBlock.verdict === "blocked" },
      limitations: [
        "Needle/Laya arms skipped in this environment — recorded with exact re-run commands.",
        "Laya cannot be exercised without a deployed Laya model; LocalDecisionEngine is its documented fallback.",
        "Decision correctness is measured against screening expectations, not agronomist labels.",
      ],
    };
    validateBenchmarkResult(result);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "decision-benchmark.json"), JSON.stringify(result, null, 1));

    expect(local.metrics.overall.n).toBeGreaterThan(0);
    expect(result.safetyInvariant.passed).toBe(true);
  }, 60000);
});
