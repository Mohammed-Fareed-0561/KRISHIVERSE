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
    expect(report.total).toBe(15021);
    expect(report.synthetic).toBe(15000);
    expect(report.quarantined).toBe(15000);
    expect(report.curated).toBe(21);
    expect(report.recordsWithSource).toBe(0);
    expect(report.recordsWithSourceUrl).toBe(0);
    expect(report.verifiedRecords).toBe(0);
    expect(report.recordsWithDosage).toBe(2);
    expect(report.verifiedDosage).toBe(0);
    expect(report.unverifiedDosage).toBe(2);
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

  it("flags high-risk records (dosages, chemical products) as unverified (Phase 11)", () => {
    const { stores, report } = migrateDataset(raw);
    const risky = stores.treatments.filter((t) => t.highRisk);
    expect(risky.length).toBeGreaterThanOrEqual(2);
    expect(risky.every((t) => t.verified === false)).toBe(true);
    expect(risky.every((t) => t.source === null)).toBe(true);
    expect(report.recordsWithDosage).toBe(2); // only 2 numeric-dosage records
    expect(report.verifiedDosage).toBe(0);   // none may claim verification
    expect(report.unverifiedDosage).toBe(2);
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
    expect(cov.counts.en).toBe(13); // 3 crops + 5 symptoms + 2 diseases + 3 treatments
    expect(cov.counts.ta).toBe(13);
    expect(cov.counts.hi).toBe(13);
    expect(cov.needingEnrichment.length).toBe(0);
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
    expect(linked.length).toBe(1082);
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

  it("keeps zero provenance after migration (Phase 10)", async () => {
    const stores = await Promise.all([
      dbGetAll(DB_STORES.crops),
      dbGetAll(DB_STORES.symptoms),
      dbGetAll(DB_STORES.diseasePests),
      dbGetAll(DB_STORES.treatments),
    ]);
    const all = stores.flat();
    expect(all.filter((r) => r.source).length).toBe(0);
    expect(all.filter((r) => r.sourceUrl).length).toBe(0);
    expect(all.filter((r) => r.verified).length).toBe(0);
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