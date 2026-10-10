/**
 * eval/mobile-ai/benchmarks/mobile.benchmark.test.js
 *
 * Mobile / low-end benchmark (spec §16). DEVICE HONESTY: this environment is
 * a Windows desktop; NO physical Android device was available. Everything
 * measurable here is recorded as "desktop-reference"; everything requiring a
 * phone (first app load, WebGPU model load, WASM inference, battery/thermal,
 * IndexedDB on device) is recorded as NOT MEASURED with the exact procedure
 * to reproduce on hardware. No mobile numbers are invented.
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, readFileSync, writeFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { performance } from "node:perf_hooks";

import { buildInvertedIndex, resetIndex, parseQuery, fastSearch } from "../../../src/services/ai/AgriculturalNLP.js";
import { CROPS } from "../../../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../../../src/data/seed/treatmentData.js";
import { buildRunMeta, environment } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";
import { latencyStats } from "../scoring.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");

function dirBytes(dir) {
  if (!existsSync(dir)) return null;
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const p = join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else { try { total += statSync(p).size; } catch { /* ignore */ } }
    }
  }
  return total;
}

function fileEntry(rel) {
  const abs = join(process.cwd(), rel);
  if (!existsSync(abs)) return { path: rel, bytes: null };
  return { path: rel, bytes: statSync(abs).size };
}

describe("eval/mobile-ai mobile/low-end resource benchmark (desktop reference)", () => {
  it("records measurable resources and marks device-only metrics as not measured", () => {
    // KB index build: time + memory delta
    global.gc?.();
    const memBefore = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });
    const buildMs = performance.now() - t0;
    const memAfter = process.memoryUsage().heapUsed;

    // Simple + complex chatbot query latency (desktop reference)
    const simple = [];
    const complex = [];
    for (let i = 0; i < 50; i++) {
      const ts = performance.now();
      parseQuery("rice blast");
      fastSearch("rice blast", { limit: 5 });
      simple.push(performance.now() - ts);
      const tc = performance.now();
      parseQuery("My paddy leaves have brown spots after rain, what should I do?");
      fastSearch("My paddy leaves have brown spots after rain, what should I do?", { limit: 5 });
      complex.push(performance.now() - tc);
    }

    const modelFiles = [
      "public/models/efficientnet_b0_plantvillage.onnx",
      "public/models/efficientnet_b0_plantvillage.onnx.data",
      "public/models/labels.json",
    ].map(fileEntry);
    const kbFiles = ["src/data/kb/v2/crops.json", "src/data/kb/v2/diseasePests.json",
      "src/data/kb/v2/symptoms.json", "src/data/kb/v2/treatments.json", "src/data/kb/v2/edges.json",
      "src/data/kb/v2/manifest.json"].map(fileEntry);
    const distBytes = dirBytes(join(process.cwd(), "dist"));
    const onnxWasmBytes = dirBytes(join(process.cwd(), "public", "onnx"));

    let cdLatencyRef = null;
    const cdPath = join(process.cwd(), "eval", "results", "cropdoctor.json");
    if (existsSync(cdPath)) {
      const cd = JSON.parse(readFileSync(cdPath, "utf8"));
      const ms = (cd.rows || []).map((r) => r.ms).filter((v) => typeof v === "number");
      if (ms.length) cdLatencyRef = { n: ms.length, avg: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2), max: +Math.max(...ms).toFixed(2), scope: "deterministic text/rule path (node)" };
    }

    const result = {
      dataClass: DATA_CLASS,
      title: "Mobile/low-end resource benchmark — DESKTOP REFERENCE ONLY (no Android device available)",
      runMeta: buildRunMeta("rice-mobile-resources-v1", ["eval/mobile-ai/datasets/riceChatbotCases.js"],
        { measurementHost: environment() }),
      dataset: { total: 0, origin: "n/a (resource measurement)" },
      arms: [
        { id: "desktop-reference", label: `Desktop reference (${environment().cpuModel}, ${environment().totalMemMB} MB RAM, ${environment().os})`,
          state: "measured",
          metrics: {
            kbIndexBuildMs: +buildMs.toFixed(1),
            kbIndexHeapDeltaMB: +((memAfter - memBefore) / 1024 / 1024).toFixed(2),
            chatbotSimpleQueryMs: latencyStats(simple),
            chatbotComplexQueryMs: latencyStats(complex),
            cropDoctorTextPathMs: cdLatencyRef,
            storage: {
              onnxModel: modelFiles, onnxWasmRuntimeBytes: onnxWasmBytes,
              kbV2: kbFiles, kbV2TotalBytes: kbFiles.reduce((a, f) => a + (f.bytes || 0), 0),
              distBundleBytes: distBytes,
            },
          },
          latencyMs: latencyStats(simple) },
        { id: "low-end-android", label: "Low-end Android (physical device)", state: "skipped",
          skipReason: "NO physical Android device available in this environment — numbers deliberately NOT invented",
          howToRun: "adb-connected device or Play-store build: record first app load, KB load, model load, query latency via chrome://inspect / adb shell dumpsys meminfo; enter results into eval/mobile-ai/results/mobile-resources.json under a new arm" },
        { id: "mid-range-android", label: "Mid-range Android (physical device)", state: "skipped",
          skipReason: "NO physical Android device available in this environment",
          howToRun: "same procedure as low-end arm" },
        { id: "battery-thermal", label: "Battery/thermal observations", state: "skipped",
          skipReason: "not measurable without physical hardware (adb batterystats / thermal zones)",
          howToRun: "adb shell dumpsys batterystats + thermal HAL readings during a 10-query session" },
      ],
      taskBreakdown: { measured: ["desktop resource baseline"] },
      notMeasured: [
        "first app load (PWA cold start on device)",
        "on-device model load (WebLLM/WebGPU) time and RAM",
        "ONNX WASM inference latency and RAM on device",
        "IndexedDB size on device after KB migration",
        "CPU % sustained on low-end SoC",
        "battery drain / thermal throttling",
        "offline reliability across real radio transitions",
        "uncertain-connectivity behaviour with real network stacks",
      ],
      limitations: [
        "Desktop node measurements are a REFERENCE ONLY — do not quote them as mobile performance.",
        "dist bundle bytes reflect the last local `npm run build` (null when dist/ absent).",
        "Heap deltas are indicative (node V8), not Android RSS.",
      ],
    };
    validateBenchmarkResult(result);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "mobile-resources.json"), JSON.stringify(result, null, 1));

    expect(buildMs).toBeGreaterThan(0);
    expect(modelFiles.every((f) => f.bytes && f.bytes > 0)).toBe(true);
    expect(result.notMeasured.length).toBeGreaterThanOrEqual(6);
    void basename;
  }, 60000);
});
