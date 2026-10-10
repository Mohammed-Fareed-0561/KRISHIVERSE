/**
 * eval/mobile-ai/benchmarks/ablation.benchmark.test.js
 *
 * Spec §40 — ablation study: disable one component of the full local
 * composition at a time and measure the screening delta against the full
 * baseline. Components: AgriculturalNLP parse, language ID, KB retrieval,
 * local decision engine, rule extractors (plant-part / farmer-context).
 *
 * Report-only: deltas are findings. Production code is imported read-only;
 * ablated arms are stubbed inside the benchmark build() (src/ untouched).
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { RICE_CHATBOT_CASES } from "../datasets/riceChatbotCases.js";
import { localArmRun } from "../adapters/registry.js";
import { buildInvertedIndex, resetIndex } from "../../../src/services/ai/AgriculturalNLP.js";
import { CROPS } from "../../../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../../../src/data/seed/treatmentData.js";
import { scoreLocalArm, summarizeArm } from "../scoring.js";
import { buildRunMeta } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");

const FULL_CAPS = ["language-identification", "intent-classification", "crop-extraction", "symptom-extraction",
  "kb-retrieval", "clarification-selection", "plant-part-extraction", "farmer-context-extraction"];

const stubParse = () => ({ intent: "unknown", crop: null, symptom: null, tokens: [] });
const stubLang = () => "en";
const stubDecide = () => ({ needsClarification: false, decision: { intent: "unknown" } });

const ABLATION_ARMS = [
  { id: "ablation-00-full", removed: null,
    label: "Baseline: full local composition (NLP + langId + KB + decision + extractors)",
    build: () => localArmRun({ retrieval: "kb", decision: true }) },
  { id: "ablation-01-no-nlp", removed: "AgriculturalNLP parse",
    label: "−NLP: parse stubbed (intent unknown, no crop/symptom)",
    build: () => ({ ...localArmRun({ retrieval: "kb", decision: true }), parse: stubParse }) },
  { id: "ablation-02-no-retrieval", removed: "KB retrieval",
    label: "−Retrieval: retrieve returns empty list",
    build: () => localArmRun({ retrieval: false, decision: true }) },
  { id: "ablation-03-no-decision", removed: "Local decision engine",
    label: "−Decision: decide stubbed (never clarifies, intent unknown)",
    build: () => ({ ...localArmRun({ retrieval: "kb", decision: false }), decide: stubDecide }) },
  { id: "ablation-04-no-langid", removed: "language identification",
    label: "−LangId: language stubbed to en",
    build: () => ({ ...localArmRun({ retrieval: "kb", decision: true }), lang: stubLang }) },
  { id: "ablation-05-no-extractors", removed: "rule extractors (plant-part, farmer-context)",
    label: "−Extractors: plantPart/farmerContext stubbed to null",
    build: () => ({ ...localArmRun({ retrieval: "kb", decision: true }),
      plantPart: () => null, farmerContext: () => null }) },
];

describe("eval/mobile-ai ablation study (spec §40)", () => {
  it("measures the screening delta of removing each component", async () => {
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });

    const arms = [];
    const t0 = performance.now();
    for (const def of ABLATION_ARMS) {
      const result = await scoreLocalArm({ id: def.id, build: def.build, capabilities: FULL_CAPS },
        RICE_CHATBOT_CASES);
      const summary = summarizeArm(result);
      arms.push({
        id: def.id,
        label: def.label,
        state: "measured",
        removed: def.removed,
        metrics: { overall: summary.overall, byTask: summary.byTask, byLanguage: summary.byLanguage,
          failures: summary.failures },
        latencyMs: summary.latencyMs,
      });
    }
    const totalMs = +(performance.now() - t0).toFixed(1);

    const baseline = arms.find((a) => a.id === "ablation-00-full").metrics.overall;
    const ablationTable = arms.filter((a) => a.removed).map((a) => ({
      removed: a.removed,
      arm: a.id,
      passRate: a.metrics.overall.passRate,
      n: a.metrics.overall.n,
      deltaPassRate: +(baseline.passRate - a.metrics.overall.passRate).toFixed(3),
      extraFailures: (a.metrics.overall.n - a.metrics.overall.ok) - (baseline.n - baseline.ok),
      failedTasks: Object.entries(a.metrics.byTask)
        .filter(([, v]) => v.passRate !== null && v.passRate < 1)
        .map(([task, v]) => `${task} (${v.ok}/${v.n})`),
    }));

    const result = {
      dataClass: DATA_CLASS,
      title: "Ablation study: one component removed at a time (screening, NOT accuracy)",
      runMeta: buildRunMeta("rice-ablation-v1",
        ["eval/mobile-ai/datasets/riceChatbotCases.js"],
        { components: ablationTable.map((r) => r.removed).join(","), seed: "fixed (deterministic rules)" }),
      dataset: {
        total: RICE_CHATBOT_CASES.length,
        origin: "synthetic-screening (0 expert-labelled)",
        path: "KRISHIVERSE/eval/mobile-ai/benchmarks/ablation.benchmark.test.js",
      },
      arms,
      ablationTable,
      baseline,
      totalMs,
      taskBreakdown: { measured: FULL_CAPS },
      limitations: [
        "Screening set — pass rates are pipeline screening signals, never accuracy.",
        "Stubbed components are benchmark-local (src/ untouched); interactions between components are not decomposed further.",
        "Component removal changes which rows are scoreable only via behaviour (all rows stay scored via stubs).",
      ],
    };
    validateBenchmarkResult(result);

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "ablation.json"), JSON.stringify(result, null, 1));

    // Every ablated variant must strictly degrade the full baseline.
    expect(baseline.passRate).toBeGreaterThanOrEqual(0.95);
    for (const row of ablationTable) {
      expect(row.deltaPassRate).toBeGreaterThan(0);
      expect(row.failedTasks.length).toBeGreaterThan(0);
    }
    expect(arms.length).toBe(ABLATION_ARMS.length);
  }, 60000);
});
