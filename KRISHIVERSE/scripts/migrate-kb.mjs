// KB migration script — Phase 1 (backup) + Phase 2 (version) + Phase 3-13.
// Runs OUTSIDE the browser, on the v1 seed sources (the original dataset).
// It never modifies the v1 seed files. Idempotent: safe to run repeatedly.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CROPS } from "../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../src/data/seed/treatmentData.js";
import { KNOWLEDGE_GRAPH_EDGES } from "../src/data/seed/edgeData.js";
import {
  migrateDataset,
  makeBackup,
  KB_SCHEMA_VERSION,
  hashRecords,
} from "../src/services/db/kbNormalize.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MASSIVE = JSON.parse(
  readFileSync(join(ROOT, "src/data/seed/massive_dataset.json"), "utf8")
);

// Reconstruct exactly what seedingService seeds (v1 raw, unchanged).
const raw = {
  crops: [...CROPS, ...MASSIVE.crops],
  symptoms: [...SYMPTOMS, ...MASSIVE.symptoms],
  diseasePests: [...DISEASE_PESTS, ...MASSIVE.diseasePests],
  treatments: [...TREATMENTS, ...MASSIVE.treatments],
  edges: [...KNOWLEDGE_GRAPH_EDGES, ...MASSIVE.edges],
};

const inputChecksum = hashRecords(raw);

const force = process.argv.includes("--force");

const manifestPath = join(ROOT, "src/data/kb/v2/manifest.json");
if (!force && existsSync(manifestPath)) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (m.version >= KB_SCHEMA_VERSION && m.inputChecksum === inputChecksum) {
    console.log(
      `SKIP: already migrated (version ${m.version}, checksum matches). Nothing changed.`
    );
    process.exit(0);
  }
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");

// Phase 1 — backup the EXISTING KB before anything changes.
const backupDir = join(ROOT, "backups");
mkdirSync(backupDir, { recursive: true });
const backup = makeBackup(raw, 1);
const backupPath = join(backupDir, `kb-backup-v1-${ts}.json`);
writeFileSync(backupPath, JSON.stringify(backup, null, 2));

// Phases 3-13 — normalize, classify, quarantine, link, report.
const { stores, report } = migrateDataset(raw);

const v2Dir = join(ROOT, "src/data/kb/v2");
mkdirSync(v2Dir, { recursive: true });
for (const [name, list] of Object.entries(stores)) {
  writeFileSync(join(v2Dir, `${name}.json`), JSON.stringify(list, null, 2));
}

const manifest = {
  version: KB_SCHEMA_VERSION,
  generatedAt: new Date().toISOString(),
  inputChecksum,
  recordCount: report.total,
  report,
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const reportPath = join(backupDir, `migration-report-${ts}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log("========== KB MIGRATION REPORT ==========");
console.log(JSON.stringify(report, null, 2));
console.log("=========================================");
console.log(`Backup written:        ${backupPath}`);
console.log(`Normalized dataset:    ${v2Dir}`);
console.log(`Quality report:        ${reportPath}`);