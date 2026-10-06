/**
 * Phase 3E.1: Authoritative Activation Regression Tests
 *
 * Proves the controlled TNAU pilot activation against every required gate:
 *
 *  1. A TNAU record with a genuine sourceUrl passes the approved activation path.
 *  2. A TNAU record without sourceUrl remains unverified.
 *  3. sourceOrganization survives the entire pipeline.
 *  4. region remains null when absent.
 *  5. region is never inferred from sourceOrganization or record ID.
 *  6. Synthetic records cannot become authoritative.
 *  7. Quarantined records cannot become authoritative.
 *  8. Guessed/fabricated URL patterns cannot satisfy provenance requirements.
 *  9. Invalid relationships cannot be activated.
 * 10. Valid relationships remain intact.
 * 11. Provenance survives IndexedDB normalization and retrieval.
 * 12. Dosage/high-risk safety behavior remains unchanged.
 *
 * Uses the REAL pilot records under knowledge/tnau-pilot/ (not fixtures) so the
 * activated state itself is under test.
 */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { parseMarkdown } from "../src/services/ingestion/importer.js";
import { normalizeRecord, addProvenance } from "../src/services/ingestion/normalizer.js";
import { validateRecord, validateRelationships } from "../src/services/ingestion/validator.js";
import { metadataFor, classifyRecord, normalizeCrop } from "../src/services/db/kbNormalize.js";
import { dbPut, dbGetAll, dbClear } from "../src/services/db/indexedDb.js";
import { DB_STORES } from "../src/services/db/schemas.js";
import {
  buildInvertedIndex,
  fastSearch,
  resetIndex,
} from "../src/services/ai/AgriculturalNLP.js";
import { validateResponse } from "../src/services/ai/ResponseValidator.js";
import { recordMatchesQueryCrop } from "../src/services/ai/aiRouter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PILOT_DIR = resolve(__dirname, "../knowledge/tnau-pilot");

const REAL_SOURCE_URL = "https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html";

function loadPilot(file) {
  const doc = readFileSync(resolve(PILOT_DIR, file), "utf8");
  const out = parseMarkdown(doc);
  expect(out.data.length, `${file} must parse to exactly one record`).toBe(1);
  return out.data[0];
}

const rawDisease = () => loadPilot("rice-blast.md");
const rawTreatment = () => loadPilot("rice-blast-treatment.md");

beforeAll(async () => {
  await dbClear(DB_STORES.diseasePests);
});
afterAll(async () => {
  await dbClear(DB_STORES.diseasePests);
});

// ─── 1 ────────────────────────────────────────────────────────────────────────
describe("1. genuine sourceUrl record passes the approved activation path", () => {
  it("rice-blast.md validates with zero errors and explicit verified=true preserved", () => {
    const n = normalizeRecord(rawDisease(), "disease", "TNAU pilot");
    const res = validateRecord(n, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res.errors).toEqual([]);
    expect(res.valid).toBe(true);
    expect(n.verified).toBe(true);
    expect(n.source).toBe("TNAU");
    expect(n.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(n.sourceOrganization).toBe("TNAU");
  });

  it("verification requires BOTH source and sourceUrl (contract rule, at activation)", () => {
    const n = normalizeRecord(rawDisease(), "disease", "TNAU pilot");
    expect(n.source && n.sourceUrl && n.verified === true).toBe(true);
  });
});

// ─── 2 ────────────────────────────────────────────────────────────────────────
describe("2. provenance is required — nothing verifies without a sourceUrl", () => {
  it("the activated treatment record carries full provenance (Phase 3E.2 gate passed)", () => {
    const n = normalizeRecord(rawTreatment(), "treatment", "TNAU pilot");
    expect(n.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(n.verified).toBe(true);
    expect(n.source).toBe("TNAU");
    expect(n.sourceOrganization).toBe("TNAU");
    expect(n.region).toBeNull(); // never inferred from sourceOrganization

    const res = validateRecord(n, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res.errors).toEqual([]);
    expect(res.valid).toBe(true);
  });

  it("a record without sourceUrl cannot claim verified — provenance error", () => {
    const { sourceUrl, ...noUrl } = rawTreatment();
    expect(sourceUrl).toBeTruthy(); // the real record really does have one
    const n = normalizeRecord(noUrl, "treatment", "TNAU pilot");
    expect(n.sourceUrl).toBeNull();

    // verified survives from the input (the normalizer never clears it), but
    // validation must reject the record: verified without provenance is fatal.
    expect(n.verified).toBe(true);
    const res = validateRecord(n, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res.valid).toBe(false);
    expect(res.errors.join(" ")).toMatch(/provenance incomplete|missing source/i);

    // And forging verified=true on the unprovenanced copy fails identically.
    const forged = { ...n, verified: true };
    const res2 = validateRecord(forged, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res2.valid).toBe(false);
    expect(res2.errors.join(" ")).toMatch(/provenance incomplete|missing source/i);
  });

  it("normalization never fabricates sourceUrl or verified on an unprovenanced copy", () => {
    const { sourceUrl, verified, verifiedDate, ...bare } = rawTreatment();
    expect(sourceUrl).toBeTruthy();
    expect(verified).toBe(true);
    const n = normalizeRecord(bare, "treatment", "TNAU pilot");
    expect(n.sourceUrl).toBeNull();
    expect(n.verified).not.toBe(true);
    expect(n.verifiedDate).toBeNull();
  });
});

// ─── 3, 4, 11 ─────────────────────────────────────────────────────────────────
describe("3/4/11. provenance survives raw → normalize → IndexedDB → retrieval", () => {
  it("source, sourceUrl, sourceOrganization, region, verified survive every stage", async () => {
    // Stage: parse + ingestion normalization
    const n = addProvenance([normalizeRecord(rawDisease(), "disease", "TNAU pilot")], {
      source: "TNAU pilot",
      batchId: "3e1",
    })[0];
    expect(n.source).toBe("TNAU");
    expect(n.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(n.sourceOrganization).toBe("TNAU");
    expect(n.region).toBeNull();
    expect(n.verified).toBe(true);

    // Stage: IndexedDB normalization (metadataFor)
    const meta = metadataFor("curated", n);
    expect(meta.source).toBe("TNAU");
    expect(meta.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(meta.sourceOrganization).toBe("TNAU");
    expect(meta.region).toBeNull();
    expect(meta.verified).toBe(true);
    expect(meta.status).toBe("active");

    // Stage: IndexedDB write → read
    const stored = { ...n, ...meta };
    await dbPut(DB_STORES.diseasePests, stored);
    const all = await dbGetAll(DB_STORES.diseasePests);
    const loaded = all.find((r) => r.id === "tnau_rice_blast");
    expect(loaded, "record must be readable from IndexedDB").toBeTruthy();
    expect(loaded.source).toBe("TNAU");
    expect(loaded.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(loaded.sourceOrganization).toBe("TNAU");
    expect(loaded.region).toBeNull();
    expect(loaded.verified).toBe(true);

    // Stage: offline retrieval + Stack A evidence-contract projection
    resetIndex();
    buildInvertedIndex({ crops: [], symptoms: [], diseases: all, treatments: [], edges: [] });
    const { records } = fastSearch("rice blast neck symptoms", { type: "disease", limit: 5 });
    const hit = records.map((h) => h.record).find((r) => r.id === "tnau_rice_blast");
    expect(hit, "retrieval must return the activated record").toBeTruthy();
    const contract = {
      source: hit.source ?? null,
      sourceUrl: hit.sourceUrl ?? null,
      sourceOrganization: hit.sourceOrganization ?? null,
      region: hit.region ?? null,
      verified: hit.verified === true,
    };
    expect(contract).toEqual({
      source: "TNAU",
      sourceUrl: REAL_SOURCE_URL,
      sourceOrganization: "TNAU",
      region: null,
      verified: true,
    });
  });

  it("5. region is never inferred from sourceOrganization or record id", () => {
    const fromOrg = metadataFor("curated", {
      id: "tnau_tamil_nadu_blast",
      source: "TNAU",
      sourceOrganization: "TNAU",
    });
    expect(fromOrg.region).toBeNull();

    const fromNormalize = normalizeRecord(
      { id: "tnau_tamil_nadu_blast", sourceOrganization: "TNAU", source: "TNAU" },
      "disease",
      "TNAU pilot",
    );
    expect(fromNormalize.region).toBeNull();

    // Absent fields stay null through normalization — never fabricated.
    const absent = metadataFor("curated", { id: "x", name: "X" });
    expect(absent.sourceOrganization).toBeNull();
    expect(absent.region).toBeNull();
    expect(absent.verified).toBe(false);
  });
});

// ─── 6, 7 ─────────────────────────────────────────────────────────────────────
describe("6/7. synthetic and quarantined records can never become authoritative", () => {
  it("synthetic classification forces verified=false, quarantine and zero confidence", () => {
    const spoofed = {
      id: "disease_12",
      name: "Blast 12",
      verified: true,
      source: "TNAU",
      sourceUrl: REAL_SOURCE_URL,
      sourceOrganization: "TNAU",
    };
    expect(classifyRecord(spoofed, "diseasePests")).toBe("synthetic");
    const meta = metadataFor("synthetic", spoofed);
    expect(meta.verified).toBe(false); // forced — synthetic can never verify
    expect(meta.status).toBe("quarantined");
    expect(meta.confidence).toBe(0);
    expect(meta.quarantineReason).toBeTruthy();

    const n = normalizeCrop(spoofed, "synthetic");
    expect(n.verified).toBe(false);
    expect(n.status).toBe("quarantined");
    expect(n.searchable).toBe(false);
  });

  it("quarantined records are excluded from offline retrieval (never evidence)", () => {
    resetIndex();
    buildInvertedIndex({
      crops: [],
      symptoms: [],
      diseases: [
        {
          id: "dp_quarantined_fake",
          name: "Rice Blast quarantined fake",
          cropId: "crop_rice",
          status: "quarantined",
          recordKind: "synthetic",
          searchable: false,
        },
      ],
      treatments: [],
      edges: [],
    });
    const ids = fastSearch("rice blast", { limit: 5 }).records.map((r) => r.record.id);
    expect(ids).not.toContain("dp_quarantined_fake");
  });
});

// ─── 8 ────────────────────────────────────────────────────────────────────────
describe("8. guessed/fabricated URL patterns cannot satisfy provenance requirements", () => {
  it("a plausible-looking URL alone never auto-verifies (normalizer never sets verified)", () => {
    const n = normalizeRecord(
      {
        id: "dp_fabricated_1",
        name: "Fabricated entry",
        source: "TNAU",
        sourceUrl: "https://agritech.tnau.ac.in/fabricated/path-that-may-not-exist",
        sourceOrganization: "TNAU",
      },
      "disease",
      "TNAU pilot",
    );
    expect(n.verified).not.toBe(true); // URL shape/pattern proves nothing by itself
  });

  it("verified=true without sourceUrl is a validation ERROR", () => {
    const n = normalizeRecord(rawDisease(), "disease", "TNAU pilot");
    const res = validateRecord({ ...n, sourceUrl: null }, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res.valid).toBe(false);
    expect(res.errors.join(" ")).toMatch(/provenance incomplete/);
  });

  it("verified=true with empty sourceUrl is a validation ERROR", () => {
    const n = normalizeRecord(rawDisease(), "disease", "TNAU pilot");
    const res = validateRecord({ ...n, sourceUrl: "" }, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res.valid).toBe(false);
    expect(res.errors.join(" ")).toMatch(/empty source/);
  });

  it("sourceOrganization never substitutes for source/verification", () => {
    const n = normalizeRecord(
      { id: "dp_org_only", name: "Org only", sourceOrganization: "TNAU", verified: true },
      "disease",
      "TNAU pilot",
    );
    // normalizeRecord: source falls back to caller source ('TNAU pilot' here), but
    // verified=true without a sourceUrl must still fail validation.
    const res = validateRecord({ ...n, source: "TNAU" }, ["crop_rice"], []);
    expect(res.valid).toBe(false);
    expect(res.errors.join(" ")).toMatch(/provenance incomplete/);
  });
});

// ─── 9, 10 ────────────────────────────────────────────────────────────────────
describe("9/10. relationship integrity", () => {
  it("9. a treatment referencing an unknown diseaseId cannot be activated", () => {
    const t = normalizeRecord(
      { ...rawTreatment(), diseaseId: "dp_fabricated_disease" },
      "treatment",
      "TNAU pilot",
    );
    const res = validateRecord(t, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res.valid).toBe(false);
    expect(res.errors.join(" ")).toMatch(/unrecognized diseaseId/i);

    const rel = validateRelationships([t], ["crop_rice"], ["tnau_rice_blast"]);
    expect(rel.valid).toBe(false);
    expect(rel.relationshipErrors.some((e) => e.type === "invalid_disease_ref")).toBe(true);
  });

  it("10. the pilot's valid crop↔disease and treatment↔disease links remain intact", () => {
    const disease = normalizeRecord(rawDisease(), "disease", "TNAU pilot");
    const treatment = normalizeRecord(rawTreatment(), "treatment", "TNAU pilot");

    const dRes = validateRecord(disease, ["crop_rice"], ["tnau_rice_blast"]);
    expect(dRes.errors.filter((e) => /crop/i.test(e))).toEqual([]);
    expect(disease.cropId).toBe("crop_rice");

    const tRes = validateRecord(treatment, ["crop_rice"], ["tnau_rice_blast"]);
    expect(tRes.errors).toEqual([]); // diseaseId now resolves after activation
    expect(treatment.diseaseId).toBe("tnau_rice_blast");

    const rel = validateRelationships(
      [disease, treatment],
      ["crop_rice"],
      ["tnau_rice_blast"],
    );
    expect(rel.valid).toBe(true);
    expect(rel.relationshipErrors).toEqual([]);
    expect(rel.info.some((i) => i.type === "crop_disease_link")).toBe(true);
    expect(rel.info.some((i) => i.type === "treatment_disease_link")).toBe(true);
  });
});

// ─── 12 ───────────────────────────────────────────────────────────────────────
describe("12. dosage/high-risk safety behavior remains unchanged", () => {
  const doseAnswer = "Spray Copper Oxychloride 3g/L on the tomato leaves.";

  it("an unprovenanced dose answer stays blocked and stripped", () => {
    const v = validateResponse({
      answer: doseAnswer,
      source: "local-knowledge-base",
      confidence: 0.8,
      records: [
        { id: "tr_unsourced", name: "Copper Oxychloride", chemicalControl: "3g/L", recordKind: "treatment" },
      ],
      evidence: [],
      parsed: { crop: "tomato" },
      intent: "disease",
    });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toContain("3g/L");
    expect(v.reasons).toContain("high_risk_without_verified_source");
  });

  it("a verified record from ANOTHER crop cannot unlock the dose (crop-scoped evidence)", () => {
    const riceVerified = {
      id: "tnau_rice_blast",
      name: "Rice Blast (Blast Disease)",
      cropId: "crop_rice",
      source: "TNAU",
      sourceUrl: REAL_SOURCE_URL,
      verified: true,
    };
    const tomatoDoseRecords = [
      {
        id: "tr_tomato_blight_chem",
        name: "Copper Oxychloride",
        chemicalControl: "Copper Oxychloride 3g/L spray",
        cropId: "crop_tomato",
        recordKind: "treatment",
      },
    ];

    // Phase 3E.2: the validator blocks this even when evidence is NOT scoped —
    // a crop-declaring verified record only backs a dose for an established,
    // matching crop (`isDosageBacker`). Router scoping (Phase 3E.1) stays as
    // defence in depth, so the rice record never even reaches this check.
    const unscoped = validateResponse({
      answer: doseAnswer,
      source: "local-knowledge-base",
      confidence: 0.8,
      records: tomatoDoseRecords,
      evidence: [riceVerified],
      parsed: { crop: "tomato" },
      intent: "disease",
    });
    expect(unscoped.verdict).toBe("blocked");
    expect(unscoped.safeAnswer).not.toContain("3g/L");
    expect(unscoped.reasons).toContain("high_risk_verified_evidence_crop_ineligible");

    // Router scoping (Phase 3E.1): the rice record is not eligible evidence for
    // a tomato question, so it can never back the tomato dose.
    expect(recordMatchesQueryCrop(riceVerified, "tomato")).toBe(false);
    const scopedEvidence = [riceVerified].filter((r) => recordMatchesQueryCrop(r, "tomato"));
    expect(scopedEvidence).toEqual([]);

    const scoped = validateResponse({
      answer: doseAnswer,
      source: "local-knowledge-base",
      confidence: 0.8,
      records: tomatoDoseRecords,
      evidence: scopedEvidence,
      parsed: { crop: "tomato" },
      intent: "disease",
    });
    expect(scoped.verdict).toBe("blocked");
    expect(scoped.safeAnswer).not.toContain("3g/L");
  });

  it("crop scoping keeps same-crop and crop-agnostic evidence eligible (no over-filtering)", () => {
    const riceVerified = { id: "tnau_rice_blast", cropId: "crop_rice", verified: true, source: "TNAU" };
    expect(recordMatchesQueryCrop(riceVerified, "rice")).toBe(true);
    expect(recordMatchesQueryCrop(riceVerified, "paddy")).toBe(true); // alias → rice
    expect(recordMatchesQueryCrop({ id: "faq_1" }, "tomato")).toBe(true); // crop-agnostic
    expect(recordMatchesQueryCrop(riceVerified, null)).toBe(true); // no crop in query

    // Same-crop verified backing still permits the dose (unchanged behavior).
    const v = validateResponse({
      answer: "Spray Tricyclazole 1g/L on rice at tillering.",
      source: "local-knowledge-base",
      confidence: 0.9,
      records: [riceVerified],
      evidence: [],
      parsed: { crop: "rice" },
      intent: "disease",
    });
    expect(v.verdict).not.toBe("blocked");
  });

  it("provenance fields never bypass ResponseValidator for a cross-crop claim", () => {
    // Even the fully-verified activated record cannot vouch for a wheat dose.
    const activated = {
      id: "tnau_rice_blast",
      cropId: "crop_rice",
      source: "TNAU",
      sourceUrl: REAL_SOURCE_URL,
      sourceOrganization: "TNAU",
      verified: true,
      region: null,
    };
    expect(recordMatchesQueryCrop(activated, "wheat")).toBe(false);
    const evidence = [activated].filter((r) => recordMatchesQueryCrop(r, "wheat"));
    const v = validateResponse({
      answer: "Apply Carbofuran 3kg/ha on wheat.",
      source: "local-knowledge-base",
      confidence: 0.9,
      records: [{ id: "tr_wheat_unsourced", recordKind: "treatment", chemicalControl: "3kg/ha" }],
      evidence,
      parsed: { crop: "wheat" },
      intent: "disease",
    });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toContain("3kg/ha");
  });
});
