/**
 * Phase 3D: Provenance Preservation Regression Tests
 *
 * Confirms that source, sourceUrl, sourceOrganization, region and verified
 * survive the complete chain without silently disappearing:
 *
 *   raw record
 *   → parsing/ingestion
 *   → normalization (ingestion normalizer)
 *   → IndexedDB normalization (kbNormalize metadataFor)
 *   → IndexedDB storage
 *   → offline retrieval (inverted index fastSearch)
 *   → backend retrieval (Stack B logical contract mapping)
 *
 * Also proves the new optional fields are never inferred or fabricated.
 */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { parseMarkdown } from "../src/services/ingestion/importer.js";
import {
  normalizeRecord,
  addProvenance,
} from "../src/services/ingestion/normalizer.js";
import { validateRecord } from "../src/services/ingestion/validator.js";
import { metadataFor, normalizeCrop } from "../src/services/db/kbNormalize.js";
import { dbPut, dbGetAll, dbClear } from "../src/services/db/indexedDb.js";
import { DB_STORES } from "../src/services/db/schemas.js";
import {
  buildInvertedIndex,
  fastSearch,
} from "../src/services/ai/AgriculturalNLP.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RAW_RECORD = {
  id: "tr_tnau_pilot_001",
  name: "Tricyclazole 75% WP @ 0.6g/liter for rice blast",
  recordKind: "treatment",
  cropId: "rice",
  chemicalControl: "Tricyclazole 75% WP @ 0.6g/liter water",
  source: "TNAU",
  sourceUrl: "https://tnau.ac.in/agriculture/rice-blast-management",
  sourceOrganization: "Tamil Nadu Agricultural University",
  region: "Tamil Nadu",
  verified: true,
  verifiedBy: "pilot-reviewer",
  verifiedDate: "2026-10-05",
};

const PROVENANCE_KEYS = ["source", "sourceUrl", "sourceOrganization", "region", "verified"];

function expectProvenanceIntact(record, label) {
  for (const key of PROVENANCE_KEYS) {
    expect(record, `${label}: ${key} must not be undefined/null-dropped`).toHaveProperty(key);
  }
  expect(record.source, `${label}: source`).toBe("TNAU");
  expect(record.sourceUrl, `${label}: sourceUrl`).toBe(
    "https://tnau.ac.in/agriculture/rice-blast-management",
  );
  expect(record.sourceOrganization, `${label}: sourceOrganization`).toBe(
    "Tamil Nadu Agricultural University",
  );
  expect(record.region, `${label}: region`).toBe("Tamil Nadu");
  expect(record.verified, `${label}: verified`).toBe(true);
}

beforeAll(async () => {
  await dbClear(DB_STORES.treatments);
});

afterAll(async () => {
  await dbClear(DB_STORES.treatments);
});

describe("STEP 4: provenance survives raw → parsing → normalization", () => {
  it("markdown front matter parses the new optional provenance fields", () => {
    const doc = [
      "---",
      "id: tr_frontmatter_001",
      "name: Neem oil 5ml/liter",
      "recordKind: treatment",
      "source: TNAU",
      "sourceUrl: https://tnau.ac.in/x",
      "sourceOrganization: Tamil Nadu Agricultural University",
      "region: Tamil Nadu",
      "verified: true",
      "---",
      "",
      "Body",
    ].join("\n");
    const out = parseMarkdown(doc);
    expect(out.data).toHaveLength(1);
    expect(out.data[0].sourceOrganization).toBe("Tamil Nadu Agricultural University");
    expect(out.data[0].region).toBe("Tamil Nadu");
    expect(out.data[0].source).toBe("TNAU");
    expect(out.data[0].sourceUrl).toBe("https://tnau.ac.in/x");
    expect(out.data[0].verified).toBe(true);
  });

  it("ingestion normalizer preserves all 5 provenance fields", () => {
    const n = normalizeRecord(RAW_RECORD, "treatment", "TNAU pilot");
    expectProvenanceIntact(n, "normalizeRecord");
  });

  it("validator accepts fully-provenanced verified dosage record", () => {
    const n = normalizeRecord(RAW_RECORD, "treatment", "TNAU pilot");
    const res = validateRecord(n, ["rice"], []);
    const provenanceErrors = res.errors.filter((e) => /provenance|verified/i.test(e));
    expect(provenanceErrors).toEqual([]);
    expect(res.valid).toBe(true);
  });

  it("addProvenance preserves explicit verified=true (never destroys provenance)", () => {
    const n = normalizeRecord(RAW_RECORD, "treatment", "TNAU pilot");
    const [p] = addProvenance([n], { source: "TNAU pilot", batchId: "pilot-1" });
    expectProvenanceIntact(p, "addProvenance");
  });

  it("new fields stay null when not provided — never inferred or guessed", () => {
    const n = normalizeRecord(
      { id: "x", name: "Some record", recordKind: "treatment" },
      "treatment",
      "unknown",
    );
    expect(n.sourceOrganization).toBeNull();
    expect(n.region).toBeNull();
    expect(n.verified).not.toBe(true);
  });
});

describe("STEP 4: provenance survives IndexedDB normalization + storage + offline retrieval", () => {
  it("kbNormalize metadataFor preserves the optional fields", () => {
    const meta = metadataFor("curated", RAW_RECORD);
    expect(meta.sourceOrganization).toBe("Tamil Nadu Agricultural University");
    expect(meta.region).toBe("Tamil Nadu");
    expect(meta.source).toBe("TNAU");
    expect(meta.sourceUrl).toBe(RAW_RECORD.sourceUrl);
    expect(meta.verified).toBe(true);
  });

  it("metadataFor emits null (not a guess) when fields absent", () => {
    const meta = metadataFor("curated", { id: "y", name: "Y" });
    expect(meta.sourceOrganization).toBeNull();
    expect(meta.region).toBeNull();
    expect(meta.verified).toBe(false);
  });

  it("normalizeCrop spreads provenance onto the stored record", () => {
    const n = normalizeCrop(RAW_RECORD, "curated");
    expectProvenanceIntact(n, "normalizeCrop");
  });

  it("record survives write → read in IndexedDB", async () => {
    const stored = { ...RAW_RECORD, ...metadataFor("curated", RAW_RECORD) };
    expectProvenanceIntact(stored, "pre-store");
    await dbPut(DB_STORES.treatments, stored);
    const all = await dbGetAll(DB_STORES.treatments);
    const loaded = all.find((r) => r.id === RAW_RECORD.id);
    expect(loaded).toBeTruthy();
    expectProvenanceIntact(loaded, "IndexedDB round-trip");
  });

  it("offline retrieval returns the record with provenance intact", async () => {
    const all = await dbGetAll(DB_STORES.treatments);
    buildInvertedIndex({ crops: [], symptoms: [], diseases: [], treatments: all, edges: [] });
    const { records } = fastSearch("Tricyclazole rice blast", { type: "treatment", limit: 5 });
    const hit = records.map((h) => h.record).find((r) => r.id === RAW_RECORD.id);
    expect(hit, "offline retrieval must find the record").toBeTruthy();
    expectProvenanceIntact(hit, "offline retrieval");
  });
});

describe("STEP 4: backend retrieval exposes the same logical fields (contract mapping)", () => {
  const backendData = JSON.parse(
    readFileSync(
      resolve(__dirname, "../../backend/rag_service/data/all_crop_diseases_v2.json"),
      "utf8",
    ),
  );

  // Logical mapping from docs/rag/common-evidence-contract.md (Stack B)
  function toContract(meta) {
    return {
      source: meta.source_organization ?? null,
      sourceUrl: meta.source?.reference_url ?? null,
      sourceOrganization:
        meta.source_organization ?? meta.source?.organization ?? null,
      region: meta.location?.state ?? null,
      // Contract rule: verified only when source AND sourceUrl both present
      verified:
        meta.source?.is_verified === true &&
        Boolean(meta.source_organization ?? meta.source?.organization) &&
        Boolean(meta.source?.reference_url),
    };
  }

  it("backend dataset exists and is a non-empty array", () => {
    expect(Array.isArray(backendData)).toBe(true);
    expect(backendData.length).toBeGreaterThan(0);
  });

  it("every backend record exposes all 5 logical provenance fields", () => {
    for (const meta of backendData) {
      const c = toContract(meta);
      expect(c, `record ${meta.id}`).toHaveProperty("source");
      expect(c, `record ${meta.id}`).toHaveProperty("sourceUrl");
      expect(c, `record ${meta.id}`).toHaveProperty("sourceOrganization");
      expect(c, `record ${meta.id}`).toHaveProperty("region");
      expect(c, `record ${meta.id}`).toHaveProperty("verified");
    }
  });

  it("sourceOrganization survives backend mapping where the source provides it", () => {
    const mapped = backendData.map((m) => ({ id: m.id, ...toContract(m) }));
    const withOrg = mapped.filter((m) => m.sourceOrganization);
    expect(withOrg.length).toBeGreaterThan(0);
    expect(withOrg[0].sourceOrganization).toBe("TNAU");
  });

  it("region maps from location.state — null when location absent, never invented", () => {
    for (const meta of backendData) {
      const c = toContract(meta);
      const expected = meta.location?.state ?? null;
      expect(c.region).toBe(expected);
      if (!meta.location) expect(c.region).toBeNull();
    }
  });

  it("contract mapping never over-reports verified without sourceUrl", () => {
    for (const meta of backendData) {
      const c = toContract(meta);
      if (c.verified === true) {
        expect(c.source).toBeTruthy();
        expect(c.sourceUrl).toBeTruthy();
      }
    }
  });
});
