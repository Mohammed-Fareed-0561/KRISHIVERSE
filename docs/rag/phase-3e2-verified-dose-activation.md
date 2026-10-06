# Phase 3E.2 — Claim Adjudication + First Verified Dose-Bearing Activation

Date: 2026-10-06 · Branch working tree (uncommitted) · Non-negotiables held: no Hermes, no
Laya/Crop Doctor changes, no bulk ingestion, no guessed URLs or dosages, provenance never
inferred, ResponseValidator never weakened.

## 1. Objective and outcome

Prove the whole authoritative chain end-to-end on one small record:

`authoritative source → provenance → validation → activation → KB migration → crop-scoped
retrieval → ResponseValidator → verified dose authorization`

**Outcome: PASS, with one safety gap found, measured and closed.** The staged rice-blast
treatment record was adjudicated claim-by-claim against fetched TNAU content, corrected,
activated as the KB's first dose-bearing `verified: true` record, migrated, and proven to
authorize a dose only for the right crop. Activation initially exposed a cropless-query leak
(§8); that leak is now blocked by a new, strengthening rule in `ResponseValidator` and pinned
by regression tests.

## 2. Sources verified (5 URLs, content-checked — never guessed)

| URL | HTTP | Role |
|---|---|---|
| `https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html` | 200 | primary: symptoms, cultural/preventive/chemical management, **all doses** |
| `https://agritech.tnau.ac.in/crop_protection/rice_diseases/rice_1.html` | 200 | pathogen + symptoms; **carries no dose, no neem, no Trichoderma** |
| `https://agritech.tnau.ac.in/crop_protection/rice_diseases/another%20methods_rice_1.html` | 200 | corroboration only |
| `https://agritech.tnau.ac.in/pdf/8.pdf` | 200 | TNAU CPPS publication — downloaded (325,652 bytes), text-extracted; corroborates `Tricyclozole 75 WP @ 1g/l`, `Carbendazim 50WP @ 1g/l`, `Remove collateral weed hosts from bunds and channels` |
| `https://agritech.tnau.ac.in/expert_system/paddy/nurserymgmt.html` | 200 | corroboration: Tricyclazole 1 g/lit, Pseudomonas 10 g/kg seed |

A `sourceOrganization` label alone was never treated as evidence: every stored claim had to
appear in fetched page/PDF text. Full audit lives in
`KRISHIVERSE/knowledge/tnau-pilot/.pilot-config.json` → `verification.claimAudit`.

## 3. Claim audit A–G (every staged claim adjudicated)

| # | Staged claim | Verdict | Resolution |
|---|---|---|---|
| A | Tricyclazole `@ 0.6g/liter` | **not supported — conflicts with source** | corrected to `@1g/liter` (cpdisblast.html + pdf/8.pdf) |
| A2 | spray at tillering/booting/flowering | supported | kept; nursery stage added from source |
| B | Pseudomonas `@ 10g/liter spray` | **unit + method wrong** | replaced with source wording: dry seed treatment `@10g/kg of seed`, foliar `@0.5%` from 45 DAT, 10-day intervals, three times |
| C | Neem oil `@ 5ml/liter` | **not authoritative for blast** | **removed** |
| D | Trichoderma viride seed treatment | **not authoritative for blast** | **removed** |
| E | Carbendazim `50% WP @ 1g/liter` | supported | promoted into `chemicalControl` (now explicit + traceable) |
| F | `Remove and destroy infected plant parts` | **not on any TNAU blast page** | replaced with source's own line: `Remove collateral weed hosts from bunds and channels` |
| G | `sourceUrl` absent, `verified` false | **gate could not pass** | `sourceUrl` set to the verified cpdisblast page, `verified: true`, `verifiedDate: 2026-10-06`, **region deliberately left absent → `null`** |

Nothing was silently merged: every conflicting dosage was replaced, not averaged.

## 4. Activation gate — 12/12 passed

| Gate | Result |
|---|---|
| every dosage claim authoritative | ✅ |
| every application method authoritative | ✅ |
| every high-risk claim authoritative | ✅ |
| `sourceUrl` present | ✅ |
| `sourceOrganization` authoritative | ✅ |
| not synthetic | ✅ (`recordKind: "curated"`, `status: "active"`) |
| not quarantined | ✅ (`quarantineReason: null`) |
| validator passes, zero errors | ✅ (`normalizeRecord` → `validateRecord`) |
| `diseaseId` resolves | ✅ → `tnau_rice_blast` |
| provenance survives normalization | ✅ (`source`/`sourceUrl`/`verified`/`verifiedDate` intact, `region: null`) |
| crop-scoped evidence enforced | ✅ (router scoping §7 + validator backing §7) |
| unsupported dosages removed | ✅ (0.6 g/L, neem, Trichoderma, 10 g/L spray all gone) |

## 5. Activation implementation (existing mechanism only)

- `KRISHIVERSE/src/data/seed/treatmentData.js` — record appended (no `region`, no
  `method_ta`/`method_hi` — never fabricate translations).
- `KRISHIVERSE/src/services/db/kbNormalize.js` — `KNOWN_CURATED.treatments` += id; migration
  report made truthful: `verifiedDosage` derived (`verified===true && source && sourceUrl`),
  `unverifiedDosage = dosageRecords − verifiedDosage` (was hardcoded `0`).
- `npm run migrate:kb` — seed → `src/data/kb/v2/*.json` (backup written). The ingestion CLI
  (`scripts/kb-ingest.mjs`) was **not** used and remains dry-run-only.
- Pilot file `knowledge/tnau-pilot/rice-blast-treatment.md` rewritten; parses to exactly
  1 record, as do all three pilot files (no phantom records).

## 6. KB migration report (post-activation)

| Field | Value |
|---|---|
| total / synthetic / quarantined / curated | **15,023** / 15,000 / 15,000 / **23** |
| `recordsWithSource` / `recordsWithSourceUrl` / `verifiedRecords` | **2 / 2 / 2** |
| `recordsWithDosage` / `verifiedDosage` / `unverifiedDosage` | **3 / 1 / 2** |
| `withDiseaseId` / `resolvedTreatmentLinks` / `unresolvedEdges` | 1,083 / 1,079 / 8 |
| `resolvedCropLinks` / `resolvedSymptomLinks` | 1,029 / 1,258 |
| duplicates | 0 |
| language coverage (non-quarantined) | en 15, ta 13, hi 13 |
| `needingEnrichment` | `tnau_rice_blast`, `tnau_rice_blast_treatment` |

Only two records in the entire KB carry provenance (`tnau_rice_blast` from 3E.1 and this
record). The two other dosage records keep **zero** provenance and still block.

## 7. What changed in `ResponseValidator` (strengthening, not weakening)

Activation made the pre-existing "any `isVerifiedRecord` in evidence unlocks a dose" design
reachable: `recordMatchesQueryCrop` is a no-op when `parseQuery` finds no crop, so a generic
`spray schedule` could borrow the rice record. New rule, scoped **only** to dose
authorization:

```
isDosageBacker(record, queryCrop):
  not isVerifiedRecord(record)            → false
  record has no cropId/crop                → true   (crop-agnostic stays eligible)
  queryCrop empty                          → false  (crop never established)
  record.crop matches queryCrop (raw, then normalizeCrop alias) → true
  otherwise                                → false
```

- `validateResponse` now gates `high_risk` on `doseBacking`; confidence,
  `recommendation_without_verified_source`, and the evidence list are untouched.
- New diagnostic reason `high_risk_verified_evidence_crop_ineligible` (additive only).
- `recordMatchesQueryCrop`, provenance rules, the 12-field evidence contract and the
  Phase 3E.1 crop-scoped evidence fix are all unchanged.

## 8. Dosage authorization before/after (measured)

Six-query probe run against the real migration + index + validator (probe deleted after use;
pinned as `tests/verified-dosage-safety.test.js` describe 9):

| Query | crop | pre-activation | post-activation, before fix | **after fix** |
|---|---|---|---|---|
| `copper oxychloride spray` | none | blocked | **safe (3g/L leaked)** | **blocked** ✅ |
| `spray schedule` | none | blocked | **safe (3g/L leaked)** | **blocked** ✅ |
| `spray schedule for tomato` | tomato | blocked | blocked | blocked ✅ |
| `what is the dose for rice blast` | rice | safe | safe | safe ✅ (intended) |
| `how to control whiteflies` | none | cautious | cautious | cautious ✅ |
| `neem leaf extract spray` | none | safe | safe | safe (pre-existing, see §12) |

After the fix, every verdict matches the pre-activation baseline, and the rice query is still
authorized. The rice record remains in the unscoped evidence list (grounding not filtered).

## 9. Retrieval benchmark before/after

`eval/results/retrieval.json`, generated `2026-10-06T08:40:23.708Z`, n = 44, **0 failures**:

| Metric | Phase 3E.1 baseline | Phase 3E.2 | Δ |
|---|---|---|---|
| R@1 | 0.750 | **0.727** | −0.023 |
| R@3 | 1.000 | **1.000** | 0 |
| R@5 | 1.000 | **1.000** | 0 |
| MRR | 0.875 | **0.848** | −0.027 |

Safety-relevant metrics (R@3, R@5) are unchanged; no case falls outside top-5. By topic:
general 0.5/0.694, disease 0.75/0.875, symptom 0.8/0.9, treatment 0.833/0.917,
prevention 1.0/1.0 (R@1 / MRR). Rank-1 regressions attributable to activation:
`ret-tx-copper-en` 1→2 and `ret-crop-rice-{en,ta,hi,alias}` 2→3 — caused by the
out-of-scope provenance boost (`SOURCE_BOOST_FACTOR`/`VERIFIED_BONUS`) giving our record
+2..3 on shared tokens (`spray`, `rice`). Not a correctness failure; tuning those weights is
explicitly out of scope for this phase.

## 10. Test results

| Suite | Result |
|---|---|
| `npx vitest run` (FE/evals, includes safety 7/7 + provenance 6/6) | **34 files, 314 tests passed, 0 failed** |
| backend `npm test` (mocha) | **44 passing** |
| `npm run lint` | 84 problems (80 errors, 4 warnings) — all pre-existing; **zero** in files touched this phase |
| `npm run build` | **PASS**, 31.05s, PWA precache 67 entries |
| retrieval | 44/44 within top-5, 0 failures |

New/updated tests: `tests/verified-dosage-safety.test.js` (23 tests: gate, uniqueness of the
one verified dosage record, crop-matched authorization, no-backing block, cross-crop block,
cropless block, crop-agnostic eligibility, retrieval/quarantine exclusion, unsupported claims
gone, cropless-leak regression); `tests/authoritative-activation.test.js` (activation
provenance, stripped-`sourceUrl` rejection, no fabricated provenance, and the
cross-crop/no-scoping control now asserts `blocked`); `src/services/db/kbMigration.test.js`
(truthful dosage/provenance/coverage counts).

## 11. Scope discipline — what did NOT change

- Laya, Crop Doctor, the ingestion CLI, RAG architecture, provenance boost weights.
- Evidence list / grounding / confidence weights / recommendation reasoning.
- `recordMatchesQueryCrop` and the Phase 3E.1 crop-scoped evidence fix.
- The 12-field evidence contract; `provenance-preservation.test.js` fixture (staged 0.6 g/L)
  left untouched and still passing.
- No machine-translated content, no `region` inference, no bulk ingestion.

## 12. Residual risks (measured, honest)

1. **Cropless queries cannot be dose-authorized at all** — by design of the fix. A farmer who
   asks `spray schedule` with no crop gets the safe limitation message + clarification rather
   than a dose. Recoverable: ask the crop (already the `clarification` path).
2. **`classifyRecommendationType` misses bare `%` doses (pre-existing).** The high-risk
   pattern's trailing `\b` never matches after `%`, so `"Spray 10% Neem leaf extract."`
   classifies as `recommendation` and bypasses dose gating entirely. Unchanged this phase
   (out of scope, would move eval counts) — recommend fixing with a `(?!\w)` lookahead.
3. **Provenance boost still outranks crop-correct results** for shared tokens (§9) — R@1
   −0.023. Needs an explicit weight-tuning phase, not a hot fix.
4. **Two verified records, English only** — `needingEnrichment` flags both; missing
   translations are a content gap, not a retrieval bug.
5. **Synthetic screening corpus** for retrieval: 12 curated records indexed; the benchmark
   proves ordering, not real farmer traffic.

## 13. Next steps

1. Phase 3E.3: fix the `%` classification gap (§12.2) and re-measure safety evals.
2. Phase 3E.4: provenance-boost weight tuning to recover the R@1 regression (§9, §12.3).
3. Extend the pilot to the next authoritative source class (ICAR) using the same
   claim-audit → gate → activate loop; keep one record per activation so provenance stays
   auditable.
4. Commit the working tree (currently uncommitted) once reviewed.
