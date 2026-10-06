# KB Quality Audit (Phase 3B, measured 2026-10-01; updated 2026-10-05 after Phase 3E.1 activation; updated 2026-10-06 after Phase 3E.2 dose activation)

Method: read-only scan of `KRISHIVERSE/src/data/kb/v2/*.json` (probe script in
`/tmp`, not committed) plus `manifest.json`. No migration run, no writes. The
2026-10-05 and 2026-10-06 updates are post-`migrate:kb` read-only rescans.
Phase 3E.2 report: `docs/rag/phase-3e2-verified-dose-activation.md`.

## Totals (v2 snapshot, 2026-10-06)

| Store | Total | Curated | Synthetic (quarantined) | With source | With sourceUrl | Verified |
|---|---|---|---|---|---|---|
| crops | 503 | 3 | 500 | 0 | 0 | 0 |
| symptoms | 2,505 | 5 | 2,500 | 0 | 0 | 0 |
| diseasePests | 3,003 | 3 | 3,000 | 1 | 1 | 1 |
| treatments | 4,004 | 4 | 4,000 | 1 | 1 | 1 |
| edges | 5,008 | 8 | 5,000 | 0 | 0 | 0 |
| **all** | **15,023** | **23** | **15,000** | **2** | **2** | **2** |

Manifest: 393 conflicts (edge-over-field link repairs), 8 dangling hand-authored
edges, 0 duplicates. Searchable (non-quarantined): **23 records**. Exactly two
records carry source/sourceUrl/verified: `tnau_rice_blast` (3E.1) and
`tnau_rice_blast_treatment` (3E.2, the first dose-bearing one) — both TNAU, both
`region: null`.

## Language

| Store | with `_ta` | with `_hi` |
|---|---|---|
| crops | 503/503 | 503/503 |
| symptoms | 5 | 5 |
| diseasePests | 2 | 2 |
| treatments | 3 | 3 |
| edges | 0 | 0 |

Coverage over non-quarantined content: en 15, ta 13, hi 13. Both activated TNAU
records add no `_ta`/`_hi` and are flagged `needingEnrichment`
(`tnau_rice_blast`, `tnau_rice_blast_treatment`) — never machine-translated here.
Missing-language knowledge is a CONTENT gap, not a retrieval failure (see
multilingual note in `docs/evaluation/evaluation-report.md`).

## Relationships

- Treatments with `diseaseId`: 1,083 checked, **0 dangling** (migration repair);
  `resolvedTreatmentLinks` 1,079, `unresolvedEdges` 8 (the 8 hand-authored ones).
- Diseases with `cropId`: 1,032 checked, **0 dangling** — but **1,971 disease
  records carry no `cropId` at all** (no crop linkage to rank on).
- Per-cropId disease counts top out at 7 (thin synthetic spread).
- Dosage-bearing records: **3** (2 unsourced curated + the activated TNAU record).
  Provenance split: `verifiedDosage` **1**, `unverifiedDosage` **2**. The two
  unsourced ones keep zero provenance and must keep blocking; the TNAU one
  authorizes a dose only for a query whose own crop matches (`isDosageBacker`,
  Phase 3E.2).

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
- 15,023 records ≠ 15,023 facts. Searchable knowledge = 23 curated records;
  the rest are quarantined synthetic filler excluded from the index.
- Provenance is 2 records: `tnau_rice_blast` (Phase 3E.1, no dosage) and
  `tnau_rice_blast_treatment` (Phase 3E.2, `@1g/liter`). The other 21 curated
  records stay zero-provenance, so the validator MUST remain in blocking posture
  for their high-risk content; any future sourced ingest must preserve
  `source`/`sourceUrl`/`verified` end-to-end (migration → index `_verified` →
  validator backing), and dose backing must stay crop-scoped.
