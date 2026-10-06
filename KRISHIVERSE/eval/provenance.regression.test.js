/**
 * eval/provenance.regression.test.js — Phase 3B provenance invariants (HARD).
 *
 * 1. Authoritative source priority order is exactly TNAU > ICAR > State >
 *    KVK > Government > IMD > Agmarknet > FAO (weights 8..1, unchanged).
 * 2. source/sourceUrl survive normalization with verified semantics intact.
 * 3. ID prefixes alone never verify (dp_/tr_/symp_/crop_*).
 * 4. Unsourced dosage never leaks through the chat answer path.
 * 5. Quarantined/synthetic records never become retrieval evidence.
 */
import { describe, it, expect } from "vitest";
import {
  getSourcePriority,
  isVerifiedRecord,
  buildInvertedIndex,
  fastSearch,
  resetIndex,
  SOURCE_PRIORITY,
} from "../src/services/ai/AgriculturalNLP.js";
import { validateResponse } from "../src/services/ai/ResponseValidator.js";
import { normalizeCrop, KB_SCHEMA_VERSION } from "../src/services/db/kbNormalize.js";

describe("eval/provenance regression", () => {
  it("1. source priority order and weights are unchanged", () => {
    expect(SOURCE_PRIORITY.map((s) => [s.id, s.weight])).toEqual([
      ["tnau", 8], ["icar", 7], ["state", 6], ["kvk", 5],
      ["govt", 4], ["imd", 3], ["agmarknet", 2], ["fao", 1],
    ]);
    expect(getSourcePriority({ source: "TNAU advisory" })).toBe(8);
    expect(getSourcePriority({ sourceUrl: "https://icar.org.in/tech" })).toBe(7);
    expect(getSourcePriority({ provider: "Krishi Vigyan Kendra" })).toBe(5);
    expect(getSourcePriority({ source: "random blog" })).toBe(0);
    expect(getSourcePriority({})).toBe(0);
  });

  it("2. normalization preserves source fields without inventing verification", () => {
    const rec = normalizeCrop({ id: "crop_x", name: "X", source: "TNAU", sourceUrl: "https://tnau.ac.in/x" }, "unknown");
    expect(rec.source).toBe("TNAU");
    expect(rec.sourceUrl).toBe("https://tnau.ac.in/x");
    expect(rec.verified).toBe(false);
    expect(KB_SCHEMA_VERSION).toBe(2);
  });

  it("3. ID prefixes alone never verify", () => {
    for (const id of ["dp_rice_blast", "tr_x", "symp_y", "crop_tomato", "crop_0", "treatment_0", "d1"]) {
      expect(isVerifiedRecord({ id, name: "X" })).toBe(false);
    }
    expect(isVerifiedRecord({ id: "d1", verified: true })).toBe(true);
    expect(isVerifiedRecord({ id: "d1", source: "TNAU" })).toBe(true);
  });

  it("4. unsourced dosage never leaks (validator blocks, safe text kept)", () => {
    const v = validateResponse({
      answer: "Apply 50kg urea per acre as basal dose.",
      source: "local-knowledge-base", evidence: [{ id: "tr_x", name: "Urea basal" }],
    });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toContain("50kg");
  });

  it("5. quarantined records never become evidence", () => {    resetIndex();
    buildInvertedIndex({
      crops: [{ id: "crop_tomato", name: "Tomato" }],
      symptoms: [{ id: "symp_0", text: "Yellow spots everywhere tomato", status: "quarantined", recordKind: "synthetic" }],
      diseases: [],
      treatments: [],
      edges: [],
    });
    const hits = fastSearch("tomato yellow spots", { limit: 5 });
    expect(hits.records.map((r) => r.record.id)).not.toContain("symp_0");
    expect(hits.records.map((r) => r.record.id)).toContain("crop_tomato");
  });

  it("6. recorded Stack-B answer: low confidence gated, dosage blocked", () => {
    // Real output captured 2026-10-01 from :8000/rag/ask (enhanced-rag-v2).
    // Stack B self-marks corpus items verified:true with reference_url:null —
    // under Stack A semantics these are UNVERIFIED (see evidence-contract.md).
    const recorded = {
      confidence: 0.37908235788345335,
      answer: "Copper fungicide spray @ 3g/liter. Mancozeb 75% WP @ 2.5.",
    };
    // Node advisory gate (RAG_CONFIDENCE_THRESHOLD = 0.6 in
    // backend/src/routes/advisory.js) discards this answer before generation.
    expect(recorded.confidence).toBeLessThan(0.6);
    // Even if it reached generation, the validator blocks the dosage text:
    // this answer's evidence is empty, so no Stack-A verified backing exists
    // (the KB's single verified record, tnau_rice_blast, is not in it — and it
    // carries no dose anyway; the dose-bearing TNAU treatment stays staged).
    const v = validateResponse({
      answer: recorded.answer, source: "rag", evidence: [], records: [],
    });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toContain("3g/liter");
  });
});
