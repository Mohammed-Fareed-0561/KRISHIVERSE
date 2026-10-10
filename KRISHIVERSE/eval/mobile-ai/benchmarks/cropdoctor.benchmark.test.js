/**
 * eval/mobile-ai/benchmarks/cropdoctor.benchmark.test.js
 *
 * Crop Doctor benchmark (spec §13) — isolated: the production model and
 * pipeline are NOT modified. Computes top-1 accuracy, per-class precision/
 * recall/F1, macro F1, confusion matrix and Wilson CI from the recorded
 * PlantVillage hold-out run (origin: plantvillage-eval, public benchmark —
 * never "field accuracy"). Top-3, calibration/ECE and candidate model
 * variants are recorded as not-measured with exact re-run commands.
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { buildRunMeta, hashFile, fileSize } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");
const ONNX_EVAL = join(process.cwd(), "..", "models", "onnx_eval_results.json");
const ONNX_EVAL_MIRROR = join(process.cwd(), "..", "backend", "eval", "models", "onnx_eval_results.json");
const EXISTING_CD = join(process.cwd(), "eval", "results", "cropdoctor.json");

function wilsonLowerUpper(ok, n, z = 1.96) {
  if (!n) return [null, null];
  const p = ok / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [+(center - half).toFixed(4), +(center + half).toFixed(4)];
}

function perClassMetrics(rows, classes) {
  const tp = {}; const fp = {}; const fn = {};
  for (const c of classes) { tp[c] = 0; fp[c] = 0; fn[c] = 0; }
  for (const r of rows) {
    const gtClass = r.class;          // ground-truth class name
    const predClass = r.pred_class;    // predicted class name
    if (gtClass === predClass) tp[gtClass] += 1;
    else { fp[predClass] += 1; fn[gtClass] += 1; }
  }
  const out = {};
  for (const c of classes) {
    const precision = tp[c] + fp[c] ? tp[c] / (tp[c] + fp[c]) : 0;
    const recall = tp[c] + fn[c] ? tp[c] / (tp[c] + fn[c]) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    out[c] = { n: rows.filter((r) => r.class === c).length, precision: +precision.toFixed(3),
      recall: +recall.toFixed(3), f1: +f1.toFixed(3) };
  }
  return out;
}

describe("eval/mobile-ai Crop Doctor benchmark", () => {
  it("computes metrics from the recorded hold-out run and records unmeasured arms", () => {
    expect(existsSync(ONNX_EVAL)).toBe(true);
    const recorded = JSON.parse(readFileSync(ONNX_EVAL, "utf8"));
    const rows = recorded.rows;
    const classes = [...new Set(rows.map((r) => r.class))].sort();

    const ok = rows.filter((r) => r.correct).length;
    const accuracy = +(ok / rows.length).toFixed(4);
    const [wilsonLo, wilsonHi] = wilsonLowerUpper(ok, rows.length);

    const confusion = {};
    for (const c of classes) confusion[c] = Object.fromEntries(classes.map((k) => [k, 0]));
    for (const r of rows) confusion[r.class][r.pred_class] += 1;

    const perClass = perClassMetrics(rows, classes);
    const macroF1 = +(Object.values(perClass).reduce((a, c) => a + c.f1, 0) / classes.length).toFixed(4);

    // Latency reference from the existing deterministic eval (text matcher + recorded rows).
    let latencyRef = null;
    let existingCd = null;
    if (existsSync(EXISTING_CD)) {
      existingCd = JSON.parse(readFileSync(EXISTING_CD, "utf8"));
      const ms = (existingCd.rows || []).map((r) => r.ms).filter((v) => typeof v === "number");
      if (ms.length) {
        latencyRef = { n: ms.length, avg: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2),
          max: +Math.max(...ms).toFixed(2),
          note: "deterministic text/rule path latency in node; ONNX WASM latency measured in-browser (not available here)" };
      }
    }

    const modelBytes = fileSize(join(process.cwd(), "public", "models", "efficientnet_b0_plantvillage.onnx"))
      + (fileSize(join(process.cwd(), "public", "models", "efficientnet_b0_plantvillage.onnx.data")) || 0);

    const arms = [
      { id: "current-onnx-efficientnet-b0", label: "Current production ONNX (EfficientNet-B0, PlantVillage 6-class)",
        state: "measured",
        metrics: { accuracy, top1: accuracy, wilsonCi95: [wilsonLo, wilsonHi], macroF1, perClass, confusion,
          recordedCorrect: recorded.correct, recordedTotal: recorded.total },
        latencyMs: latencyRef, modelBytes },
      { id: "quantized-variant", label: "Quantized variant (INT8 dynamic) of current ONNX",
        state: "skipped",
        skipReason: "requires onnxruntime + python export pipeline run (not executed in this environment)",
        howToRun: "python backend/eval/export_and_eval.py --help  # re-export from checkpoint; add dynamic_quantize step, then re-run this benchmark",
        latencyMs: null },
      { id: "mobilenet-family-candidate", label: "Small MobileNet-family candidate",
        state: "skipped",
        skipReason: "no rice-capable lightweight checkpoint is committed to the repo; training/export required",
        howToRun: "train MobileNetV3-Small on the agreed rice dataset (Phase 2), export ONNX, add rows here",
        latencyMs: null },
      { id: "other-lightweight-vision", label: "Other lightweight vision candidates (EfficientNet-lite, ResNet-18)",
        state: "skipped",
        skipReason: "candidate selection deferred to Rice Phase 2 dataset availability",
        howToRun: "same export/eval pipeline as backend/eval/export_and_eval.py",
        latencyMs: null },
    ];

    const result = {
      dataClass: DATA_CLASS,
      title: "Crop Doctor benchmark (PlantVillage hold-out, public benchmark — NOT field accuracy)",
      runMeta: buildRunMeta("rice-cropdoctor-v1",
        ["../models/onnx_eval_results.json", "eval/results/cropdoctor.json"],
        { modelHash: hashFile(join(process.cwd(), "public", "models", "efficientnet_b0_plantvillage.onnx")),
          inference: "recorded ONNX run (2026-08-27) — no re-inference in this environment" }),
      dataset: {
        total: rows.length,
        origin: "plantvillage-eval (120-image hold-out: 6 classes × 20; Tomato/Potato/Pepper — NO rice classes)",
        path: "backend/eval/dataset/manifest.json",
        groundTruthNote: "public benchmark labels; performance on PlantVillage ≠ field accuracy",
      },
      arms,
      cropStrategy: {
        currentCoverage: classes,
        riceCoveredByCurrentModel: false,
        measured: { universalModelBytes: modelBytes, onnxSha256: hashFile(join(process.cwd(), "public", "models", "efficientnet_b0_plantvillage.onnx")) },
        hypothesis: "crop router → per-crop models",
        storageFormula: "per-crop total = n_crops × modelBytes (load-time and RAM: not measured here)",
        note: "Rice requires a NEW trained model; the production crop gate already abstains (UNKNOWN_CROP) — measured in offline edge-case tests",
      },
      taskBreakdown: {
        measured: ["top-1 accuracy", "per-class precision/recall/F1", "macro F1", "confusion matrix", "Wilson CI"],
        notMeasuredHere: {
          "top-3": "recorded eval rows store top-1 only — requires inference dump with top-k probabilities",
          "calibration/ECE": "requires per-class probabilities from a re-run",
          "abstention/unknown-crop": "production gate thresholds are deterministic (p<0.6 → INSUFFICIENT_EVIDENCE; crop gate UNKNOWN_CROP); asserted in KRISHIVERSE/test/diagnose.offline.edgecases.test.js",
          "inference latency (ONNX WASM)": "browser-only measurement — see howToRun for Mobile/Mediatek devices",
        },
      },
      limitations: [
        "6-class PlantVillage hold-out only; NO rice classes exist — no rice accuracy claim can be made.",
        "Metrics re-derived from recorded predictions (models/onnx_eval_results.json), not a fresh inference run.",
        "Top-3, ECE, quantized/MobileNet variants: not measured — commands recorded above.",
        "Mobile latency/RAM: requires device run (see mobile.benchmark limitations).",
      ],
    };
    validateBenchmarkResult(result);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "cropdoctor-benchmark.json"), JSON.stringify(result, null, 1));

    expect(rows.length).toBe(120);
    expect(accuracy).toBeCloseTo(recorded.accuracy, 3);
    expect(macroF1).toBeGreaterThan(0.5);
    // mirror consistency (admin reads the backend copy)
    if (existsSync(ONNX_EVAL_MIRROR)) {
      expect(hashFile(ONNX_EVAL_MIRROR)).toBe(hashFile(ONNX_EVAL));
    }
  }, 60000);
});
