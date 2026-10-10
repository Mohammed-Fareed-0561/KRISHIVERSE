/**
 * eval/mobile-ai/benchmarks/conditionalrag.benchmark.test.js
 *
 * Spec §8 — conditional-RAG arm study: ALWAYS vs CONDITIONAL retrieval gating
 * (latency + quality parity).
 *
 * Production grounding (read-only references):
 *  - aiRouter.routeFreeTextQuestion calls getEvidenceRecords() on EVERY query
 *    (src/services/ai/aiRouter.js:152) — ALWAYS behavior.
 *  - IndexedDBChatbotEngine.answerFreeText short-circuits about/greeting/help
 *    before retrieval (src/services/ai/IndexedDBChatbotEngine.js:121), but
 *    still runs 4 fastSearch calls for scheme/weather/price and then ignores
 *    them — wasted work the candidate gate removes.
 *
 * Candidate CONDITIONAL gate: skip retrieval only for intents whose answers
 * never read KB hits (about, greeting, help, scheme, weather, price).
 * Every evidence-bearing query — including ALL rice screening and rag cases —
 * stays gated IN (asserted). Never modifies production ranking or routing.
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { RICE_CHATBOT_CASES } from "../datasets/riceChatbotCases.js";
import { retrievalArms } from "../adapters/kbRag.js";
import { buildInvertedIndex, resetIndex, parseQuery } from "../../../src/services/ai/AgriculturalNLP.js";
import { CROPS } from "../../../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../../../src/data/seed/treatmentData.js";
import { buildRunMeta } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";
import { latencyStats } from "../scoring.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");

/** Intents whose answers never read KB hits → candidate gate skips retrieval. */
const CANDIDATE_GATE_OUT = new Set(["about", "greeting", "help", "scheme", "weather", "price"]);
/** What production actually skips today (IndexedDBChatbotEngine meta short-circuit). */
const PRODUCTION_GATE_OUT = new Set(["about", "greeting", "help"]);

/**
 * Synthetic meta probes — never farmer data. Verify the gate on intents that
 * do NOT appear in the rice screening set. Phrasings validated to parse to the
 * intended intent (phrase-first intents like "what is the weather" parse as
 * what_is, so those are deliberately avoided).
 */
const META_PROBES = [
  { id: "meta-en-greeting", type: "meta", language: "en", input: "Good morning",
    expected: { candidateGateOut: true, productionGateOut: true } },
  { id: "meta-en-help", type: "meta", language: "en", input: "help",
    expected: { candidateGateOut: true, productionGateOut: true } },
  { id: "meta-en-about", type: "meta", language: "en", input: "what can you do",
    expected: { candidateGateOut: true, productionGateOut: true } },
  { id: "meta-en-weather", type: "meta", language: "en", input: "weather in madurai today",
    expected: { candidateGateOut: true, productionGateOut: false } },
  { id: "meta-en-price", type: "meta", language: "en", input: "paddy price today",
    expected: { candidateGateOut: true, productionGateOut: false } },
  { id: "meta-en-scheme", type: "meta", language: "en", input: "pm kisan scheme",
    expected: { candidateGateOut: true, productionGateOut: false } },
];

const CASES = [...RICE_CHATBOT_CASES, ...META_PROBES];

function runMode(mode) {
  const rows = [];
  const lat = [];
  for (const c of CASES) {
    const t0 = performance.now();
    const parsed = parseQuery(c.input);
    const gateOut = mode === "conditional" && CANDIDATE_GATE_OUT.has(parsed.intent);
    const ids = gateOut ? [] : retrievalArms.existing.run(c.input, 5);
    lat.push(performance.now() - t0);
    rows.push({
      caseId: c.id, type: c.type, language: c.language, intent: parsed.intent,
      gateOut, retrievalCalls: gateOut ? 0 : 1,
      hit: c.type === "rag" ? c.expected.recordIds.every((id) => ids.includes(id)) : null,
      topIds: ids.slice(0, 5),
    });
  }
  const byIntent = Object.fromEntries([...new Set(rows.map((r) => r.intent))].map((i) => {
    const g = rows.filter((r) => r.intent === i);
    return [i, { n: g.length, retrievalCalls: g.reduce((a, r) => a + r.retrievalCalls, 0) }];
  }));
  return {
    mode,
    rows,
    retrievalCalls: rows.reduce((a, r) => a + r.retrievalCalls, 0),
    latencyMs: latencyStats(lat),
    byIntent,
  };
}

describe("eval/mobile-ai conditional-RAG study (spec §8)", () => {
  it("measures ALWAYS vs CONDITIONAL retrieval gating: call counts, latency, quality parity", () => {
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });
    // Warm-up so the first measured mode does not eat JIT/index warm-up cost.
    for (let i = 0; i < 3; i++) retrievalArms.existing.run("rice blast treatment", 5);

    const always = runMode("always");
    const conditional = runMode("conditional");

    // ── HARD quality assertions (never traded for latency) ─────────────────
    // 1. Every evidence-bearing rice case stays gated IN under CONDITIONAL.
    const riceRows = conditional.rows.filter((r) => r.type !== "meta");
    expect(riceRows.length).toBe(RICE_CHATBOT_CASES.length);
    expect(riceRows.every((r) => !r.gateOut)).toBe(true);

    // 2. rag hit parity: conditional must never lose a retrieval hit.
    const ragRows = conditional.rows.filter((r) => r.type === "rag");
    expect(ragRows.length).toBeGreaterThan(0);
    for (const r of ragRows) {
      const a = always.rows.find((x) => x.caseId === r.caseId);
      expect(r.hit).toBe(a.hit);
    }

    // 3. meta probes gate exactly as designed (candidate + production parity).
    for (const probe of META_PROBES) {
      const row = conditional.rows.find((r) => r.caseId === probe.id);
      expect(row.gateOut).toBe(probe.expected.candidateGateOut);
      const prodGateOut = PRODUCTION_GATE_OUT.has(row.intent);
      expect(prodGateOut).toBe(probe.expected.productionGateOut);
    }

    // 4. The candidate gate actually saves retrieval calls.
    expect(always.retrievalCalls).toBe(CASES.length);
    expect(conditional.retrievalCalls).toBeLessThan(always.retrievalCalls);

    const saved = always.retrievalCalls - conditional.retrievalCalls;
    const result = {
      dataClass: DATA_CLASS,
      title: "Conditional vs ALWAYS retrieval gating (spec §8, screening, NOT accuracy)",
      runMeta: buildRunMeta("rice-conditional-rag-v1",
        ["eval/mobile-ai/datasets/riceChatbotCases.js"],
        { modes: "always | conditional", candidateGate: [...CANDIDATE_GATE_OUT].join(","),
          productionGate: [...PRODUCTION_GATE_OUT].join(","), retrieval: "existing lexical (production)" }),
      dataset: {
        total: CASES.length,
        riceSet: RICE_CHATBOT_CASES.length,
        metaProbes: META_PROBES.length,
        origin: "synthetic-screening + synthetic-meta-probe (0 expert-labelled, 0 farmer data)",
        path: "KRISHIVERSE/eval/mobile-ai/benchmarks/conditionalrag.benchmark.test.js",
      },
      arms: [
        {
          id: "always-rag",
          label: "ALWAYS: retrieval on every query (production aiRouter parity, aiRouter.js:152)",
          state: "measured",
          metrics: {
            overall: { queries: CASES.length, retrievalCalls: always.retrievalCalls, ragHits: ragRows.filter((r) => always.rows.find((x) => x.caseId === r.caseId).hit).length, ragN: ragRows.length },
            byIntent: always.byIntent,
          },
          latencyMs: always.latencyMs,
        },
        {
          id: "conditional-rag",
          label: "CONDITIONAL: skip retrieval for about/greeting/help/scheme/weather/price (candidate gate)",
          state: "measured",
          metrics: {
            overall: { queries: CASES.length, retrievalCalls: conditional.retrievalCalls, ragHits: ragRows.filter((r) => r.hit).length, ragN: ragRows.length },
            byIntent: conditional.byIntent,
          },
          latencyMs: conditional.latencyMs,
        },
      ],
      parity: {
        riceRowsGatedIn: true,
        ragHitParity: true,
        metaProbeGateMatches: true,
        note: "quality parity is structural: no evidence-bearing query is gated out (asserted), so answers cannot change",
      },
      savings: {
        retrievalCallsAvoided: saved,
        retrievalCallsAvoidedPct: +((saved / always.retrievalCalls) * 100).toFixed(1),
        latencyDeltaMs: +(always.latencyMs.avg - conditional.latencyMs.avg).toFixed(2),
        latencyNote: "desktop node reference; delta is small because the local index is ~1 ms — savings compound on low-end devices (NOT measured here)",
      },
      productionComparison: {
        always: "aiRouter.js:152 getEvidenceRecords() on every query",
        productionGateOut: [...PRODUCTION_GATE_OUT],
        candidateExtra: ["scheme", "weather", "price"],
        candidateJustification: "IndexedDBChatbotEngine returns scheme/weather/price responses without reading the fastSearch hits computed at lines 134–137 (verified by code read, not by runtime instrumentation)",
      },
      limitations: [
        "Meta probes are synthetic (6 cases) — never farmer data; the rice screening set itself contains zero meta intents.",
        "Wall-clock latency is a desktop node reference, not a low-end Android device (spec §69).",
        "Gate operates on parsed intent only; a future production change to gating requires re-running this study.",
      ],
    };
    validateBenchmarkResult(result);

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "rag-conditional.json"), JSON.stringify(result, null, 1));

    expect(result.arms.filter((a) => a.state === "measured").length).toBe(2);
    expect(result.arms.every((a) => a.metrics && a.latencyMs)).toBe(true);
  }, 60000);
});
