# Evaluation Report — Quality Dashboard (Phase 1H)

Date: 2026-09-30. Flag: `VITE_ENABLE_LAYA_DECISIONS=false` (unchanged).
Origins: screening cases are **synthetic-screening (NOT ground truth)**;
image labels are the **PlantVillage hold-out** (`backend/eval/dataset`,
120 imgs); test counts are suite results. No accuracy number here is
expert-labelled. Runners: `krishiverse/eval/*.eval.test.js` (vitest, write
`eval/results/*.json`), `scripts/benchmark-decision.mjs` (needs live backend;
real-Laya arm needs the sidecar — see `docs/laya-integration.md` §4.1).

## Dashboard

| SYSTEM | Metric | Current result | Test size | Known limitations | Next improvement |
|---|---|---|---|---|---|
| chatbot | screening pass rate | 18/25 (72%) | 27 screening cases | 0 expert labels; failures are real gaps (§Failures) | agronomist-labelled set (blocker §Missing) |
| chatbot | intent (screening) | 10/14 approx; EN 75%, TA/HI 0% | 14 intent/chat rows | no Tamil/Hindi intent keywords; `help`→scheme; `तना`⊂`कितना` tie-break; no what-is rule (frontend) | Phase-2 intent work (do NOT hotfix blindly) |
| chatbot | crop extraction | 100% all 4 languages | 9 slot checks | tiny set | expand with labelled set |
| chatbot | clarification | 100% screened (2/2 local; backend builtin 2/2) | 2–4 rows | real-Laya `noul` 1/2 | tune `needs_info` question |
| RAG | recall@5 (curated seeds) | 3/3 EN + 1/1 TA | 4 rows, 13-record index | full 15k-record index unmeasured; edges unwired; static templates for 6 intents | index-scale eval; edge traversal |
| disease detection (text) | top-1 screening | 2/2 rice cases | 2 rows | screening only; unknown crop returns cross-crop guesses | labelled symptom set |
| disease detection (rules) | determinism | deterministic ✅; unknown ignored ✅ | 2 checks | `Math.random` mocks in image path (non-deterministic) | remove mocks (Phase 2) |
| disease detection (ONNX) | recorded hold-out | 95% top-1 (120 img, 20/class, Wilson [0.895,0.977]) | 120 PlantVillage imgs | 6 classes only (tomato/potato/pepper); 3 classes lack KB diseaseId; public snapshot stale (86.7%) | per-class PR; refresh snapshot; widen crops |
| multilingual | per-lang intent/crop/retrieval | EN(.75/1/1) TA(0/1/1) Tanglish(1/1/–) HI(0/1/–) | 17 rows | n-small; symptom slots uncovered; no TE/KN/ML | labelled multilingual set |
| decision (builtin) | intent / clarif / cand | 13/13 / 2/2 / 2/2, avg 23ms | 17 backend cases | keyword-bounded; parsed-reuse depends on frontend | keep as fallback baseline |
| Laya (real, OFF) | intent / clarif / cand | 11/13 / 1/2 / 2/2; avg 863ms, p95 1128–2121ms; 0 timeouts/invalid | 17 cases, sidecar rev 55cf4c4e | over-confident errors; urea/paddy edge; Tamil MASSIVE 0.250; 1.7GB sidecar | temp refit; fine-tune eval; `noul` tuning |
| policy-gated (D) | intent | 13/13 on set | 17 cases | set-small; gain is +1 case | larger labelled set |
| safety | regression | 7/7 pass; suites 150 FE + 42 BE | 7 invariants + suites | patterns are regex (e.g. "plant" noun → recommendation) | semantic review (Phase 2) |
| performance | build / suites / lint | build PASS; 150/150; 42/42; touched-file lint clean | full | router-tier latencies unmeasured in prod | prod latency telemetry |

## Screening failures (all reproduced, all real)

1. `help` → `scheme` (keyword collision; desired: about/unknown → clarify).
2. Pure-Tamil intent → `unknown` (no Tamil intent keywords; crop ✅).
3. Hindi intent → `unknown` (no matching Hindi intent keywords; crop ✅).
4. `कितना` → `disease` (`तना`/stem substring + disease-first tie-break).
5. `What is rice?` → `unknown` frontend (backend builtin has the what-is rule; inconsistent).
6. Informational "plant roots" sentence → `blocked` ("plant" noun matches recommendation verb pattern + zero-evidence VERY_LOW).
7. Unknown-crop text diagnosis returns cross-crop guesses instead of abstaining.

## Missing datasets (blockers)

- **Expert-labelled chatbot set** (intent/crop/symptom/clarification/retrieval, EN/TA/Tanglish/HI): none exists. All chatbot numbers above are screening.
- **Expert-labelled symptom→disease text set**: none exists.
- **Image set beyond 6 classes**: only tomato/potato/pepper hold-out (120) exists; rice/chilli/banana image claims unevaluable.
- **Laya calibration set**: no KrishiVerse-labelled temperature-fit set; served confidences are routing-only.
- Items 1–3 need agronomist effort; do not synthesize and label as truth.

## Phase 2 re-measurement (2026-10-01, NLP/chatbot fixes, flag still OFF)

- Suites: frontend **194/194**, backend **44/44** (one flaky 42+2 run under
  parallel load; green 3× solo). Build PASS. Touched-file lint clean
  (remaining warnings pre-date Phase 2).
- Chatbot screening: **33/33 (was 18/25)**. Multilingual intent: **EN/TA/
  Tanglish/HI all 1.0** (were .75/0/1/0); crop 1.0 all.
- Backend decision suite unchanged green incl. new help/what-is/treatment rows.
- Laya benchmark not re-run (adapter taxonomy extended to 12 intents;
  re-measure in Phase 3 if enabled).
- Disk incident: pip cache (2.3GB, own session debris) purged; duplicate
  standalone laya-multilingual snapshot removed (sidecar-compatible hub copy
  retained). `laya` 0.3.22 verified importable after purge.

## Phase 3B re-measurement (2026-10-01, RAG quality, flag still OFF)

- Suites: frontend **216/216** (28 files), backend **44/44**. Build PASS.
  Touched-file lint: no new issues (remaining warnings pre-date this work).
- Retrieval benchmark (44 screening cases, 13 curated records): **Recall@1
  .909 / Recall@3-5 1.0 / MRR .955**, per-language R@5 1.0 (EN/TA/HI),
  per-topic R@5 1.0 (general/disease/symptom/treatment/prevention).
  Headline fix: symptom/treatment body fields (`text`, `method`, `*_ta/hi`)
  were never indexed — exact body-text queries scored 0 before, 1.0 after.
- Grounding trace: 4/4 responses contain matched evidence names (substring
  trace; semantic entailment explicitly NOT claimed).
- Provenance: source-priority order verified unchanged; normalization now
  preserves existing source fields (latent wipe bug fixed, no live data
  affected); quarantine exclusion re-tested.
- KB: 15,021 records = 21 curated + 15,000 quarantined synthetic; 0 sourced,
  0 verified; 1,971 diseases lack cropId; 393 migration conflicts.
  See `docs/rag/kb-quality-audit.md`.
- Multilingual retrieval: TA/HI queries retrieve EN-source records via
  aliases (measured R@5 1.0); missing `*_ta/*_hi` is a content gap, not a
  retrieval failure. Fertilizer/pest/cultivation topics have no curated
  evidence (reported uncovered).
- Stale 30-row ONNX snapshot archived to
  `backend/eval/onnx_eval_results_2026-08-19_v1-weights_HISTORICAL.json`.
- Laya NOT re-benchmarked (unchanged since Phase 1 measurements).

## Recommended next phase (Phase 2, NOT started)

1. Commission small expert-labelled sets (chat + symptoms + multilingual; ~200–400 rows).
2. Intent repair behind the eval gate: Tamil/Hindi keywords, `तना` boundary fix, `help`→about, frontend what-is parity, "plant"-noun precision fix — each with before/after eval.
3. Crop Doctor determinism: remove `Math.random` mocks; gate unknown crops; refresh stale ONNX snapshot.
4. Laya: temperature refit → re-benchmark → enablement decision stays data-gated.
5. RAG scale eval + edge wiring; router latency telemetry.
