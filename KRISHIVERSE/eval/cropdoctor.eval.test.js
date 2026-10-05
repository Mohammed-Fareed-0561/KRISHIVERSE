/**
 * eval/cropdoctor.eval.test.js — 1D Crop Doctor evaluation harness.
 *
 * What it measures (deterministic, offline):
 * - text symptom matcher: top-1/top-3 hit behaviour on screening descriptions
 *   (screening-only, NOT agronomic ground truth)
 * - visual-rule determinism: analyzeVisualFeatures purity
 * - classifier helpers: softmax/topK calibration shape, unknown/uncertain
 *   handling (diseaseId:null classes), null-file rejection
 * - labeled-set inventory: real dir listing of backend/eval/dataset (PlantVillage
 *   hold-out) + recorded onnx_eval_results.json metrics — NO synthetic images
 *   are ever treated as ground truth.
 *
 * Writes eval/results/cropdoctor.json. Report-only (see chatbot.eval notes).
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import Detector from "../src/services/ai/ComprehensiveDiseaseDetector.js";
import { analyzeVisualFeatures } from "../src/data/comprehensiveDiseaseDB.js";
import { softmax, topK, diagnoseFromFile, validateImageFile, assessImageDimensions } from "../src/services/ai/onDeviceClassifier.js";
import { detectDisease } from "../src/services/enhancedOfflineDiseaseService.js";

const TEXT_CASES = [
  { id: "rice-blast", desc: "rice leaves with diamond spots gray center neck blast", crop: "rice", expectInTop3: ["rice_blast"] },
  { id: "rice-yellow", desc: "rice yellow streaks stunted growth mottled leaves", crop: "rice", expectInTop3: ["rice_yellow_spots"] },
  { id: "unknown-crop", desc: "spots on leaves", crop: "dragonfruit", expectTop1Null: true },
  { id: "empty-desc", desc: "", crop: "rice", expectTop1Null: true },
];

describe("eval/cropdoctor harness", () => {
  it("measures text matcher, helpers, and labeled-set inventory", async () => {
    const rows = [];
    // 1. text matcher top-1/top-3 (screening)
    for (const c of TEXT_CASES) {
      const t0 = performance.now();
      let out = null;
      let error = null;
      try {
        out = Detector.detect(c.desc, c.crop, "en");
      } catch (e) {
        error = String(e?.message || e);
      }
      const ms = Math.round((performance.now() - t0) * 10) / 10;
      const list = Array.isArray(out) ? out : out ? [out] : [];
      const top3 = list.slice(0, 3).map((r) => r.disease?.id ?? r.id ?? null);
      rows.push({
        id: `text-${c.id}`, ms, error,
        top1: top3[0] ?? null, top3,
        top1Ok: c.expectTop1Null ? top3.length === 0 : undefined,
        top3Ok: c.expectInTop3 ? c.expectInTop3.every((id) => top3.includes(id)) : undefined,
      });
    }
    // 2. visual-rule determinism (same input twice → identical output)
    const probe = { colors: ["yellow_leaves"], shapes: ["target_pattern"], locations: ["all_leaves"] };
    const r1 = JSON.stringify(analyzeVisualFeatures(probe));
    const r2 = JSON.stringify(analyzeVisualFeatures(probe));
    rows.push({ id: "rules-deterministic", deterministic: r1 === r2, rules: JSON.parse(r1).length });
    rows.push({ id: "rules-unknown-ignored", empty: analyzeVisualFeatures({ colors: ["magenta_polka"] }).length === 0 });
    // 3. classifier helper calibration shape + unknown handling
    const probs = softmax([2.0, 1.0, 0.5, 0.2, 0.1, 0.05]);
    const top = topK(probs, 3);
    rows.push({
      id: "softmax-topk", sumsToOne: Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-6,
      top3Ordered: top.length === 3 && top[0].probability >= top[1].probability && top[1].probability >= top[2].probability,
      top1Index: top[0].index,
    });
    const nullFile = await diagnoseFromFile(null).catch(() => null);
    rows.push({ id: "null-file-rejected", rejected: nullFile === null });
    // 4. labeled-set inventory (real files only; never synthetic)
    const datasetDir = join(process.cwd(), "..", "backend", "eval", "dataset");
    const inventory = { present: existsSync(datasetDir), classes: {} };
    if (inventory.present) {
      for (const cls of readdirSync(datasetDir)) {
        try {
          const files = readdirSync(join(datasetDir, cls)).filter((f) => /\.jpe?g$/i.test(f));
          inventory.classes[cls] = files.length;
        } catch { /* ignore non-directories */ }
      }
    }
    const total = Object.values(inventory.classes).reduce((a, b) => a + b, 0);
    rows.push({ id: "labeled-inventory", ...inventory, totalImages: total });
    // 5. recorded ONNX evaluation analysis (real recorded rows — recomputed, not invented)
    try {
      const recorded = JSON.parse(readFileSync(join(process.cwd(), "..", "models", "onnx_eval_results.json"), "utf8"));
      const perClass = {};
      const confusion = {};
      let top1 = 0;
      for (const r of recorded.rows || []) {
        const gt = r.gt ?? r.class;
        perClass[gt] = perClass[gt] || { n: 0, ok: 0 };
        perClass[gt].n++;
        if (r.correct) { perClass[gt].ok++; top1++; }
        const key = `${gt}→${r.pred_class}`;
        confusion[key] = (confusion[key] || 0) + 1;
      }
      const n = (recorded.rows || []).length;
      rows.push({
        id: "recorded-onnx-120", runAt: recorded.runAt, model: recorded.model,
        top1: n ? top1 / n : null, correct: top1, total: n,
        perClass: Object.fromEntries(Object.entries(perClass).map(([k, v]) => [k, `${v.ok}/${v.n}`])),
        confusion, wilson_ci_95: recorded.wilson_ci_95 || null,
      });
    } catch (e) {
      rows.push({ id: "recorded-onnx-120", missing: String(e?.message || e) });
    }
    // 6. abstention + repeatability probes (live gates, deterministic)
    const abstainProbes = [
      validateImageFile(null).state,
      validateImageFile({ size: 0 }).state,
      assessImageDimensions({ naturalWidth: 10, naturalHeight: 10 }).state,
      (await detectDisease(null, "en", {})).state,
      (await detectDisease({ naturalWidth: 200, naturalHeight: 200 }, "en", { cropHint: "dragonfruit" })).state,
    ];
    rows.push({
      id: "abstention-rate", probes: abstainProbes.length,
      abstained: abstainProbes.filter((s) => s === "IMAGE_UNUSABLE" || s === "UNKNOWN_CROP").length,
    });
    const twice = [
      JSON.stringify(Detector.detect("rice leaves with diamond spots gray center", "rice", "en")),
      JSON.stringify(Detector.detect("rice leaves with diamond spots gray center", "rice", "en")),
    ];
    rows.push({ id: "repeatability", textDetectStable: twice[0] === twice[1] });

    const report = {
      generatedAt: new Date().toISOString(),
      origin: "synthetic-screening + real file inventory + recorded eval rows (NOT expert ground truth)",
      rows,
      notes: [
        "Recorded ONNX rows recomputed above from models/onnx_eval_results.json (2026-08-27, 114/120); live re-measurement reproduced 114/120 exactly on 2026-10-01 (see docs/cropdoctor/current-pipeline.md §ONNX).",
        "Image path is deterministic since Phase 2/3A (former Math.random mocks replaced; demo random-diagnosis pages deleted).",
        "No expert-labelled field data exists — see docs/cropdoctor/dataset-spec.md for the blocker contract.",
      ],
    };
    mkdirSync(join(process.cwd(), "eval", "results"), { recursive: true });
    writeFileSync(join(process.cwd(), "eval", "results", "cropdoctor.json"), JSON.stringify(report, null, 1));
    expect(rows.find((r) => r.id === "rules-deterministic").deterministic).toBe(true);
    expect(rows.find((r) => r.id === "null-file-rejected").rejected).toBe(true);
    expect(rows.find((r) => r.id === "abstention-rate").abstained).toBe(5);
    expect(rows.find((r) => r.id === "repeatability").textDetectStable).toBe(true);
  }, 60000);
});
