# Authoritative Ingestion Pipeline

## Overview

The KB ingestion pipeline is a 5-stage deterministic process for importing authoritative agricultural knowledge into the KB v2 schema. It is dry-run only — no records are written to IndexedDB or seed files during ingestion.

## Pipeline Stages

```
Source Documents (JSON/Markdown/CSV)
    │
    ▼
[1. importer.js]  ── parse & detect format
    │
    ▼
[2. normalizer.js] ── map to KB v2 schema (12 record kinds)
    │
    ▼
[3. validator.js]  ── schema + relationship + safety validation
    │
    ▼
[4. dedup.js]  ── detect duplicates (5 types, review report for ambiguous)
    │
    ▼
[5. report.js]  ── generate ingestion report (JSON output)
    │
    ▼
KB v2 Data Files (crops, diseasePests, treatments, symptoms, edges)
```

## Supported Input Formats

| Format | Detection | Notes |
|--------|-----------|-------|
| JSON | `JSON.parse()` success | Accepts bare object, array, or `{records:[...]}` wrapper |
| Markdown | Starts with `#`, `---`, or `\|` | Supports YAML front matter, heading blocks, table rows |
| CSV | Comma-separated with header row | First row = headers, subsequent rows = records |

## Normalization

Records are mapped to KB v2 schema with 12 supported record kinds:

- `crop`, `disease`, `pest`, `symptom`
- `nutrient_deficiency`, `treatment`, `fertilizer`
- `irrigation`, `harvest`, `storage`, `faq`, `scheme`

Missing fields are left as `null` — never fabricated.

### Provenance Preservation

- `source`: Preserved from record or document front matter. Defaults to `'markdown'` for MD, `null` for JSON/CSV without explicit source.
- `sourceUrl`: Preserved from record or front matter. Defaults to `null`.
- `verified`: **Never auto-set to `true`.** Only preserved when the source record explicitly carries `verified: true` with valid `source` + `sourceUrl`.
- `verifiedBy`, `verifiedDate`, `lastUpdated`: Preserved from source. Default to `null`.

## Deduplication

5 detection types:

1. **exact** — Same `id`
2. **crop_disease** — Same `cropId` + `diseaseId`
3. **crop_pest** — Same `cropId` for pest records
4. **disease_symptom** — Same `diseaseId` + symptom hash
5. **near_name** — Trigram Jaccard similarity >= 0.8 (requires review)

Ambiguous matches produce a review report — no automatic merging.

## Validation

### Errors (record rejected)
- Missing `id` and `name`
- Invalid `recordKind`
- `verified === true` without `source` or `sourceUrl`
- Disease with unrecognized `cropId`
- Treatment with unrecognized `diseaseId`
- `symptoms` field not an array

### Warnings (record accepted with flags)
- Missing `source` provenance
- Treatment with `source` but no `sourceUrl`
- Unrecognized `cropId` or `diseaseId`
- Chemical dosage without full provenance (ResponseValidator blocks at UI)

## Quarantine

Records that fail validation are NOT written to the KB. They are reported in the ingestion report for manual review. The existing 15,000 synthetic/quarantined records remain in quarantine — they are never promoted to active without authoritative evidence.

## Dry-Run Behavior

The `kb-ingest.mjs` CLI requires `--dry-run` (mandatory). In dry-run mode:
- Discovers files from source path
- Imports, normalizes, validates, deduplicates
- Generates a JSON report
- **Does NOT write to IndexedDB, seed files, or KB v2**

## Failure Behavior

- File not found: Exit code 2 (INVALID_ARGS)
- No supported files found: Exit code 2
- Cannot create output directory: Exit code 5 (BACKUP_FAILURE)
- Parse failure: Warning logged, file skipped
- Validation failure: Record reported as invalid, not written

## CLI Usage

```bash
# Dry-run ingestion from a directory
node scripts/kb-ingest.mjs --source ./knowledge/tnau --source-name "TNAU Agritech Portal" --dry-run --verbose

# Single file
node scripts/kb-ingest.mjs --source ./knowledge/tnau/paddy.md --source-name "TNAU" --dry-run
```

## Key Safety Invariants

1. `verified` is never set to `true` by the pipeline
2. Chemical dosages without full provenance are blocked by ResponseValidator
3. No records are written during dry-run
4. No external data is ingested automatically
5. Existing provenance rules are unchanged
6. Quarantined records are never promoted without authoritative evidence
