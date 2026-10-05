# Crop–Disease Edge Audit (Phase 3C, measured 2026-10-01)

Question: can any of the 1,971 crop-less (`cropId` null) disease records
justifiably receive a crop assignment? Answer: **no**. Classification below.

## Counts

| Class | Definition | Count |
|---|---|---|
| A — authoritative source names the crop | record has source/sourceUrl identifying crop | **0** (zero sourced records exist anywhere in v2) |
| B — curated relationship establishes crop | curated edge to a crop record | **0** (8 curated edges reference legacy ids like `disease_pomegranate_blight`, none present in diseasePests; none touch a null-crop record) |
| C — ambiguous active record | non-synthetic, no A/B | **0** (all 1,971 are synthetic) |
| D — synthetic/quarantined | excluded from index by policy | **1,971** |

## Detail

- All 1,971 null-cropId diseases are `recordKind: synthetic`, `status:
  quarantined`. None carry source, sourceUrl, or verified.
- 1,093 appear in synthetic edges (`affects`/`cured_by`/`prevented_by`/
  `manifests`, all synthetic) — synthetic edges are not evidence and cannot
  promote a record out of quarantine.
- 393 manifest conflicts and 8 dangling hand-authored edges are pre-existing
  link debt, unrelated to crop assignment.

## Decision

**No mass-edit.** Crop assignment requires A/B evidence, which does not
exist. Only future authoritative records (with source + crop linkage, reviewed
per `authoritative-source-plan.md`) may establish new crop edges. Disease-name
guessing was not used — not even for counting.
