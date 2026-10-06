// KB migration tests — data-safety suite (Phases 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14).
// - Uses the real seed data + fake-indexeddb (real IndexedDB implementation).
// - Verifies backup, idempotency, classification, quarantine, linking, provenance,
//   high-risk handling, validator compatibility and RAG compatibility.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CROPS } from "../../data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../data/seed/diseaseData.js";
import { TREATMENTS } from "../../data/seed/treatmentData.js";
import { KNOWLEDGE_GRAPH_EDGES } from "../../data/seed/edgeData.js";
import massiveDataset from "../../data/seed/massive_dataset.json";
import {
  KB_SCHEMA_VERSION,
  classifyRecord,
  normalizeCrop,
  migrateDataset,
  makeBackup,
  hashRecords,
  computeCoverage,
  buildRelationshipIndex,
} from "./kbNormalize.js";
import {
  migrateKb,
  restoreKb,
  getKbStatus,
} from "./kbMigration.js";
import { seedAgriculturalData } from "./seedingService.js";
import { dbGetAll, dbGet, dbClear } from "./indexedDb.js";
import { DB_STORES } from "./schemas.js";
import { buildInvertedIndex, fastSearch } from "../ai/AgriculturalNLP.js";
import { routeFreeTextQuestion } from "../ai/aiRouter.js";
import { validateResponse } from "../ai/ResponseValidator.js";

const raw = {
  crops: [...CROPS, ...massiveDataset.crops],
  symptoms: [...SYMPTOMS, ...massiveDataset.symptoms],
  diseasePests: [...DISEASE_PESTS, ...massiveDataset.diseasePests],
  treatments: [...TREATMENTS, ...massiveDataset.treatments],
  edges: [...KNOWLEDGE_GRAPH_EDGES, ...massiveDataset.edges],
};

const totalRecords = Object.values(raw).reduce((a, l) => a + l.length, 0);

beforeAll(async () => {
  await dbClear(DB_STORES.crops);
  await dbClear(DB_STORES.symptoms);
  await dbClear(DB_STORES.diseasePests);
  await dbClear(DB_STORES.treatments);
  await dbClear(DB_STORES.edges);
  await dbClear(DB_STORES.meta);
  await seedAgriculturalData();
}, 120000);

afterAll(async () => {
  await dbClear(DB_STORES.crops);
  await dbClear(DB_STORES.symptoms);
  await dbClear(DB_STORES.diseasePests);
  await dbClear(DB_STORES.treatments);
  await dbClear(DB_STORES.edges);
});

describe("classification (Phase 4)", () => {
  it("recognises curated ids by known prefix", () => {
    expect(classifyRecord({ id: "crop_tomato", name: "Tomato" }, "crops")).toBe("curated");
    expect(classifyRecord({ id: "dp_tomato_early_blight" }, "diseasePests")).toBe("curated");
    expect(classifyRecord({ id: "symp_curled_leaves" }, "symptoms")).toBe("curated");
    expect(classifyRecord({ id: "tr_tomato_blight_chem" }, "treatments")).toBe("curated");
  });

  it("recognises synthetic records by id/name pattern", () => {
    expect(classifyRecord({ id: "crop_0", name: "Mango Var_0" }, "crops")).toBe("synthetic");
    expect(classifyRecord({ id: "disease_12", name: "Blast 12" }, "diseasePests")).toBe("synthetic");
    expect(classifyRecord({ id: "treatment_99", name: "Copper Oxychloride - Protocol 0" }, "treatments")).toBe("synthetic");
    expect(classifyRecord({ id: "edge_0", relation: "cured_by" }, "edges")).toBe("synthetic");
  });

  it("marks hand-authored edge types as curated", () => {
    expect(classifyRecord({ sourceId: "a", targetId: "b", type: "suggests" }, "edges")).toBe("curated");
  });

  it("classifies unknown structured records as unknown", () => {
    expect(classifyRecord({ id: "mystery_x", name: "Whatever" }, "diseasePests")).toBe("unknown");
  });
});

describe("metadata normalization (Phase 3, 5, 10)", () => {
  it("adds provenance fields without fabricating values", () => {
    const n = normalizeCrop(raw.crops[0], "curated");
    expect(n.source).toBeNull();
    expect(n.sourceUrl).toBeNull();
    expect(n.verified).toBe(false);
    expect(n.verifiedBy).toBeNull();
    expect(n.lastUpdated).toBeNull();
    expect(n.recordKind).toBe("curated");
    expect(n.status).toBe("active");
  });

  it("quarantines synthetic records and zeroes confidence", () => {
    const syn = raw.crops.find((c) => classifyRecord(c, "crops") === "synthetic");
    const n = normalizeCrop(syn, "synthetic");
    expect(n.status).toBe("quarantined");
    expect(n.confidence).toBe(0);
    expect(n.searchable).toBe(false);
    expect(n.quarantineReason).toBeTruthy();
  });

  it("never marks synthetic records verified", () => {
    const { stores } = migrateDataset(raw);
    const syn = stores.crops.filter((c) => c.recordKind === "synthetic");
    expect(syn.length).toBe(500);
    expect(syn.every((s) => s.verified === false)).toBe(true);
  });
});

describe("migrateDataset pipeline (Phases 3-13)", () => {
  it("is idempotent: running twice produces identical output", () => {
    const first = migrateDataset(raw);
    const second = migrateDataset(raw);
    expect(JSON.stringify(first.stores)).toBe(JSON.stringify(second.stores));
    expect(first.report.total).toBe(totalRecords);
  });

  it("reports counts and provenance exactly", () => {
    const { report } = migrateDataset(raw);
    expect(report.total).toBe(15023); // 15021 + tnau_rice_blast (3E.1) + tnau_rice_blast_treatment (3E.2)
    expect(report.synthetic).toBe(15000);
    expect(report.quarantined).toBe(15000);
    expect(report.curated).toBe(23); // 21 + tnau_rice_blast (3E.1) + tnau_rice_blast_treatment (3E.2)
    // Phase 3E.1: exactly one record carried provenance. Phase 3E.2 activates
    // the dose-bearing treatment with the same verified TNAU source URL.
    expect(report.recordsWithSource).toBe(2);
    expect(report.recordsWithSourceUrl).toBe(2);
    expect(report.verifiedRecords).toBe(2);
    expect(report.recordsWithDosage).toBe(3); // 2 unsourced curated + the activated TNAU record
    expect(report.verifiedDosage).toBe(1);    // earned: verified===true AND source AND sourceUrl
    expect(report.unverifiedDosage).toBe(2);  // the two unsourced curated treatments
  });

  it("links treatments to diseases only via valid cured_by edges (Phase 8)", () => {
    const { report, stores } = migrateDataset(raw);
    expect(report.resolvedTreatmentLinks).toBe(1079);
    expect(report.resolvedCropLinks).toBe(1029);
    expect(report.resolvedSymptomLinks).toBe(1258);
    expect(report.unresolvedEdges).toBe(8); // the 8 dangling hand-authored edges
    const linked = stores.treatments.filter((t) => t.diseaseId);
    expect(linked.length).toBe(report.withDiseaseId);
    const everyValid = linked.every(
      (t) => raw.diseasePests.some((d) => d.id === t.diseaseId) || stores.diseasePests.some((d) => d.id === t.diseaseId)
    );
    expect(everyValid).toBe(true);
  });

  it("keeps unlinked disease records at cropId=null and flags nothing as a crop", () => {
    const { stores } = migrateDataset(raw);
    const unlinked = stores.diseasePests.filter((d) => d.cropId === null);
    expect(unlinked.length).toBeGreaterThan(0);
    const forgedCrops = stores.diseasePests.filter((d) => d.cropId && !raw.crops.some((c) => c.id === d.cropId));
    expect(forgedCrops.length).toBe(0);
  });

  it("flags high-risk records (dosages, chemical products) as provenance-gated (Phase 11, 3E.2)", () => {
    const { stores, report } = migrateDataset(raw);
    const risky = stores.treatments.filter((t) => t.highRisk);
    expect(risky.length).toBeGreaterThanOrEqual(3);
    // A high-risk record may only be verified when it carries FULL provenance
    // (verified === true + source + sourceUrl). Everything else must hold zero
    // provenance — never partially verified, never "verified by source label".
    const earned = risky.filter((t) => t.verified === true || t.source || t.sourceUrl);
    expect(earned.map((t) => t.id)).toEqual(["tnau_rice_blast_treatment"]);
    expect(earned[0].verified).toBe(true);
    expect(earned[0].source).toBe("TNAU");
    expect(earned[0].sourceUrl).toBeTruthy();
    const others = risky.filter((t) => !earned.includes(t));
    expect(others.length).toBeGreaterThanOrEqual(2);
    expect(others.every((t) => t.verified === false && t.source === null && t.sourceUrl == null)).toBe(true);
    expect(report.recordsWithDosage).toBe(3); // numeric-dosage records
    expect(report.verifiedDosage).toBe(1);    // only the fully-provenanced one
    expect(report.unverifiedDosage).toBe(2);
    expect(report.recordsWithDosage).toBe(report.verifiedDosage + report.unverifiedDosage);
  });

  it("builds a safe relationship index without wiring it into retrieval (Phase 9)", () => {
    const { stores } = migrateDataset(raw);
    const idx = buildRelationshipIndex(stores);
    expect(idx.cropToDisease.size).toBeGreaterThan(0);
    expect(idx.diseaseToSymptom.size).toBeGreaterThan(0);
    expect(idx.diseaseToTreatment.size).toBeGreaterThan(0);
    expect(idx.cropToTreatment.size).toBeGreaterThan(0);
  });

  it("reports multilingual coverage only for non-quarantined content (Phase 12)", () => {
    const { stores } = migrateDataset(raw);
    const cov = computeCoverage(stores);
    expect(cov.counts.en).toBe(15); // 3 crops + 5 symptoms + 3 diseases + 4 treatments
    expect(cov.counts.ta).toBe(13);
    expect(cov.counts.hi).toBe(13);
    // Phase 3E.1/3E.2: the activated English-only TNAU records honestly flag
    // their missing name_ta/name_hi (and method_ta/method_hi) instead of
    // shipping fabricated translations.
    expect(cov.needingEnrichment.map((e) => e.id).sort()).toEqual([
      "tnau_rice_blast",
      "tnau_rice_blast_treatment",
    ]);
  });
});

describe("backup (Phase 1)", () => {
  it("creates a payload with timestamp, version, count and checksum", () => {
    const b = makeBackup(raw, 1);
    expect(typeof b.timestamp).toBe("string");
    expect(b.schemaVersion).toBe(1);
    expect(b.recordCount).toBe(totalRecords);
    expect(b.checksum).toBe(hashRecords(raw));
    expect(b.stores).toBeDefined();
  });

  it("has a stable checksum for identical data", () => {
    expect(hashRecords(raw)).toBe(hashRecords(JSON.parse(JSON.stringify(raw))));
  });
});

describe("runtime migration on IndexedDB (Phase 2, 5, 8)", () => {
  it("migrates in place, backs up first, and is idempotent", async () => {
    const statusBefore = await getKbStatus();
    expect(statusBefore.schemaVersion).toBe(0);

    const first = await migrateKb();
    expect(first.migrated).toBe(true);
    expect(first.version).toBe(KB_SCHEMA_VERSION);
    expect(first.backupId).toBeTruthy();

    const statusAfter = await getKbStatus();
    expect(statusAfter.schemaVersion).toBe(KB_SCHEMA_VERSION);
    expect(statusAfter.backupCount).toBeGreaterThanOrEqual(1);

    const crops = await dbGetAll(DB_STORES.crops);
    expect(crops.length).toBe(503);
    expect(crops.every((c) => c.recordKind)).toBe(true);
    expect(crops.filter((c) => c.status === "quarantined").length).toBe(500);

    const second = await migrateKb();
    expect(second.migrated).toBe(false);
    expect(second.reason).toBe("already-migrated");
    expect((await dbGetAll(DB_STORES.crops)).length).toBe(503); // no duplication
  }, 180000);

  it("links synthetic treatments via cured_by edges in the live store", async () => {
    const treatments = await dbGetAll(DB_STORES.treatments);
    const linked = treatments.filter((t) => t.diseaseId);
    expect(linked.length).toBe(1083); // 1082 + tnau_rice_blast_treatment (Phase 3E.2)
    const t100 = treatments.find((t) => t.id === "treatment_0");
    expect(t100).toBeTruthy();
    if (t100) expect(t100.recordKind).toBe("synthetic");
  }, 120000);

  it("quarantines synthetic crops (Phase 6) and they are filtered from search", async () => {
    const crops = await dbGetAll(DB_STORES.crops);
    const synthetic = crops.filter((c) => c.status === "quarantined");
    expect(synthetic.length).toBe(500);
    const syntheticIds = new Set(synthetic.map((c) => c.id));

    const stores = {
      crops,
      symptoms: await dbGetAll(DB_STORES.symptoms),
      diseases: await dbGetAll(DB_STORES.diseasePests),
      treatments: await dbGetAll(DB_STORES.treatments),
      edges: await dbGetAll(DB_STORES.edges),
    };
    buildInvertedIndex(stores); // default: excludes quarantined
    const visible = fastSearch("mango", { type: "crop" }).records;
    expect(visible.some((r) => syntheticIds.has(r.record.id))).toBe(false);
    buildInvertedIndex(stores, { includeQuarantined: true }); // dev/testing path
    const all = fastSearch("mango", { type: "crop" }).records;
    expect(all.some((r) => syntheticIds.has(r.record.id))).toBe(true);
  }, 120000);

  it("keeps provenance exactly on the earned records and nowhere else (Phase 10, 3E.1, 3E.2)", async () => {
    const stores = await Promise.all([
      dbGetAll(DB_STORES.crops),
      dbGetAll(DB_STORES.symptoms),
      dbGetAll(DB_STORES.diseasePests),
      dbGetAll(DB_STORES.treatments),
    ]);
    const all = stores.flat();
    // Exactly two records in the entire KB may carry provenance — the Phase
    // 3E.1 activated TNAU disease record and the Phase 3E.2 dose-bearing
    // treatment — and no other record may inherit source/sourceUrl/verified
    // through normalization (never fabricated).
    const EARNED = ["tnau_rice_blast", "tnau_rice_blast_treatment"];
    const withSource = all.filter((r) => r.source);
    expect(withSource.map((r) => r.id).sort()).toEqual([...EARNED].sort());
    expect(all.filter((r) => r.sourceUrl).map((r) => r.id).sort()).toEqual([...EARNED].sort());
    const verified = all.filter((r) => r.verified);
    expect(verified.map((r) => r.id).sort()).toEqual([...EARNED].sort());
    for (const r of verified) {
      expect(r.source).toBeTruthy();
      expect(r.sourceUrl).toBe(
        "https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html"
      );
      expect(r.region).toBeNull(); // region never inferred
      expect(r.status).toBe("active");
      expect(r.recordKind).toBe("curated");
    }
    // The dose-bearing one is the only verified dosage record in the KB.
    const verifiedDosage = verified.filter((t) => /(\d+(\.\d+)?\s*(g|ml|l|%))/i.test(String(t.method || "")));
    expect(verifiedDosage.map((t) => t.id)).toEqual(["tnau_rice_blast_treatment"]);
  }, 120000);
});

describe("validator compatibility (Phase 11)", () => {
  it("still blocks unsourced chemical dosage from reaching the farmer", async () => {
    const treatments = await dbGetAll(DB_STORES.treatments);
    const chem = treatments.find((t) => /3g\/L/i.test(t.method || t.name || ""));
    expect(chem).toBeTruthy();
    const result = validateResponse({
      answer: `Use ${chem.name}: ${chem.method}`,
      source: "local-knowledge-base",
      confidence: 0.9,
      records: [chem],
      parsed: { crop: "tomato" },
      intent: "disease",
    });
    expect(result.reasons.some((r) => /high_risk|dose|chemical/i.test(r))).toBe(true);
    expect(result.verdict).toBe("blocked"); // no provenance → dose never reaches the farmer
    expect(result.safeAnswer.includes("3g/L")).toBe(false); // dose stripped
  }, 120000);

  it("RAG path is compatible: offline chat still answers from the migrated KB", async () => {
    const resp = await routeFreeTextQuestion({
      question: "tomato leaves wilting",
      language: "en",
      context: {},
    });
    expect(resp.answer).toBeTruthy();
    expect(resp.answer.length).toBeGreaterThan(0);
    expect(["local", "local-fallback"].includes(resp.mode)).toBe(true);
    // The curated early-blight answer carries an unsourced "3g/L" dose → the
    // validator blocks it and the offline fallback must serve the safe message,
    // never the blocked content.
    expect(resp.answer.includes("3g/L")).toBe(false);
  }, 180000);
});

describe("restore / reversibility (Phase 1)", () => {
  it("restores the exact v1 backup and resets the version", async () => {
    const backups = (await dbGet(DB_STORES.meta, "kb_backups"))?.value ?? [];
    const latest = backups[backups.length - 1];
    expect(latest).toBeTruthy();

    const res = await restoreKb(latest.id);
    expect(res.restored).toBe(true);
    expect((await getKbStatus()).schemaVersion).toBe(1);

    const crops = await dbGetAll(DB_STORES.crops);
    const rawCrop = raw.crops.find((c) => c.id === "crop_0");
    const restoredCrop = crops.find((c) => c.id === "crop_0");
    expect(restoredCrop).toBeTruthy();
    expect(restoredCrop.name).toBe(rawCrop.name);
    expect(restoredCrop.recordKind).toBeUndefined(); // raw v1 has no metadata
  }, 180000);
});