/**
 * eval/grounding.eval.test.js — Phase 3B grounding check (deterministic trace).
 *
 * For disease queries against the seeded DB, verifies the generated response
 * text contains the matched disease/crop names from the result payload
 * (substring trace, case-insensitive). Report-only.
 *
 * LIMITATION (documented, not solved): substring presence is NOT semantic
 * equivalence — it cannot tell whether a claim is entailed, cherry-picked, or
 * contradicted by the evidence. No LLM evaluator is used (per spec). The
 * ResponseValidator remains the safety backstop for high-risk content.
 */
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { answerFreeText } from "../src/services/ai/IndexedDBChatbotEngine.js";
import { seedAgriculturalData } from "../src/services/db/seedingService.js";
import { dbClear } from "../src/services/db/indexedDb.js";
import { DB_STORES } from "../src/services/db/schemas.js";

/* global process: readonly */

const QUERIES = [
  "tomato early blight concentric rings",
  "chilli leaf curl virus stunted growth",
  "paddy rice crop information",
  "தக்காளி கருகல் நோய்",
];

function collectNames(result) {
  const names = new Set();
  const push = (v) => { if (typeof v === "string" && v.trim().length > 2) names.add(v.trim().toLowerCase()); };
  const walk = (o, depth = 0) => {
    if (!o || depth > 3) return;
    if (Array.isArray(o)) return o.forEach((x) => walk(x, depth + 1));
    if (typeof o === "object") {
      for (const k of ["name", "englishName", "crop", "title"]) push(o[k]);
      for (const v of Object.values(o)) walk(v, depth + 1);
    }
  };
  walk(result?.localResult?.data);
  walk(result?.data);
  return [...names];
}

describe("eval/grounding trace (screening)", () => {
  it("traces evidence names into responses and writes results", async () => {
    await dbClear(DB_STORES.crops);
    await dbClear(DB_STORES.symptoms);
    await dbClear(DB_STORES.diseasePests);
    await dbClear(DB_STORES.treatments);
    await dbClear(DB_STORES.edges);
    await dbClear(DB_STORES.meta);
    await seedAgriculturalData();

    const rows = [];
    for (const q of QUERIES) {
      const r = await answerFreeText(q, {});
      const text = String(r?.response || "").toLowerCase();
      const names = collectNames(r).filter((n) => !/^(tomato|rice|chilli)$/.test(n) || true);
      const matched = names.filter((n) => n.length > 3 && text.includes(n));
      rows.push({
        query: q, type: r?.type || null, names, matched,
        grounded: r?.type === "fallback" || r?.type === "no_match" ? null : matched.length > 0,
      });
    }
    const scored = rows.filter((r) => r.grounded !== null);
    const report = {
      generatedAt: new Date().toISOString(),
      origin: "synthetic-screening trace (substring only — NOT semantic entailment)",
      queries: rows.length, scored: scored.length,
      grounded: scored.filter((r) => r.grounded).length,
      limitation: "Substring matching cannot detect cherry-picking, contradiction, or hallucinated detail around a named entity.",
      rows,
    };
    mkdirSync(join(process.cwd(), "eval", "results"), { recursive: true });
    writeFileSync(join(process.cwd(), "eval", "results", "grounding.json"), JSON.stringify(report, null, 1));
    expect(rows.length).toBe(QUERIES.length);
  }, 180000);
});
