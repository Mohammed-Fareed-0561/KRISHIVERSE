/**
 * eval/chatbot.eval.test.js — 1C deterministic chatbot benchmark runner.
 *
 * Measures against SCREENING_CASES (screening-only, NOT ground truth):
 * intent accuracy, retrieval recall@K on real curated seeds, clarification
 * behaviour, unsupported-claim handling, safety verdicts, per-language split,
 * and latency. Writes deterministic JSON to eval/results/chatbot.json.
 *
 * Determinism: pure functions only (parseQuery, fastSearch, validateResponse,
 * LocalDecisionEngine). Wall-clock latency is reported, never asserted.
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { parseQuery, buildInvertedIndex, fastSearch, resetIndex } from "../src/services/ai/AgriculturalNLP.js";
import { validateResponse, buildClarification } from "../src/services/ai/ResponseValidator.js";
import LocalDecisionEngine from "../src/services/ai/decision/LocalDecisionEngine.js";
import { CROPS } from "../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../src/data/seed/treatmentData.js";
import { SCREENING_CASES } from "./cases.screening.js";

const OUT = join(process.cwd(), "eval", "results", "chatbot.json");

function buildSeedIndex() {
  resetIndex();
  buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });
}

describe("eval/chatbot benchmark (screening)", () => {
  it("runs all screening cases and writes results", async () => {
    buildSeedIndex();
    const rows = [];
    const lat = [];
    for (const c of SCREENING_CASES) {
      const t0 = performance.now();
      const row = { id: c.id, type: c.type, language: c.language, origin: c.origin };
      try {
        if (c.type === "intent" || c.type === "chatbot") {
          const p = parseQuery(c.input);
          row.intentOk = p.intent === c.expected.intent;
          row.intent = p.intent;
          if (c.expected.crop !== undefined) {
            row.cropOk = p.crop === c.expected.crop;
            row.crop = p.crop;
          }
          if (c.expected.needsClarification !== undefined) {
            const d = await LocalDecisionEngine.decide({ task: "clarification", state: { query: c.input, parsed: p } });
            row.needsOk = d.needsClarification === c.expected.needsClarification;
          }
        } else if (c.type === "rag") {
          const hits = fastSearch(c.input, { limit: c.expected.minTopK });
          const ids = hits.records.map((r) => r.record.id);
          row.recallOk = c.expected.recordIds.every((id) => ids.includes(id));
          row.topIds = ids.slice(0, 5);
          // grounding: an informational answer built from this evidence must not block
          const v = validateResponse({
            answer: `Information related to ${c.input}. Please verify with your local KVK before acting.`,
            source: "eval", records: hits.records.map((r) => r.record),
            parsed: parseQuery(c.input), intent: parseQuery(c.input).intent,
          });
          row.groundingVerdict = v.verdict;
          void buildClarification;
        } else if (c.type === "decision") {
          const d = await LocalDecisionEngine.decide({
            task: c.task, state: c.state, candidates: c.candidates || [], evidence: [],
          });
          if (c.task === "intent_classification") row.decisionOk = d.decision.intent === c.expected.intent;
          else if (c.task === "clarification") row.decisionOk = d.needsClarification === c.expected.needsClarification;
          else row.decisionOk = (d.decision.selected?.id ?? d.decision.selected) === c.expected.selectedId
            && (c.expected.rankedLength === undefined || d.decision.ranked.length === c.expected.rankedLength);
          row.engine = d.engine;
        } else if (c.type === "safety") {
          const v = validateResponse({ answer: c.answer, source: c.source || "eval", evidence: c.evidence || [] });
          row.verdictOk = v.verdict === c.expected.verdict;
          row.verdict = v.verdict;
        } else if (c.type === "disease") {
          row.skipped = "covered by cropdoctor eval";
        }
      } catch (e) {
        row.error = String(e?.message || e);
      }
      row.ms = Math.round((performance.now() - t0) * 10) / 10;
      lat.push(row.ms);
      rows.push(row);
    }

    const ok = (r) => Object.entries(r).some(([k, v]) => /Ok$/.test(k) && v === true)
      && !Object.entries(r).some(([k, v]) => /Ok$/.test(k) && v === false);
    const scored = rows.filter((r) => !r.skipped && !r.error && Object.keys(r).some((k) => /Ok$/.test(k)));
    const passed = scored.filter(ok);
    const byLang = {};
    for (const r of scored) {
      byLang[r.language] = byLang[r.language] || { n: 0, pass: 0 };
      byLang[r.language].n++;
      if (ok(r)) byLang[r.language].pass++;
    }
    const report = {
      generatedAt: new Date().toISOString(),
      origin: "synthetic-screening (NOT ground truth)",
      cases: rows.length, scored: scored.length, passed: passed.length,
      accuracy: scored.length ? passed.length / scored.length : 0,
      byLanguage: byLang,
      latencyMs: { avg: lat.reduce((a, b) => a + b, 0) / Math.max(1, lat.length), max: Math.max(...lat) },
      failures: rows.filter((r) => !ok(r) && !r.skipped).map((r) => r.id),
      rows,
    };
    mkdirSync(join(process.cwd(), "eval", "results"), { recursive: true });
    writeFileSync(OUT, JSON.stringify(report, null, 1));
    // Report-only: screening failures are findings for docs/evaluation-report.md,
    // not suite failures. Hard safety invariants live in eval/safety.regression.test.js.
    expect(report.scored).toBeGreaterThan(0);
    expect(report.cases).toBe(SCREENING_CASES.length);
    if (report.failures.length > 0) console.log(`[eval/chatbot] screening failures: ${report.failures.join(", ")}`);
  }, 60000);
});
