# KB Quality Audit (Phase 3B, measured 2026-10-01)

Method: read-only scan of `KRISHIVERSE/src/data/kb/v2/*.json` (probe script in
`/tmp`, not committed). No migration run, no writes.

## Totals (v2 snapshot)

| Store | Total | Curated | Synthetic (quarantined) | With source | With sourceUrl | Verified |
|---|---|---|---|---|---|---|
| crops | 503 | 3 | 500 | 0 | 0 | 0 |
| symptoms | 2,505 | 5 | 2,500 | 0 | 0 | 0 |
| diseasePests | 3,002 | 2 | 3,000 | 0 | 0 | 0 |
| treatments | 4,003 | 3 | 4,000 | 0 | 0 | 0 |
| edges | 5,008 | 8 | 5,000 | 0 | 0 | 0 |
| **all** | **15,021** | **21** | **15,000** | **0** | **0** | **0** |

Manifest: 393 conflicts (edge-over-field link repairs), 8 dangling
hand-authored edges. Searchable (non-quarantined): **21 records**.

## Language

| Store | with `_ta` | with `_hi` |
|---|---|---|
| crops | 503/503 | 503/503 |
| symptoms | 5 | 5 |
| diseasePests | 2 | 2 |
| treatments | 3 | 3 |
| edges | 0 | 0 |

Only curated records carry Tamil/Hindi outside crops. Missing-language
knowledge is a CONTENT gap, not a retrieval failure (see multilingual note in
`docs/evaluation/evaluation-report.md`).

## Relationships

- Treatments with `diseaseId`: 1,082 checked, **0 dangling** (migration repair).
- Diseases with `cropId`: 1,031 checked, **0 dangling** — but **1,971 disease
  records carry no `cropId` at all** (no crop linkage to rank on).
- Per-cropId disease counts top out at 7 (thin synthetic spread).
- Treatments with dosage-like text: ~1 (curated chem record; blocked by the
  validator unless verified — verified count is 0, so all doses block).

## Schema coverage (Phase 3C review of `db/schemas.js` + normalize + seeds)

Representable today: crop, disease, symptom, pest (via diseasePests),
treatment/management, prevention, source, sourceUrl, language (`languages{}`
+ `*_ta`/`*_hi`), verified (+By/+Date), relationships (edges + cropId/diseaseId,
currently unwired into answers).

Gaps (documented, values NOT invented): no cultivation/fertilizer/irrigation
content stores (those answers are static templates); no canonical
`sourceOrganization` field (only scanned `provider/publisher/origin` text);
no `region`/district field on KB records. Fill only via the controlled
ingestion plan (`authoritative-source-plan.md`).

## Reading guide
- 15,021 records ≠ 15,021 facts. Searchable knowledge = 21 curated records;
  the rest are quarantined synthetic filler excluded from the index.
- Zero provenance fields means the validator MUST stay in blocking posture
  for all high-risk content; any future sourced ingest must preserve
  `source`/`sourceUrl`/`verified` end-to-end (migration → index `_verified` →
  validator backing).
