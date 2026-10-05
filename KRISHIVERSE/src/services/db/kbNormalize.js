// KB normalization pipeline — shared by the Node migration script, the browser
// IndexedDB migration service, and the test suite.
//
// DATA-SAFETY RULES (see task brief):
//   - Never deletes a record.    - Never fabricates provenance.
//   - Never marks anything verified.  - Idempotent: safe to run twice.
//   - Original seed files are never overwritten (v1 stays intact).

export const KB_SCHEMA_VERSION = 2;

const SYNTHETIC_ID_RE = /^[a-z]+_\d+$/;
const SYNTHETIC_NAME_RE = /Var_\d+|Type \d+|Protocol \d+|v0\.\d|-\s*\d+$/i;

export const KNOWN_CURATED = {
  crops: new Set(["crop_tomato", "crop_rice", "crop_chilli"]),
  symptoms: new Set([
    "symp_yellow_concentric_rings",
    "symp_spot_lower_leaves",
    "symp_curled_leaves",
    "symp_stunted_growth",
    "symp_thick_veins",
  ]),
  diseasePests: new Set(["dp_tomato_early_blight", "dp_chilli_leaf_curl"]),
  treatments: new Set([
    "tr_tomato_blight_organic",
    "tr_tomato_blight_chem",
    "tr_chilli_curl_control",
  ]),
  edges: new Set([]),
};

const THREAT_TO_SEVERITY = {
  safe: "Low",
  warning: "Medium",
  caution: "Medium",
  critical: "High",
  severe: "High",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function classifyRecord(record, storeName) {
  const id = String(record?.id ?? "");
  const name = String(record?.name ?? record?.description ?? "");
  if (KNOWN_CURATED[storeName]?.has(id)) return "curated";
  if (SYNTHETIC_ID_RE.test(id) || SYNTHETIC_NAME_RE.test(name)) return "synthetic";
  if (storeName === "edges" && /^(suggests|treated_by|susceptible_to)$/.test(record?.type || record?.relation)) {
    return "curated";
  }
  const hasLang =
    record?.name_ta || record?.name_hi || record?.text_ta ||
    record?.text_hi || record?.method_ta || record?.method_hi;
  if (hasLang) return "community";
  return "unknown";
}

export function languagesOf(record) {
  const keys = Object.keys(record || {});
  const en = keys.some((k) => /^(name|description|text|method|action|title|scientific_name|common_name|name_en)$/.test(k) && record[k]);
  const ta = keys.some((k) => /_ta$/.test(k) && record[k]);
  const hi = keys.some((k) => /_hi$/.test(k) && record[k]);
  return { en, ta, hi };
}

export function metadataFor(kind, rec = {}) {
  const synthetic = kind === "synthetic";
  // Provenance preservation (Phase 3B): existing source fields survive
  // normalization — a future sourced ingest must not lose provenance here.
  // verified stays strictly boolean (only an explicit `true` verifies).
  return {
    source: rec.source ?? null,
    sourceUrl: rec.sourceUrl ?? null,
    verified: rec.verified === true,
    verifiedBy: rec.verifiedBy ?? null,
    verifiedDate: rec.verifiedDate ?? null,
    lastUpdated: rec.lastUpdated ?? null,
    confidence: synthetic ? 0 : null,
    recordKind: kind,
    status: synthetic ? "quarantined" : "active",
    quarantineReason: synthetic
      ? "auto-detected synthetic/generated record; not authoritative for agricultural recommendations"
      : null,
    aliases: [],
  };
}

export function hashRecords(stores) {
  const s = JSON.stringify(stores);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (h2 * 33 + c) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

// ─── Per-store normalization ───────────────────────────────────────────────────

export function normalizeCrop(rec, kind) {
  const languages = languagesOf(rec);
  const enrichmentRequired = [];
  if (!languages.ta) enrichmentRequired.push("name_ta");
  if (!languages.hi) enrichmentRequired.push("name_hi");
  return {
    ...rec,
    ...metadataFor(kind, rec),
    languages,
    searchable: kind !== "synthetic",
    enrichmentRequired: kind === "synthetic" ? [] : enrichmentRequired,
  };
}

export function normalizeSymptom(rec, kind) {
  const languages = languagesOf(rec);
  const enrichmentRequired = [];
  if (!languages.ta) enrichmentRequired.push("text_ta");
  if (!languages.hi) enrichmentRequired.push("text_hi");
  const text = rec.text ?? rec.description ?? null;
  return {
    ...rec,
    ...metadataFor(kind, rec),
    text,
    description: rec.description ?? text,
    languages,
    enrichmentRequired: kind === "synthetic" ? [] : enrichmentRequired,
  };
}

export function normalizeDiseasePest(rec, kind) {
  const languages = languagesOf(rec);
  const enrichmentRequired = [];
  if (!rec.cropId && !rec.crop && kind !== "synthetic") enrichmentRequired.push("cropId");
  if (!languages.ta) enrichmentRequired.push("name_ta");
  if (!languages.hi) enrichmentRequired.push("name_hi");
  const severity =
    rec.severity ||
    rec.dangerLevel ||
    THREAT_TO_SEVERITY[String(rec.threat_level || "").toLowerCase()] ||
    null;
  return {
    ...rec,
    ...metadataFor(kind, rec),
    scientificName: rec.scientificName ?? rec.scientific_name ?? null,
    severity,
    cropId: rec.cropId ?? rec.crop ?? null,
    symptoms: Array.isArray(rec.symptoms) ? [...rec.symptoms] : [],
    languages,
    enrichmentRequired: kind === "synthetic" ? [] : enrichmentRequired,
  };
}

export function normalizeTreatment(rec, kind) {
  const languages = languagesOf(rec);
  const enrichmentRequired = [];
  if (!languages.ta) enrichmentRequired.push("method_ta");
  if (!languages.hi) enrichmentRequired.push("method_hi");
  return {
    ...rec,
    ...metadataFor(kind, rec),
    method: rec.method ?? rec.description ?? null,
    languages,
    enrichmentRequired: kind === "synthetic" ? [] : enrichmentRequired,
  };
}

export function normalizeEdge(rec, idx, validNodes, kind) {
  const sourceId = rec.sourceId ?? rec.from ?? null;
  const targetId = rec.targetId ?? rec.to ?? null;
  const type = rec.type ?? rec.relation ?? null;
  return {
    ...rec,
    id: rec.id ?? `edge_v1_${idx}`,
    sourceId,
    targetId,
    type,
    valid: Boolean(sourceId && targetId && validNodes.has(sourceId) && validNodes.has(targetId)),
    ...metadataFor(kind, rec),
  };
}

// ─── Relationship repair from edges (Phase 7, 8, 9) ───────────────────────────

export function linkFromEdges(stores) {
  const { crops, symptoms, diseasePests, treatments, edges } = stores;
  const allIds = new Set();
  for (const list of [crops, symptoms, diseasePests, treatments]) {
    for (const r of list) if (r?.id) allIds.add(r.id);
  }
  const diseaseIds = new Set();
  for (const d of diseasePests) if (d?.id) diseaseIds.add(d.id);

  const report = {
    resolvedTreatmentLinks: 0,
    resolvedCropLinks: 0,
    resolvedSymptomLinks: 0,
    unresolvedEdges: 0,
    conflicts: [],
  };

  const treatmentById = new Map(treatments.map((t) => [t.id, t]));
  const diseaseById = new Map(diseasePests.map((d) => [d.id, d]));

  for (const edge of edges) {
    const from = edge.sourceId ?? edge.from;
    const to = edge.targetId ?? edge.to;
    const type = edge.type ?? edge.relation;
    const valid = edge.valid ?? (from && to && allIds.has(from) && allIds.has(to));
    if (!valid || !from || !to) {
      report.unresolvedEdges++;
      continue;
    }

    if (type === "cured_by") {
      const diseaseId = from;
      const treatmentId = to;
      const t = treatmentById.get(treatmentId);
      if (t && diseaseIds.has(diseaseId)) {
        if (t.diseaseId === undefined || t.diseaseId === null || t.diseaseId === "") {
          t.diseaseId = diseaseId;
          report.resolvedTreatmentLinks++;
        } else if (t.diseaseId !== diseaseId) {
          report.conflicts.push({ id: treatmentId, field: "diseaseId", existing: t.diseaseId, edge: diseaseId });
        }
      } else {
        report.unresolvedEdges++;
      }
    } else if (type === "affects") {
      const cropId = from;
      const diseaseId = to;
      const d = diseaseById.get(diseaseId);
      if (d && d.cropId === null) {
        d.cropId = cropId;
        report.resolvedCropLinks++;
      } else if (d && d.cropId && d.cropId !== cropId) {
        report.conflicts.push({ id: diseaseId, field: "cropId", existing: d.cropId, edge: cropId });
      }
    } else if (type === "manifests") {
      const diseaseId = from;
      const symptomId = to;
      const d = diseaseById.get(diseaseId);
      if (d) {
        if (!Array.isArray(d.symptoms)) d.symptoms = [];
        if (!d.symptoms.includes(symptomId)) {
          d.symptoms.push(symptomId);
          report.resolvedSymptomLinks++;
        }
      } else {
        report.unresolvedEdges++;
      }
    }
  }

  // Fix synthetic disease records whose cropId was still null after affects linking
  for (const d of diseasePests) {
    if (d.cropId === null) d.cropId = null;
  }
  for (const t of treatments) {
    if (t.diseaseId === undefined) t.diseaseId = null;
  }

  return report;
}

// ─── Relationship-aware index (Phase 9 — built, NOT wired into retrieval yet) ─

export function buildRelationshipIndex(stores) {
  const { edges } = stores;
  const idx = {
    cropToDisease: new Map(),
    diseaseToSymptom: new Map(),
    diseaseToTreatment: new Map(),
    cropToTreatment: new Map(),
  };
  const add = (map, from, to) => {
    if (!map.has(from)) map.set(from, new Set());
    map.get(from).add(to);
  };
  for (const edge of edges) {
    if (!(edge.valid ?? (edge.sourceId && edge.targetId))) continue;
    const type = edge.type ?? edge.relation;
    const from = edge.sourceId ?? edge.from;
    const to = edge.targetId ?? edge.to;
    if (type === "affects") add(idx.cropToDisease, from, to);
    else if (type === "manifests") add(idx.diseaseToSymptom, from, to);
    else if (type === "cured_by") add(idx.diseaseToTreatment, from, to);
    else if (type === "prevented_by") add(idx.cropToTreatment, from, to);
  }
  return idx;
}

// ─── High-risk detection (Phase 11) ───────────────────────────────────────────

const DOSAGE_RE =
  /\d+(\.\d+)?\s*(g\/l|gm\/l|ml\/l|g\/ha|kg\/ha|ml\b|g\b|kg\b|ppm|%|per\s+lit(er|re)?)/i;
const CHEMICAL_RE =
  /\b(bordeaux|copper|mancozeb|chlorothalonil|imidacloprid|chlorpyrifos|carbendazim|hexaconazole|propiconazole|azoxystrobin|thiram|ziram|sulphur|sulfur|fungicide|insecticide|pesticide|herbicide)\b/i;

export function identifyHighRisk(records) {
  const flagged = [];
  for (const r of records) {
    const text = [r.name, r.method, r.description, r.action, r.title]
      .filter(Boolean)
      .map(String)
      .join(" ");
    const dosage = DOSAGE_RE.test(text);
    const chemical = CHEMICAL_RE.test(text);
    if (dosage || chemical) {
      flagged.push({ id: r.id, recordKind: r.recordKind, dosage, chemical });
    }
  }
  return flagged;
}

// ─── Coverage (Phase 12) ──────────────────────────────────────────────────────

export function computeCoverage(stores) {
  const counts = { en: 0, ta: 0, hi: 0 };
  const needingEnrichment = [];
  const contentStores = ["crops", "symptoms", "diseasePests", "treatments"];
  for (const store of contentStores) {
    for (const r of stores[store] || []) {
      if (r.status === "quarantined") continue;
      const lang = languagesOf(r);
      if (lang.en) counts.en++;
      if (lang.ta) counts.ta++;
      if (lang.hi) counts.hi++;
      if (!lang.ta || !lang.hi) {
        needingEnrichment.push({
          id: r.id,
          store,
          missing: [!lang.ta ? "ta" : null, !lang.hi ? "hi" : null].filter(Boolean),
        });
      }
    }
  }
  return { counts, needingEnrichment };
}

// ─── Full pipeline (Phase 3, 4, 5, 6, 7, 8, 10) ───────────────────────────────

export function migrateDataset(raw) {
  const stores = {
    crops: raw.crops.map((r) => normalizeCrop(r, classifyRecord(r, "crops"))),
    symptoms: raw.symptoms.map((r) => normalizeSymptom(r, classifyRecord(r, "symptoms"))),
    diseasePests: raw.diseasePests.map((r) => normalizeDiseasePest(r, classifyRecord(r, "diseasePests"))),
    treatments: raw.treatments.map((r) => normalizeTreatment(r, classifyRecord(r, "treatments"))),
    edges: raw.edges.map((r, i) => normalizeEdge(r, i, new Set(), classifyRecord(r, "edges"))),
  };

  const nodeIds = new Set();
  for (const list of [stores.crops, stores.symptoms, stores.diseasePests, stores.treatments]) {
    for (const r of list) if (r?.id) nodeIds.add(r.id);
  }
  stores.edges = stores.edges.map((e) => ({ ...e, valid: Boolean(e.sourceId && e.targetId && nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)) }));

  const linkReport = linkFromEdges(stores);
  const highRisk = identifyHighRisk(stores.treatments);
  for (const h of highRisk) {
    const t = stores.treatments.find((x) => x.id === h.id);
    if (t) {
      t.highRisk = true;
      t.dosageType = h.dosage ? "numeric" : h.chemical ? "chemical" : null;
    }
  }

  const coverage = computeCoverage(stores);
  const counts = {
    total: Object.values(stores).reduce((a, l) => a + l.length, 0),
    curated: 0,
    synthetic: 0,
    community: 0,
    unknown: 0,
    quarantined: 0,
  };
  for (const [, list] of Object.entries(stores)) {
    for (const r of list) {
      counts[r.recordKind] = (counts[r.recordKind] || 0) + 1;
      if (r.status === "quarantined") counts.quarantined++;
    }
  }

  const report = {
    version: KB_SCHEMA_VERSION,
    ...counts,
    conflictCount: linkReport.conflicts.length,
    conflicts: linkReport.conflicts.slice(0, 100), // full list lives in the backup JSON
    recordsWithSource: Object.values(stores).flat().filter((r) => r.source).length,
    recordsWithSourceUrl: Object.values(stores).flat().filter((r) => r.sourceUrl).length,
    verifiedRecords: Object.values(stores).flat().filter((r) => r.verified).length,
    withCropId: stores.diseasePests.filter((r) => r.cropId).length,
    withDiseaseId: stores.treatments.filter((r) => r.diseaseId).length,
    orphanTreatments: stores.treatments.filter((r) => !r.diseaseId).length,
    ...linkReport,
    recordsWithDosage: highRisk.filter((h) => h.dosage).length,
    verifiedDosage: 0,
    unverifiedDosage: highRisk.filter((h) => h.dosage).length,
    englishCoverage: coverage.counts.en,
    tamilCoverage: coverage.counts.ta,
    hindiCoverage: coverage.counts.hi,
    needingEnrichment: coverage.needingEnrichment.length,
    duplicates: raw.crops.length + raw.symptoms.length + raw.diseasePests.length + raw.treatments.length + raw.edges.length - new Set(Object.values(stores).flat().map((r) => r.id)).size,
    missingFields: coverage.needingEnrichment.length,
    invalidReferences: linkReport.unresolvedEdges,
  };

  return { stores, report, version: KB_SCHEMA_VERSION };
}

export function makeBackup(stores, schemaVersion = 1) {
  return {
    timestamp: new Date().toISOString(),
    schemaVersion,
    recordCount: Object.values(stores).reduce((a, l) => a + l.length, 0),
    checksum: hashRecords(stores),
    stores,
  };
}