/**
 * eval/mobile-ai/benchmarks/imagequality.benchmark.test.js
 *
 * Image-quality gate benchmark (spec §14) on PROCEDURAL SYNTHETIVE images.
 * Measures per-category gate detection rates + latency. Explicitly does NOT
 * claim false-diagnosis reduction (needs model inference on real images).
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { assessImageQuality } from "../imagequality/imageQualityGuard.js";
import { IMAGE_QUALITY_CASES, IMAGE_QUALITY_SUMMARY } from "../datasets/imageQualityCases.js";
import { buildRunMeta } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";
import { latencyStats } from "../scoring.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");

describe("eval/mobile-ai image-quality gate benchmark", () => {
  it("scores gate detection on synthetic images and writes results", () => {
    const rows = [];
    const lat = [];
    for (const c of IMAGE_QUALITY_CASES) {
      const img = c.build();
      const t0 = performance.now();
      const out = assessImageQuality(img);
      lat.push(performance.now() - t0);
      const verdictOk = out.verdict === c.expectedVerdict;
      const flagsOk = c.expectedFlags.every((f) => out.flags.includes(f));
      rows.push({ id: c.id, origin: c.origin, expectedVerdict: c.expectedVerdict,
        actualVerdict: out.verdict, expectedFlags: c.expectedFlags, actualFlags: out.flags,
        verdictOk, flagsOk, ok: verdictOk && flagsOk, scores: out.scores,
        ms: +(performance.now() - t0).toFixed(3) });
    }

    const result = {
      dataClass: DATA_CLASS,
      title: "Image-quality gate benchmark (procedural synthetic images)",
      runMeta: buildRunMeta("rice-image-quality-v1",
        ["eval/mobile-ai/datasets/imageQualityCases.js"],
        { generator: "seeded mulberry32, 160x160 RGBA", thresholds: "eval/mobile-ai/imagequality/imageQualityGuard.js" }),
      dataset: { ...IMAGE_QUALITY_SUMMARY, path: "KRISHIVERSE/eval/mobile-ai/datasets/imageQualityCases.js" },
      arms: [
        { id: "deterministic-quality-gate", label: "Deterministic image-quality gate (prototype)",
          state: "measured",
          metrics: {
            cases: rows.length,
            verdictCorrect: rows.filter((r) => r.verdictOk).length,
            flagsCorrect: rows.filter((r) => r.flagsOk).length,
            detectionRate: +(rows.filter((r) => r.ok).length / rows.length).toFixed(3),
            falseBlockRateOnControls: rows.filter((r) => r.expectedVerdict === "usable" && !r.verdictOk).length,
            failures: rows.filter((r) => !r.ok).map((r) => r.id),
          },
          latencyMs: latencyStats(lat) },
        { id: "occlusion-multobject-detection", label: "Heavy occlusion / multiple-object detection",
          state: "not-applicable",
          skipReason: "not reliably detectable by a deterministic pixel gate — requires a content model; documented as a limitation, not a silent gap" },
      ],
      taskBreakdown: { measured: ["image-quality gating (blur/dark/bright/size/plant/background)"] },
      rows,
      limitations: [
        "Procedural synthetic images only — detection rates do NOT transfer to field photos.",
        "'Reduces false diagnoses' is NOT measured: that requires running the ONNX model with/without the gate on real images.",
        "Heavy occlusion and multi-object confusion are out of scope for the deterministic gate (arm recorded not-applicable).",
      ],
    };
    validateBenchmarkResult(result);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "image-quality.json"), JSON.stringify(result, null, 1));

    expect(rows.length).toBe(IMAGE_QUALITY_CASES.length);
    expect(rows.every((r) => r.verdictOk)).toBe(true);
    expect(rows.filter((r) => r.expectedFlags.length > 0).every((r) => r.flagsOk)).toBe(true);
  }, 60000);
});
