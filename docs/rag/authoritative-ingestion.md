# Authoritative Ingestion Pipeline (Phase 3C audit)

Status 2026-10-01: the pipeline was NON-FUNCTIONAL (CJS modules in an ESM
package → every import failed) and is now repaired to dry-run capability.
No external data has been ingested. CLI is dry-run-oriented; nothing writes
to IndexedDB, seeds, or KB v2.

## Stages (`src/services/ingestion/`, driven by `scripts/kb-ingest.mjs`)

1. **Importer** (`importer.js`): json/markdown/csv → record arrays. Supports
   single objects, `{records:[...]}`, YAML front matter, heading/table blocks.
   Fixed 2026-10-01: ESM exports; front-matter first-line skip; JSON-only FM;
   undetected `---` docs; single-object silent drop; `{record,skipLines}`
   wrappers leaking downstream; real `source` overwritten by placeholder.
2. **Normalizer** (`normalizer.js`): maps to KB v2 fields per kind (12 kinds:
   crop/disease/pest/symptom/nutrient_deficiency/treatment/fertilizer/
   irrigation/harvest/storage/faq/scheme). Nulls for missing fields.
3. **Validator** (`validator.js`): fail-closed — bad kind, missing id/name,
   non-array symptoms, disease-bad-cropId, treatment-bad-diseaseId, and
   verified-without-source+sourceUrl are ERRORS; missing source, unknown ids,
   dosage-without-provenance are WARNINGS (validator blocks at UI).
4. **Dedup** (`dedup.js`): exact/crop-disease/crop-pest/disease-symptom/near-name;
   ambiguous matches go to a review report, never auto-merged.
5. **Report** (`report.js`): counts by kind/source/validation/dedup/provenance/
   relationships/high-risk; JSON report file per run.

## Provenance rules (unchanged, verified in code)

- `verified` passes through ONLY from explicit source `verified:true` —
  nothing in the pipeline sets it. A source file CAN claim it (review gate
  required; see `authoritative-source-plan.md`).
- `source`/`sourceUrl`/`verified*` survive migration (`metadataFor(kind, rec)`
  preserves them since Phase 3B).
- Junk defaults documented: importer placeholder `source:'markdown'`
  (priority 0, never verifies); normalizer default `source='unknown'`.

## Known pipeline gaps (do NOT silently work around)

- `CROP_ALIASES_MAP`/validator `KNOWN_CROP_IDS` use UPPERCASE ids while the KB
  uses `crop_*` lowercase → every real cropId warns as unrecognized.
- CLI `knownCropIds`/`knownDiseaseIds` are 5+2 hardcoded minima, not the KB.
- `parseMdBlock` kv/table regexes are ASCII-identifiers only; Tamil/Hindi keys
  in markdown sources are skipped (JSON/CSV unaffected).
- Normalizer `cropId` auto-mapping only for kind `crop`; disease↔crop links
  rely on source `cropId` fields (see `crop-disease-edge-audit.md`).
- Report line uses single quotes around `${reportPath}` (cosmetic, uninterpolated).

## Formats / dry-run / failure behavior

- Formats: `.json` (object/array/envelope), `.md`/`.markdown` (front matter,
  headings, `| k | v |` tables), `.csv` (header + rows; naive comma split —
  quoted commas unsupported).
- Dry-run (`--dry-run`): mandatory path exercised; writes ONLY the timestamped
  JSON report to `./ingestion-reports/`. Terminal summary + exit codes
  (0/2/3/4/5/6). Verified live 2026-10-01 on `tests/fixtures/kb-ingestion/`
  (json single-object + md front-matter both flow end-to-end).
- Failure: unparsable/undetected files are skipped with a verbose-only warning
  (silent by default — check exit summary counts, not stderr); invalid records
  are excluded from valid sets, never auto-corrected.
