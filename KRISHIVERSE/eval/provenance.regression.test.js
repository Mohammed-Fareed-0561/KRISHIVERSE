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
import { describe, it, expect, afterAll } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

/**
 * Additive result writer for the admin evaluation dashboard. Every check is
 * re-evaluated live against the production modules so the numbers describe the
 * current build, not a stale copy of the assertions above.
 */
afterAll(() => {
  const checks = [];
  const add = (id, topic, category, pass) =>
    checks.push({ id, language: "en", topic, category, pass: Boolean(pass), rank: null });

  const expectedPriority = [
    ["tnau", 8], ["icar", 7], ["state", 6], ["kvk", 5],
    ["govt", 4], ["imd", 3], ["agmarknet", 2], ["fao", 1],
  ];
  add("prov-01", "priority", "source-priority-order",
    JSON.stringify(SOURCE_PRIORITY.map((s) => [s.id, s.weight])) === JSON.stringify(expectedPriority));

  add("prov-02", "priority", "priority-resolution",
    getSourcePriority({ source: "TNAU advisory" }) === 8
    && getSourcePriority({ sourceUrl: "https://icar.org.in/tech" }) === 7
    && getSourcePriority({ provider: "Krishi Vigyan Kendra" }) === 5
    && getSourcePriority({ source: "random blog" }) === 0
    && getSourcePriority({}) === 0);

  const rec = normalizeCrop({ id: "crop_x", name: "X", source: "TNAU", sourceUrl: "https://tnau.ac.in/x" }, "unknown");
  add("prov-03", "normalization", "normalization-no-invented-verification",
    rec.source === "TNAU" && rec.sourceUrl === "https://tnau.ac.in/x" && rec.verified === false);

  const idCases = ["dp_rice_blast", "tr_x", "symp_y", "crop_tomato", "crop_0", "treatment_0", "d1"];
  add("prov-04", "verification", "id-prefix-never-verifies",
    idCases.every((id) => isVerifiedRecord({ id, name: "X" }) === false)
    && isVerifiedRecord({ id: "d1", verified: true }) === true
    && isVerifiedRecord({ id: "d1", source: "TNAU" }) === true);

  const dose = validateResponse({
    answer: "Apply 50kg urea per acre as basal dose.",
    source: "local-knowledge-base", evidence: [{ id: "tr_x", name: "Urea basal" }],
  });
  add("prov-05", "dosage", "unsourced-dosage-blocked",
    dose.verdict === "blocked" && !String(dose.safeAnswer || "").includes("50kg"));

  resetIndex();
  buildInvertedIndex({
    crops: [{ id: "crop_tomato", name: "Tomato" }],
    symptoms: [{ id: "symp_0", text: "Yellow spots everywhere tomato", status: "quarantined", recordKind: "synthetic" }],
    diseases: [],
    treatments: [],
    edges: [],
  });
  const evidenceIds = fastSearch("tomato yellow spots", { limit: 5 }).records.map((r) => r.record.id);
  add("prov-06", "quarantine", "quarantined-excluded-from-evidence",
    !evidenceIds.includes("symp_0") && evidenceIds.includes("crop_tomato"));

  const recorded = {
    confidence: 0.37908235788345335,
    answer: "Copper fungicide spray @ 3g/liter. Mancozeb 75% WP @ 2.5.",
  };
  const gated = validateResponse({ answer: recorded.answer, source: "rag", evidence: [], records: [] });
  add("prov-07", "stack-b", "low-confidence-gate-and-dosage-blocked",
    recorded.confidence < 0.6 && gated.verdict === "blocked" && !String(gated.safeAnswer || "").includes("3g/liter"));

  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "src", "data", "kb", "v2", "manifest.json"), "utf8"),
  );
  const fullProvenance = manifest?.report?.recordsWithSourceUrl ?? null;
  const kbTotal = manifest?.report?.total ?? null;

  const passed = checks.filter((check) => check.pass).length;
  const total = checks.length;
  const report = {
    generatedAt: new Date().toISOString(),
    origin: "Provenance invariants re-checked against AgriculturalNLP/ResponseValidator + KB manifest report — not an expert-labelled dataset.",
    limitation: "Coverage percentages come from the KB build manifest (source + sourceUrl present); most KB records still carry no provenance fields.",
    total,
    passed,
    failed: total - passed,
    passRate: total ? Math.round((passed / total) * 1000) / 10 : null,
    recordsWithFullProvenance: fullProvenance,
    provenanceCoveragePct: fullProvenance !== null && kbTotal
      ? Math.round((fullProvenance / kbTotal) * 1000 * 100) / 1000
      : null,
    checks,
  };
  mkdirSync(join(process.cwd(), "eval", "results"), { recursive: true });
  writeFileSync(join(process.cwd(), "eval", "results", "provenance.json"), JSON.stringify(report, null, 1));
});
