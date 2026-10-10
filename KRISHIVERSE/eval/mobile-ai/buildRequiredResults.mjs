/**
 * eval/mobile-ai/buildRequiredResults.mjs — spec §54 required result files.
 *
 * Produces the 13 spec-named result files from the measured benchmark runs:
 *   direct   : comparison.json, decision-matrix.json (via buildComparison),
 *              safety-results.json (written by safety.benchmark.test.js)
 *   derived  : the remaining 10 — re-titled / merged copies of measured data,
 *              each carrying a `derivedFrom` citation.
 *
 * Nothing is computed, estimated, or invented here — only measured data is
 * re-shaped. Order: buildComparison first (comparison/matrix/utility), then
 * derive, then regenerate the manifest so every required file is checksummed.
 *
 * Usage (npm script chains it): vitest run eval/mobile-ai && node buildRequiredResults.mjs
 */
/* global console, URL, structuredClone */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { main as buildComparisonMain, buildManifest, OUT_MANIFEST } from "./buildComparison.mjs";
import { validateBenchmarkResult, DATA_CLASS } from "./schemas.js";
import { SMALL_LLM_CANDIDATES } from "./adapters/smallLlm.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULTS_DIR = join(HERE, "results");
const REPO = join(HERE, "..", "..");

const read = (file) => JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
const cite = (files) => files.map((f) => `eval/mobile-ai/results/${f}`);

function write(name, obj) {
  validateBenchmarkResult(obj);
  writeFileSync(join(RESULTS_DIR, name), JSON.stringify(obj, null, 1));
  return name;
}

/** Clone a measured result under a §54 title with a derivedFrom citation. */
function derive(name, sourceFile, title) {
  const out = {
    ...structuredClone(read(sourceFile)),
    title,
    derivedFrom: cite([sourceFile]),
    generatedAt: new Date().toISOString(),
  };
  return write(name, out);
}

/** Merge several measured results into one §54 file (arms + datasets merged). */
function merge(name, title, sourceFiles, build) {
  const docs = sourceFiles.map((f) => ({ file: f, json: read(f) }));
  const built = build(docs);
  const out = {
    dataClass: DATA_CLASS,
    title,
    runMeta: docs[0].json.runMeta,
    dataset: docs[0].json.dataset,
    arms: built.arms,
    limitations: [...new Set(docs.flatMap((d) => d.json.limitations || []))],
    derivedFrom: cite(sourceFiles),
    generatedAt: new Date().toISOString(),
  };
  if (built.extra) Object.assign(out, built.extra(docs));
  return write(name, out);
}

function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });
  // 1) comparison.json + decision-matrix.json + mobile-utility-score.json
  buildComparisonMain();

  const written = [];
  const verifyDirect = ["comparison.json", "decision-matrix.json", "safety-results.json"];
  for (const f of verifyDirect) {
    if (!existsSync(join(RESULTS_DIR, f))) {
      throw new Error(`missing direct §54 result: eval/mobile-ai/results/${f} — run the benchmarks first`);
    }
    JSON.parse(readFileSync(join(RESULTS_DIR, f), "utf8"));
    written.push(f);
  }

  // 3. mobile-results — resource profile + §41 utility score
  written.push(merge("mobile-results.json",
    "Mobile results: low-end resource profile (desktop reference) + §41 utility score",
    ["mobile-resources.json", "mobile-utility-score.json"],
    (docs) => {
      const mob = docs[0].json;
      const util = docs[1].json;
      return {
        arms: [...mob.arms, {
          id: "mobile-utility-score",
          label: util.title,
          state: "measured",
          metrics: { architectures: util.architectures, weights: util.weights, before: util.before,
            unmeasuredDimensions: util.unmeasuredDimensions },
          latencyMs: null,
        }],
        extra: () => ({
          dataset: { ...mob.dataset, utilityScore: { measuredWeight: util.measuredWeight,
            unmeasuredDimensions: util.unmeasuredDimensions } },
          limitations: [...mob.limitations, util.readingNote],
        }),
      };
    }));

  // 4. offline-results — OFF-01..20
  written.push(derive("offline-results.json", "offline-benchmark.json",
    "Offline results: matrix OFF-01..20 (simulated fetch injection + network-free local paths)"));

  // 6. grounding-results
  written.push(derive("grounding-results.json", "grounding-guard.json",
    "Grounding results: claim→evidence assessment (deterministic prototype, report-only)"));

  // 7. retrieval-results — lexical/hybrid/external arms + conditional study
  written.push(merge("retrieval-results.json",
    "Retrieval results: Recall@K/MRR arms + conditional vs ALWAYS gating study",
    ["rag-benchmark.json", "rag-conditional.json"],
    (docs) => ({
      arms: [...docs[0].json.arms, ...docs[1].json.arms],
      extra: () => ({ dataset: { ...docs[0].json.dataset, conditionalStudy: docs[1].json.dataset } }),
    })));

  // 8. decision-results
  written.push(derive("decision-results.json", "decision-benchmark.json",
    "Decision results: clarification / candidate selection / Laya sidecar arms"));

  // 9. latency-results — desktop reference only (spec §69)
  written.push(merge("latency-results.json",
    "Latency results (desktop node reference — low-end Android latency NOT MEASURED)",
    ["mobile-resources.json", "chatbot-arms.json", "rag-benchmark.json", "rag-conditional.json", "offline-benchmark.json"],
    (docs) => {
      const [mob, chat, rag, cond, off] = docs.map((d) => d.json);
      const pick = (json, ids) => ids.map((id) => json.arms.find((a) => a.id === id)).filter(Boolean);
      return {
        arms: [
          ...pick(mob, ["desktop-reference"]),
          ...pick(chat, ["A-baseline", "E-nlp-kb-rag", "G-f-laya"]),
          ...pick(rag, ["existing-fastsearch", "hybrid-alias-rrf"]),
          ...pick(cond, ["always-rag", "conditional-rag"]),
          ...pick(off, ["connectivity-probe", "local-path-no-network"]),
        ],
        extra: () => ({
          limitations: [
            "desktop node reference only (spec §69): low-end Android latency NOT MEASURED — no mobile-readiness claim",
            "wall-clock values drift with machine load — read them from this file's current content, not from prose copies",
          ],
        }),
      };
    }));

  // 10. memory-results — heap delta measured (desktop); device RAM not measured
  const mob = read("mobile-resources.json");
  const desktop = mob.arms.find((a) => a.id === "desktop-reference");
  written.push(write("memory-results.json", {
    dataClass: DATA_CLASS,
    title: "Memory results: desktop heap deltas + device-memory gaps (NOT MEASURED)",
    runMeta: mob.runMeta,
    dataset: mob.dataset,
    arms: [
      { id: "heap-delta-index-build", label: "KB index build heap delta (desktop node reference)",
        state: "measured",
        metrics: { kbIndexHeapDeltaMB: desktop.metrics.kbIndexHeapDeltaMB, kbIndexBuildMs: desktop.metrics.kbIndexBuildMs,
          scope: "node.js heap (v8) — not Android renderer/RSS" },
        latencyMs: null },
      { id: "device-memory-under-load", label: "Android device RAM under chatbot load",
        state: "skipped",
        skipReason: "requires on-device profiling (chrome://inspect or Perfetto) — NOT MEASURED in the node harness",
        howToRun: "install the PWA on a low-end Android device, profile Memory in DevTools during a chatbot session, record into results/memory-results.json" },
    ],
    limitations: [
      "Only the desktop heap delta is measured; Android renderer heap/JSSegments NOT MEASURED (spec §69).",
      "Storage footprint (KB/model assets) lives in results/model-results.json.",
    ],
    derivedFrom: cite(["mobile-resources.json"]),
    generatedAt: new Date().toISOString(),
  }));

  // 11. model-results — model catalog + measured/skipped model arms
  written.push(merge("model-results.json",
    "Model results: candidate catalog + measured/skipped model arms (sizes from files, never vendor tables)",
    ["cropdoctor-benchmark.json", "chatbot-arms.json", "mobile-resources.json"],
    (docs) => {
      const [c, ch, m] = docs.map((d) => d.json);
      const pick = (json, ids) => ids.map((id) => json.arms.find((a) => a.id === id)).filter(Boolean);
      const storage = m.arms.find((a) => a.id === "desktop-reference")?.metrics?.storage || null;
      return {
        arms: [
          ...c.arms,
          ...pick(ch, ["H-nlp-needle", "N-best-webllm", "O-best-small-llm"]),
        ],
        extra: () => ({
          modelCatalog: {
            smallLlmCandidates: SMALL_LLM_CANDIDATES,
            onDeviceWebGpuTiers: ["0.5b (Qwen2.5-0.5B-Instruct)", "1.5b (Qwen2.5-1.5B-Instruct)", "3b (Qwen2.5-3B-Instruct)"],
            assetFootprint: storage,
            note: "candidate sizes/licenses are from public sources (2026-08); measured metrics only from runs against these arms",
          },
        }),
      };
    }));

  // 12. ablation-results
  written.push(derive("ablation-results.json", "ablation.json",
    "Ablation results: one local component removed at a time (spec §40)"));

  // 13. arm-results — A..P chatbot arms
  written.push(derive("arm-results.json", "chatbot-arms.json",
    "Arm results: chatbot arms A..P over the rice screening set (spec §3)"));

  // Regenerate the manifest LAST so every required file is checksummed.
  writeFileSync(OUT_MANIFEST, JSON.stringify(buildManifest(), null, 1));

  const required = [
    "comparison.json", "decision-matrix.json", "mobile-results.json", "offline-results.json",
    "safety-results.json", "grounding-results.json", "retrieval-results.json", "decision-results.json",
    "latency-results.json", "memory-results.json", "model-results.json", "ablation-results.json",
    "arm-results.json",
  ];
  const missing = required.filter((f) => !existsSync(join(RESULTS_DIR, f)));
  if (missing.length) throw new Error(`§54 required result files missing: ${missing.join(", ")}`);
  console.log(`[mobile-ai] §54 required results: ${required.length}/${required.length} present in eval/mobile-ai/results/`);
  console.log(`[mobile-ai] derived this run: ${written.filter((f) => !verifyDirect.includes(f)).join(", ")}`);
  console.log(`[mobile-ai] manifest: ${relative(REPO, OUT_MANIFEST)}`);
}

main();
