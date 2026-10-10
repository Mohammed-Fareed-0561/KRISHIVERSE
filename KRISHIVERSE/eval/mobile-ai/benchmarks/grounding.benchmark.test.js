/**
 * eval/mobile-ai/benchmarks/grounding.benchmark.test.js
 *
 * AgriculturalGroundingGuard benchmark (spec §12) + ResponseValidator safety
 * cross-check on the rice adversarial cases. The guard is deterministic and
 * network-free; this runner asserts that property, scores every guard case,
 * and writes eval/mobile-ai/results/grounding-guard.json.
 */
/* global process: readonly */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { assessResponse, GROUNDING_STATUSES } from "../grounding/AgriculturalGroundingGuard.js";
import { GROUNDING_CASES, GROUNDING_DATASET_SUMMARY } from "../datasets/groundingCases.js";
import { RICE_CHATBOT_CASES } from "../datasets/riceChatbotCases.js";
import { validateResponse } from "../../../src/services/ai/ResponseValidator.js";
import { parseQuery } from "../../../src/services/ai/AgriculturalNLP.js";
import { buildRunMeta } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";
import { latencyStats, groupPassRate, passRate } from "../scoring.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");
const GUARD_SRC = join(process.cwd(), "eval", "mobile-ai", "grounding", "AgriculturalGroundingGuard.js");

describe("eval/mobile-ai AgriculturalGroundingGuard benchmark", () => {
  it("stays deterministic and network-free, and scores all grounding cases", () => {
    // A hallucination detector must not become a second hallucinating LLM:
    const src = readFileSync(GUARD_SRC, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(|require\(['"]https?:|axios|openai|ollama|spawn/i);

    const rows = [];
    const lat = [];
    for (const c of GROUNDING_CASES) {
      const t0 = performance.now();
      const out = assessResponse({ answer: c.answer, evidence: c.evidence, context: c.context || {} });
      lat.push(performance.now() - t0);
      const ok = out.overall === c.expected.overall;
      expect(GROUNDING_STATUSES).toContain(out.overall);
      rows.push({ id: c.id, category: c.category, language: c.language,
        expected: c.expected.overall, actual: out.overall, ok,
        claims: out.claims.length, claimStatuses: out.claims.map((x) => `${x.type}:${x.status}`),
        ms: +(performance.now() - t0).toFixed(3) });
    }

    const byCategory = groupPassRate(rows, (r) => r.category);
    const byLanguage = groupPassRate(rows, (r) => r.language);

    // ResponseValidator cross-check on rice safety cases (shared production gate).
    // `hard` cases are hard invariants (unsourced dosage MUST block).
    // Non-hard cases record DESIRED verdicts as report-only findings — a
    // mismatch is a discovered production gap, never hidden, never asserted away.
    const safetyCases = RICE_CHATBOT_CASES.filter((c) => c.type === "safety");
    const safetyRows = safetyCases.map((c) => {
      const parsed = parseQuery(c.input);
      const evidenceRecords = c.evidence || [];
      const v = validateResponse({
        answer: c.answer, source: "eval", records: evidenceRecords, evidence: evidenceRecords,
        parsed, intent: parsed.intent,
      });
      return { id: c.id, hard: Boolean(c.hard), expected: c.expected.verdict, actual: v.verdict,
        ok: v.verdict === c.expected.verdict, reasons: v.reasons };
    });
    const hardSafetyFailures = safetyRows.filter((r) => r.hard && !r.ok);
    const advisorySafetyFindings = safetyRows.filter((r) => !r.hard && !r.ok);

    const result = {
      dataClass: DATA_CLASS,
      title: "AgriculturalGroundingGuard prototype benchmark (deterministic evidence checks)",
      runMeta: buildRunMeta("rice-grounding-guard-v1",
        ["eval/mobile-ai/datasets/groundingCases.js", "eval/mobile-ai/datasets/riceChatbotCases.js"],
        { mode: "deterministic-only", modelVerifier: "not exercised in this run (must stay separate if ever added)" }),
      dataset: { ...GROUNDING_DATASET_SUMMARY, path: "KRISHIVERSE/eval/mobile-ai/datasets/groundingCases.js" },
      arms: [
        { id: "grounding-guard-deterministic", label: "AgriculturalGroundingGuard (isolated prototype)",
          state: "measured",
          metrics: { overall: passRate(rows), byCategory, byLanguage,
            failures: rows.filter((r) => !r.ok).map((r) => `${r.id}: expected ${r.expected} got ${r.actual}`) },
          latencyMs: latencyStats(lat) },
        { id: "response-validator-crosscheck", label: "ResponseValidator (production, read-only) on rice safety cases",
          state: "measured",
          metrics: { overall: passRate(safetyRows.map((r) => ({ ok: r.ok }))),
            failures: safetyRows.filter((r) => !r.ok).map((r) => `${r.id}: ${r.actual}`) },
          latencyMs: null },
        { id: "model-based-verifier", label: "Optional model-based claim verifier (must be separate from deterministic guard)",
          state: "skipped",
          skipReason: "deliberately not run: a model verifier must never be the primary grounding mechanism",
          howToRun: "only as an isolated secondary study, never in the farmer path", latencyMs: null },
      ],
      taskBreakdown: { measured: ["grounding", "safety"] },
      rows,
      safetyCrosscheck: safetyRows,
      safetyHardFailures: hardSafetyFailures,
      safetyAdvisoryFindings: advisorySafetyFindings,
      determinism: { networkFree: true, sourceChecked: true },
      limitations: [
        "Deterministic token-overlap grounding: strong on dosage/provenance conflicts, weaker on paraphrase-heavy support.",
        "Contradiction detection is numeric/units-first; semantic contradictions require future structured KB claims.",
        "All guard cases are synthetic-screening — this measures detector behaviour, not agronomic truth.",
      ],
    };
    validateBenchmarkResult(result);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "grounding-guard.json"), JSON.stringify(result, null, 1));

    expect(rows.length).toBe(GROUNDING_CASES.length);
    expect(hardSafetyFailures).toEqual([]); // hard invariants: unsourced dosage must block
    if (advisorySafetyFindings.length) {
      console.log(`[mobile-ai/grounding] advisory safety findings (report-only): ${advisorySafetyFindings.map((r) => `${r.id} expected ${r.expected} got ${r.actual}`).join("; ")}`);
    }
    const measured = result.arms[0].metrics.overall;
    if (measured.passRate < 0.75) {
      console.log("[mobile-ai/grounding] guard pass rate below 0.75 — see failures array");
    }
  }, 60000);
});
