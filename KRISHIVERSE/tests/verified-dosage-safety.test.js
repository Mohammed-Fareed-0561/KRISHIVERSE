/**
 * Phase 3E.2: verified dosage authorization regression tests.
 *
 * The KB now holds its FIRST dose-bearing record with verified=true
 * (tnau_rice_blast_treatment). This suite pins the exact authorization path
 * end-to-end so a future edit cannot quietly widen it:
 *
 *  1. The activated record satisfies the full activation gate (provenance,
 *     classification, validation) — it is earned, never assumed.
 *  2. It is the ONLY verified dosage record in the whole KB.
 *  3. Crop-matched verified evidence authorizes the dose (not blocked).
 *  4. The identical dose with no verified backing stays blocked and stripped.
 *  5. Evidence from another crop can never authorize it, and neither can a
 *     crop-declaring record for a question that never established a crop
 *     (Phase 3E.2 tightening: `isDosageBacker`).
 *  6. Retrieval actually serves the record, and only to the right crop.
 *  7. The unsupported staged claims (0.6 g/L, neem oil, Trichoderma, 10 g/L
 *     spray) are gone from the authoritative content.
 *  8. Quarantined/synthetic records can never be the authorization.
 *  9. The cropless-query leak that activation introduced is closed: generic
 *     "spray schedule" style questions can no longer borrow the rice record to
 *     unlock an unrelated dose, while crop-agnostic verified evidence stays
 *     eligible (no over-tightening).
 *
 * Provenance rules are NOT weakened here — this file only asserts the
 * authorization behavior against the activated record.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { CROPS } from "../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../src/data/seed/treatmentData.js";
import { KNOWLEDGE_GRAPH_EDGES } from "../src/data/seed/edgeData.js";
import massiveDataset from "../src/data/seed/massive_dataset.json";
import { parseMarkdown } from "../src/services/ingestion/importer.js";
import { normalizeRecord } from "../src/services/ingestion/normalizer.js";
import { validateRecord } from "../src/services/ingestion/validator.js";
import { migrateDataset as migrateKbDataset } from "../src/services/db/kbNormalize.js";
import { buildInvertedIndex, fastSearch, parseQuery, resetIndex } from "../src/services/ai/AgriculturalNLP.js";
import { validateResponse } from "../src/services/ai/ResponseValidator.js";
import { recordMatchesQueryCrop } from "../src/services/ai/aiRouter.js";

const ID = "tnau_rice_blast_treatment";
const REAL_SOURCE_URL = "https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html";
const DOSE = "@1g/liter";
const __dirname = dirname(fileURLToPath(import.meta.url));

const raw = {
  crops: [...CROPS, ...massiveDataset.crops],
  symptoms: [...SYMPTOMS, ...massiveDataset.symptoms],
  diseasePests: [...DISEASE_PESTS, ...massiveDataset.diseasePests],
  treatments: [...TREATMENTS, ...massiveDataset.treatments],
  edges: [...KNOWLEDGE_GRAPH_EDGES, ...massiveDataset.edges],
};

let stores;
let report;
let treatment;

const riceDoseAnswer = "Spray Tricyclazole 75% WP @1g/liter on rice at tillering.";

function evidenceFor(crop) {
  return [treatment].filter((r) => recordMatchesQueryCrop(r, crop));
}

function ask({ answer = riceDoseAnswer, evidence = [], crop = "rice" }) {
  return validateResponse({
    answer,
    source: "local-knowledge-base",
    confidence: 0.9,
    records: evidence,
    evidence: [],
    parsed: { crop },
    intent: "disease",
  });
}

beforeAll(() => {
  ({ stores, report } = migrateKbDataset(raw));
  treatment = stores.treatments.find((t) => t.id === ID);
});

describe("1. the activated dose-bearing record satisfies the full gate", () => {
  it("exists, is curated and active (never synthetic, never quarantined)", () => {
    expect(treatment, "the record must be in the migrated KB").toBeTruthy();
    expect(treatment.recordKind).toBe("curated");
    expect(treatment.status).toBe("active");
    expect(treatment.quarantineReason).toBeNull();
    // kbNormalize only stamps `searchable` on crops; for treatments the gate is
    // classification + status, so assert those instead of an absent field.
    expect(treatment.searchable).not.toBe(false);
  });

  it("carries full, non-inferred provenance", () => {
    expect(treatment.source).toBe("TNAU");
    expect(treatment.sourceOrganization).toBe("TNAU");
    expect(treatment.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(treatment.verified).toBe(true);
    expect(treatment.region).toBeNull(); // never inferred from sourceOrganization
    expect(treatment.diseaseId).toBe("tnau_rice_blast");
    expect(treatment.cropId).toBe("crop_rice");
  });

  it("passes the ingestion validator with zero errors (pilot → normalize → validate)", () => {
    // The ingestion gate runs on the CONTENT record (recordKind: "treatment"),
    // not on the migrated record whose recordKind is the provenance class.
    const doc = readFileSync(
      resolve(__dirname, "../knowledge/tnau-pilot/rice-blast-treatment.md"),
      "utf8"
    );
    const parsed = parseMarkdown(doc);
    expect(parsed.data).toHaveLength(1);
    const content = normalizeRecord(parsed.data[0], "treatment", "TNAU pilot");
    const res = validateRecord(content, ["crop_rice"], ["tnau_rice_blast"]);
    expect(res.errors).toEqual([]);
    expect(res.valid).toBe(true);
    expect(content.verified).toBe(true);
    expect(content.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(content.region).toBeNull();
    // The migrated copy must agree with the gated content record.
    expect(treatment.name).toBe(content.name);
    expect(treatment.method).toContain(DOSE);
  });
});

describe("2. it is the ONLY verified dosage record in the KB", () => {
  it("exactly one high-risk dosage treatment has earned provenance", () => {
    const dosage = stores.treatments.filter((t) => t.highRisk && t.dosageType === "numeric");
    const verified = dosage.filter((t) => t.verified === true && t.source && t.sourceUrl);
    expect(verified.map((t) => t.id)).toEqual([ID]);
    expect(report.verifiedDosage).toBe(1);
    expect(report.unverifiedDosage).toBe(2);
    expect(report.recordsWithDosage).toBe(3);
  });

  it("every other dosage record keeps zero provenance", () => {
    const others = stores.treatments.filter(
      (t) => (t.highRisk || t.dosageType) && t.id !== ID
    );
    expect(others.length).toBeGreaterThan(0);
    expect(
      others.every((t) => t.verified === false && t.source === null && t.sourceUrl == null)
    ).toBe(true);
  });
});

describe("3. crop-matched verified evidence authorizes the dose", () => {
  it("rice query: the TNAU dose is not blocked and reaches the farmer", () => {
    expect(evidenceFor("rice")).toHaveLength(1);
    const v = ask({ crop: "rice", evidence: evidenceFor("rice") });
    expect(v.verdict).not.toBe("blocked");
    expect(v.safeAnswer).toContain(DOSE);
    expect(v.reasons).not.toContain("high_risk_without_verified_source");
  });

  it("paddy alias: same authorization (alias resolves to rice)", () => {
    expect(recordMatchesQueryCrop(treatment, "paddy")).toBe(true);
    const v = ask({ crop: "paddy", evidence: evidenceFor("paddy") });
    expect(v.verdict).not.toBe("blocked");
    expect(v.safeAnswer).toContain(DOSE);
  });

  it("no crop in the query: a crop-DECLARING record cannot authorize the dose", () => {
    // The router still treats it as eligible for grounding (no over-filtering),
    // but it may not unlock an exact dose for a question that never named a crop.
    // NB: pass null, not undefined — `ask({ crop = "rice" })` would re-default.
    expect(recordMatchesQueryCrop(treatment, null)).toBe(true);
    const v = ask({ crop: null, evidence: evidenceFor(null) });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toContain(DOSE);
    expect(v.reasons).toContain("high_risk_without_verified_source");
    expect(v.reasons).toContain("high_risk_verified_evidence_crop_ineligible");
  });

  it("no crop in the query: crop-AGNOSTIC verified evidence stays eligible", () => {
    const agnostic = {
      id: "t_crop_agnostic",
      name: "Copper Oxychloride",
      method: "Spray 3g per litre of water",
      verified: true,
      source: "TNAU",
      sourceUrl: "https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html",
      status: "active",
      recordKind: "curated",
    };
    const v = ask({
      crop: null,
      answer: "Use Copper Oxychloride 3g per litre of water.",
      evidence: [agnostic],
    });
    expect(v.verdict).not.toBe("blocked");
    expect(v.safeAnswer).toContain("3g per litre");
  });
});

describe("4. the identical dose with no verified backing stays blocked", () => {
  it("blocked and stripped when evidence is missing", () => {
    const v = ask({ evidence: [] });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toContain(DOSE);
    expect(v.reasons).toContain("high_risk_without_verified_source");
  });

  it("the stale staged dose 0.6g/liter is never backed by the KB", () => {
    const stale = "Spray Tricyclazole 75% WP @ 0.6g per liter water on rice.";
    const v = ask({ answer: stale, evidence: [] });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toContain("0.6g");
    // And the authoritative record must not contain the stale figure either.
    expect(JSON.stringify(treatment)).not.toMatch(/0\.6\s*g/i);
  });
});

describe("5. evidence from another crop can never authorize the dose", () => {
  it("tomato/wheat queries: the rice record is filtered out and the dose blocks", () => {
    for (const crop of ["tomato", "wheat"]) {
      expect(recordMatchesQueryCrop(treatment, crop)).toBe(false);
      const scoped = evidenceFor(crop);
      expect(scoped).toEqual([]);
      const v = ask({ crop, evidence: scoped });
      expect(v.verdict).toBe("blocked");
      expect(v.safeAnswer).not.toContain(DOSE);
    }
  });

  it("belt and braces: even UNSCOPED, a mismatched crop record cannot authorize the dose", () => {
    const unscoped = validateResponse({
      answer: riceDoseAnswer,
      source: "local-knowledge-base",
      confidence: 0.9,
      records: [treatment],
      evidence: [],
      parsed: { crop: "tomato" },
      intent: "disease",
    });
    expect(unscoped.verdict).toBe("blocked"); // Phase 3E.2: validator is now safe alone too
    expect(unscoped.safeAnswer).not.toContain(DOSE);
    expect(recordMatchesQueryCrop(treatment, "tomato")).toBe(false);
  });
});

describe("6. retrieval serves the record, and only to the right crop", () => {
  beforeAll(() => {
    resetIndex();
    buildInvertedIndex(stores);
  });

  it("a rice blast treatment query retrieves it with provenance intact", () => {
    const { records } = fastSearch("rice blast treatment tricyclazole", {
      type: "treatment",
      limit: 5,
    });
    const hit = records.map((r) => r.record).find((r) => r.id === ID);
    expect(hit, "the activated record must be retrievable").toBeTruthy();
    expect(hit.sourceUrl).toBe(REAL_SOURCE_URL);
    expect(hit.verified).toBe(true);
    expect(hit.region).toBeNull();
  });

  it("a tomato query can never use it as evidence (token hits are cropped away)", () => {
    const { records } = fastSearch("tomato early blight copper spray", {
      type: "treatment",
      limit: 10,
    });
    // Retrieval may surface it on a shared token such as "spray" — that is
    // fine; the router's crop scoping is what removes it from evidence.
    const eligible = records
      .map((r) => r.record)
      .filter((rec) => recordMatchesQueryCrop(rec, "tomato"));
    expect(eligible.map((r) => r.id)).not.toContain(ID);
    expect(recordMatchesQueryCrop(treatment, "tomato")).toBe(false);
  });

  it("quarantined/synthetic records are never indexed as evidence", () => {
    resetIndex();
    buildInvertedIndex({
      crops: [],
      symptoms: [],
      diseases: [],
      treatments: [
        {
          ...treatment,
          id: "treatment_999",
          status: "quarantined",
          recordKind: "synthetic",
          searchable: false,
        },
      ],
      edges: [],
    });
    const ids = fastSearch("rice blast treatment", { type: "treatment", limit: 5 }).records.map(
      (r) => r.record.id
    );
    expect(ids).not.toContain("treatment_999");
    resetIndex();
    buildInvertedIndex(stores);
  });
});

describe("7. unsupported staged claims are gone from the authoritative content", () => {
  const text = () => JSON.stringify(treatment);

  it("keeps only source-backed rates", () => {
    expect(text()).toContain(DOSE);        // Tricyclazole 1 g/L  (TNAU blast page)
    expect(text()).toContain("10g/kg");    // Pseudomonas seed treatment
    expect(text()).toContain("0.5%");      // Pseudomonas foliar spray
    expect(text()).toContain("50% WP @1g/liter"); // Carbendazim
  });

  it("drops every claim the TNAU blast pages do not make", () => {
    expect(text()).not.toMatch(/neem\s+oil/i);
    expect(text()).not.toMatch(/trichoderma/i);
    expect(text()).not.toMatch(/10g\/liter/i);   // staged "10g/liter spray"
    expect(text()).not.toMatch(/0\.6\s*g/i);     // staged headline dose
    expect(text()).not.toMatch(/remove and destroy infected plant parts/i);
  });
});

describe("9. the cropless-query leak that activation introduced is closed", () => {
  beforeAll(() => {
    resetIndex();
    buildInvertedIndex(stores);
  });

  function croplessEvidence(query) {
    const parsed = parseQuery(query);
    expect(parsed.crop, `"${query}" must carry no crop for this test`).toBeNull();
    const { records } = fastSearch(query, { type: "treatment", limit: 5 });
    const evidence = records
      .map((r) => r.record)
      .filter((rec) => recordMatchesQueryCrop(rec, parsed.crop));
    return { parsed, evidence };
  }

  const CROPLESS = ["copper oxychloride spray", "spray schedule", "how often should i spray"];

  it.each(CROPLESS)("cropless %s: the rice record cannot unlock an unrelated dose", (q) => {
    const { parsed, evidence } = croplessEvidence(q);
    // Exposure precondition: retrieval DOES surface the activated record and the
    // router's crop scoping is a no-op without a crop — this is the hole.
    expect(evidence.some((r) => r.id === ID)).toBe(true);
    const v = validateResponse({
      answer: "Use Copper Oxychloride 3g/L spray every 10 days.",
      source: "local-knowledge-base",
      confidence: 0.9,
      records: evidence,
      evidence: [],
      parsed,
      intent: "disease",
    });
    expect(v.verdict).toBe("blocked");
    expect(v.safeAnswer).not.toMatch(/3g\/L/i);
    expect(v.reasons).toContain("high_risk_without_verified_source");
    expect(v.reasons).toContain("high_risk_verified_evidence_crop_ineligible");
  });

  it("over-tightening guard: a crop detected in the query still authorizes", () => {
    const parsed = parseQuery("spray schedule for rice blast");
    expect(parsed.crop).toBe("rice");
    const { records } = fastSearch("spray schedule for rice blast", {
      type: "treatment",
      limit: 5,
    });
    const evidence = records
      .map((r) => r.record)
      .filter((rec) => recordMatchesQueryCrop(rec, parsed.crop));
    expect(evidence.some((r) => r.id === ID)).toBe(true);
    const v = validateResponse({
      answer: "Spray Tricyclazole 75% WP @1g/liter at tillering.",
      source: "local-knowledge-base",
      confidence: 0.9,
      records: evidence,
      evidence: [],
      parsed,
      intent: "disease",
    });
    expect(v.verdict).not.toBe("blocked");
    expect(v.safeAnswer).toContain(DOSE);
  });

  it("grounding is untouched: the record stays in the unscoped evidence list", () => {
    const { evidence } = croplessEvidence("spray schedule");
    expect(evidence.length).toBeGreaterThan(1); // no global evidence filtering
    expect(evidence.some((r) => r.id === ID)).toBe(true);
  });
});
