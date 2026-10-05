/**
 * eval/multilingual.eval.test.js — 1E per-language benchmark (EN/TA/Tanglish/HI).
 *
 * Measures separately per language, using real AgriculturalNLP on the real
 * curated seed index: intent accuracy, crop extraction, symptom extraction,
 * clarification behaviour, retrieval recall@K. Writes
 * eval/results/multilingual.json. Report-only (screening, NOT language-support
 * claims — see the header note).
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { parseQuery, buildInvertedIndex, fastSearch, resetIndex } from "../src/services/ai/AgriculturalNLP.js";
import LocalDecisionEngine from "../src/services/ai/decision/LocalDecisionEngine.js";
import { CROPS } from "../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../src/data/seed/treatmentData.js";
import { SCREENING_CASES } from "./cases.screening.js";

describe("eval/multilingual benchmark (screening)", () => {
  it("scores slots per language and writes results", async () => {
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });
    const perLang = {};
    for (const c of SCREENING_CASES) {
      if (!["intent", "chatbot", "rag"].includes(c.type)) continue;
      const L = (perLang[c.language] = perLang[c.language] || {
        n: 0, intentOk: 0, intentN: 0, cropOk: 0, cropN: 0, symptomOk: 0, symptomN: 0,
        clarifyOk: 0, clarifyN: 0, retrievalOk: 0, retrievalN: 0, ms: [],
      });
      const t0 = performance.now();
      const p = parseQuery(c.input);
      L.n++;
      if (c.expected.intent !== undefined) {
        L.intentN++;
        if (p.intent === c.expected.intent) L.intentOk++;
      }
      if (c.expected.crop !== undefined) {
        L.cropN++;
        if (p.crop === c.expected.crop) L.cropOk++;
      }
      if (c.expected.symptom !== undefined) {
        L.symptomN++;
        if (p.symptom === c.expected.symptom) L.symptomOk++;
      }
      if (c.expected.needsClarification !== undefined) {
        L.clarifyN++;
        const d = await LocalDecisionEngine.decide({ task: "clarification", state: { query: c.input, parsed: p } });
        if (d.needsClarification === c.expected.needsClarification) L.clarifyOk++;
      }
      if (c.type === "rag") {
        L.retrievalN++;
        const ids = fastSearch(c.input, { limit: c.expected.minTopK }).records.map((r) => r.record.id);
        if (c.expected.recordIds.every((id) => ids.includes(id))) L.retrievalOk++;
      }
      L.ms.push(Math.round((performance.now() - t0) * 10) / 10);
    }
    for (const L of Object.values(perLang)) {
      L.intentAcc = L.intentN ? L.intentOk / L.intentN : null;
      L.cropAcc = L.cropN ? L.cropOk / L.cropN : null;
      L.symptomAcc = L.symptomN ? L.symptomOk / L.symptomN : null;
      L.clarifyAcc = L.clarifyN ? L.clarifyOk / L.clarifyN : null;
      L.retrievalAcc = L.retrievalN ? L.retrievalOk / L.retrievalN : null;
      L.avgMs = L.ms.reduce((a, b) => a + b, 0) / Math.max(1, L.ms.length);
      delete L.ms;
    }
    const report = {
      generatedAt: new Date().toISOString(),
      origin: "synthetic-screening (NOT language-support evidence)",
      note: "Small screening set. Do not claim Tamil/Hindi/Tanglish support from these counts; see docs/evaluation-report.md for gaps.",
      perLanguage: perLang,
    };
    mkdirSync(join(process.cwd(), "eval", "results"), { recursive: true });
    writeFileSync(join(process.cwd(), "eval", "results", "multilingual.json"), JSON.stringify(report, null, 1));
    expect(Object.keys(perLang).sort()).toEqual(["en", "hi", "ta", "tanglish"]);
  }, 60000);
});
