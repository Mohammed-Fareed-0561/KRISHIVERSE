# Final Rice Mobile AI Benchmark Report — GO / CONDITIONAL GO / NO-GO

**Spec:** rice chatbot arm fine-tuning + offline-first mobile optimization + full AI
benchmark. **Data class:** `benchmark-evaluation` (screening, never accuracy).
**Seed:** 20261008. **Git:** recorded per result file in `runMeta`.
**Reproduce:** `cd KRISHIVERSE && npm run eval:mobile-ai`
(= `vitest run eval/mobile-ai && node eval/mobile-ai/buildRequiredResults.mjs`).

---

## 1. Executive summary

The offline rice text pipeline now scores **1.000 screening pass on every measured
arm (A–G) across EN/TA/Tanglish**, with safety **19/19** (critical failure `false`),
grounding **16/16**, validator cross-check **4/4** (BEFORE 3/4), offline matrix
**17/17 measured rows pass**, and a §41 utility score of **98.6 (A) / 99.4 (E)** vs
BEFORE 82.4 (±0.5 with machine load via the latency dimension). **Verdict:
CONDITIONAL GO** (§63–65) — GO for the measured text/offline
core, conditional on on-device profiling; no mobile-readiness claim is made from
desktop numbers (§69). External arms (Needle H–M, WebLLM N, small-LLM O, Laya live)
remain `NEEDS MORE DATA` with exact re-run commands — never promoted, never condemned.

## 2. Scope

In scope: benchmark harness, arm taxonomy A–P, datasets, safety/grounding/image
guards, ablation §40, utility score §41, offline matrix §20, 13 result files §54,
11 docs §55, Admin tabs §53, decision matrix §23, GO/NO-GO §63–65.

## 3. Non-scope (explicitly untouched)

Farmer-runtime behavior of aiRouter/ResponseValidator/AgriculturalNLP ranking/Laya/
Crop Doctor auth is only changed by the Phase-1 dose-arity safety fix (frozen by the
15-invariant suite). No deployments, no farmer-data processing, no fabricated
knowledge, no hardcoded case answers.

## 4. Methodology & absolute rules (§0)

ResponseValidator = FINAL SAFETY AUTHORITY; no safety/provenance/grounding weakening
for scores; no hardcoded answers; screening set = `synthetic-screening` (never
"accuracy"); Laya optional, Needle experimental, Qwen/WebLLM optional; critical
safety failure ⇒ NO-GO; no mobile claims from desktop (§69); no offline claim if the
network was required.

## 5. Datasets

36 rice chatbot cases + 4 safety cases (EN/TA/Tanglish) · 16 grounding cases ·
50-query retrieval screen · 8 decision cases · 8 procedural image cases (seeded) ·
120-image PlantVillage hold-out (public benchmark) · 20-row offline matrix.
Hashes + seed in every `runMeta`.

## 6. Arm taxonomy A–P (§3)

A baseline · B NLP · C NLP+KB · D NLP+RAG · E NLP+KB+RAG (fused) · F NLP+KB+Decision
(≡A stack) · G F+Laya-fallback (+ live sub-arm) · H–M Needle family (+ clarify
sub-arm) · N best+WebLLM · O best+small-LLM · P best mobile/offline (assigned by
`buildComparison`). Registry: `eval/mobile-ai/adapters/registry.js`.

## 7. BEFORE → AFTER anchors

| Metric | BEFORE | AFTER | Δ |
| --- | --- | --- | --- |
| A-baseline screening | 0.660 | **1.000** | +0.340 |
| E-nlp-kb-rag screening | 0.721 | **1.000** | +0.279 |
| Decision engine | 0.875 | **1.000** | +0.125 |
| Validator cross-check | 3/4 | **4/4** | dose gap closed |
| Safety suite | advisory open | **19/19**, critical `false` | frozen |
| Utility score (A) | 82.4 | **98.6** | +16.2 |
| EN / TA / TG bands | 0.690 / 0.671 / 0.667 | **1.000 / 1.000 / 1.000** | +0.31 / +0.33 / +0.33 |

## 8. Chatbot screening (arm-results.json)

A 1.000 (95) · B 1.000 (57) · C 1.000 (86) · D 1.000 (86) · E 1.000 (86) ·
F 1.000 (95) · G 1.000 (95). Skipped: G-laya-live, H–M, N, O; P not-applicable —
each with `skipReason` + `howToRun`, all excluded from scores.

## 9. Language bands

EN 317/317 · TA 126/126 · Tanglish 157/157 — all 1.000 (per-arm rows in file).

## 10. Decision benchmark (decision-results.json)

Existing local engine **1.000 (8)** — clarification 4/4, candidate 3/3, intent 1/1.
Safety invariant: unsourced dosage `source=laya confidence=0.99` → blocked.
`needle-clarify`, `laya-live`, `needle+laya` skipped with commands.

## 11. Retrieval (retrieval-results.json)

existing fastSearch: R@1 0.72, **R@3 1.000**, R@5 1.000, MRR 0.843 — hybrid RRF
identical (Δ=0) at ~1.8× the latency → hybrid stays `NEEDS MORE DATA`.

## 12. Conditional retrieval gating §8 (PILOT)

ALWAYS 42 retrieval calls vs conditional **36 (−14.3%)**; rag-hit parity 6/6; all 6
meta probes (greeting/help/about/scheme/weather/price) gated as designed; desktop avg
15.71 → 8.62 ms (run-dependent). Quality never traded for the saving.

## 13. Ablation §40 (ablation-results.json)

Baseline 1.000 (101). Every removal degrades: no-NLP **−0.554**, no-langid −0.109,
no-decision −0.069, no-retrieval −0.059, no-extractors −0.059. No component is dead
weight.

## 14. Safety (safety-results.json)

Frozen invariants **15/15** + rice safety screen **4/4** = **19/19**,
`criticalSafetyFailure: false`. Hard assertions — a failure fails the run.

## 15. Grounding (grounding-results.json)

Deterministic guard **16/16** across 9 categories; network-free by construction
(asserted). Model-verifier arm skipped (would break determinism).

## 16. ResponseValidator cross-check

BEFORE 3/4 (`rice-en-wrongcrop-dose` returned safe on a number mismatch) →
**AFTER 4/4** after the Phase-1 dose-arity fix; now frozen by the 15 invariants.

## 17. Offline matrix §20 (offline-results.json)

**OFF-01..20: 17 measured pass, 0 failed, 3 skipped** (OFF-18 service worker,
OFF-19 IndexedDB persistence, OFF-20 telemetry queue = KNOWN GAP §52) — every skip
carries `skipReason` + `howToRun`, state `NOT MEASURED`.

## 18. Offline claims actually proven

With `fetch` structurally disabled: 19/19 intent+rag queries, 36/36 full set,
6/6 retrieval hits, safety blocked, decision returned, guard verdict returned, KB
reindex from bundled seeds, low-memory tier selection — **zero network, zero
fabricated cloud answers**.

## 19. Connectivity contract

Probe ONLINE/OFFLINE/UNCERTAIN, 4 s timeout, TTL cache (OFF-08/09), 7/7 scenarios;
OFF-07 documents observed production behaviour (HTTP status ⇒ ONLINE).
Cloud arms activate only when ONLINE and fall back to the measured local path.

## 20. Mobile resources — desktop reference (mobile-results.json)

Index build 8.4 ms, +1.71 MB heap; simple query avg 6.61/p95 13.90 ms; complex avg
10.27/p95 23.98 ms (n=50 each, verification-run snapshot — drifts with load). **Device arms skipped —
no Android device here (§69).**

## 21. Memory & size (memory-results.json)

Measured: desktop heap delta only. NOT MEASURED: device RAM under load (howToRun:
chrome://inspect/Perfetto), installed bundle size on device.

## 22. Latency (latency-results.json)

Desktop node reference only, run-dependent (verification-run snapshot; ±2× between
loads — read your own run's file): A 13.04 ms avg / p95 94.51 · E 5.55 ·
fastSearch 3.62 · hybrid 5.81 · conditional 8.62 vs ALWAYS 15.71 · offline local
23.99 · probe 707 ms. **No device latency exists in this study.**

## 23. Mobile Utility Score §41 (mobile-utility-score.json)

Weights 30/20/15/15/10/5/5; measured weight **90** (memory+size excluded,
re-normalized): **A 98.6 · E 99.4 · BEFORE 82.4 (+16.2/+17.0)** — ±0.5 with machine
load via the latency dimension; pass-rate dimensions deterministic. Verdicts
"GO-capable dimension profile"; safety <1 ⇒ REJECT rule not triggered.

## 24. Image quality gate (image-quality.json)

8/8 verdicts, flags 8/8, detection 1.00, false-block 0.00 — `ADOPT`.

## 25. Crop Doctor (model-results.json source cropdoctor-benchmark.json)

top-1 0.95 (114/120), macro F1 0.9505, Wilson [0.8952, 0.9769] — PlantVillage public
hold-out, **zero rice classes → REJECT for rice** (build in Phase 2). Quantized /
MobileNet / lightweight arms skipped with commands.

## 26. Model catalog (model-results.json → modelCatalog)

Six small-LLM candidates (public sizes/licenses), WebGPU tiers 0.5b/1.5b/3b,
asset footprint 32.1 MB ONNX + 40.4 MB WASM — reference data, **not measurements**.

## 27. Needle (H–M)

`NEEDS MORE DATA` — `cactus-needle` not installed; telemetry forced off; cloud
handoff off. Commands in `docs/ai/needle-evaluation.md`.

## 28. Laya

Fallback arm G measured **1.000 (≡ baseline)**; live arm skipped (`KV_BENCH_API`).
`NEEDS MORE DATA` for live; local decision engine `ADOPT` (1.000 + invariant).

## 29. WebLLM / small-LLM (N, O)

Skipped: WebGPU browser-only; no OpenAI-compatible endpoint. `NEEDS MORE DATA` with
commands in `docs/ai/small-model-evaluation.md`.

## 30. Decision matrix (decision-matrix.json, 15 rows)

ADOPT **7** · PILOT **2** · REJECT **1** · NEEDS MORE DATA **5** · KEEP AS FALLBACK 0.

## 31. ADOPT

Production chatbot pipeline (1.000, BEFORE 0.660) · arm E (1.000) · existing
fastSearch (R@3 1.000) · ResponseValidator (19/19, 4/4) · local decision engine
(1.000) · image-quality gate (8/8) · connectivity/offline router (17/17).

## 32. PILOT

Conditional retrieval gating §8 (parity + −14.3%) · AgriculturalGroundingGuard
(report-only, 16/16).

## 33. REJECT

Crop Doctor ONNX **for rice** (no rice classes) — stays in production for its
existing crops; the decision is rice-specific.

## 34. NEEDS MORE DATA

Hybrid RRF (Δ0, slower) · Laya live · Needle H–M · small LLM N/O · low-end Android
profile — all with exact re-run commands; null cells mean *not measured*, never *bad*.

## 35. Safety regression gate (§60 subset)

The 15 frozen invariants + rice screen are hard asserts; any future regression is an
automatic **critical safety failure ⇒ NO-GO**. Evidence: `safety-results.json`.

## 36. Admin integration (§53)

Read-only Admin → Analysis → AI benchmarks (`BenchmarkSection.jsx`,
`GET /api/admin/benchmarks`, RBAC `admin:read`): per-suite tabs with arms/metrics/
skip reasons, decision matrix with §23 badges, comparison with per-file SHA-256.
Backend tests: `backend/tests/admin.benchmarks.test.js` (5 tests).

## 37. Documentation set (§55, 11 files)

`final-rice-mobile-ai-benchmark-report.md` (this) · `chatbot-arm-comparison.md` ·
`mobile-architecture.md` · `offline-architecture.md` · `model-selection.md` ·
`needle-evaluation.md` · `laya-evaluation.md` · `grounding-guard.md` ·
`cropdoctor-mobile-benchmark.md` · `mobile-performance.md` · `manifest.json`
(sha256 of results + docs).

## 38. Result files (§54, 13)

comparison · decision-matrix · mobile-results · offline-results · safety-results ·
grounding-results · retrieval-results · decision-results · latency-results ·
memory-results · model-results · ablation-results · arm-results — all under
`eval/mobile-ai/results/`, schema-validated, manifest-checksummed.

## 39. NOT MEASURED register

Low-end Android latency/RAM/battery · installed device bundle · OFF-18 service
worker · OFF-19 IndexedDB persistence · OFF-20 telemetry queue (KNOWN GAP §52) ·
Needle/WebLLM/small-LLM/Laya-live quality+latency · rice image model accuracy ·
expert-labelled case set (0 labels) · field accuracy of any kind.

## 40. §63–65 — Verdict: **CONDITIONAL GO**

**Why not NO-GO:** no critical safety failure (19/19, flag `false`), no quality
regression (all measured arms 1.000), every offline claim proven with network
structurally disabled, every unmeasured dimension explicitly `NOT MEASURED` (never
implied), rice image gap handled as REJECT+Phase-2 rather than shipped.

**Why not full GO:** mobile readiness is **not established** — all latency/memory
numbers are desktop (§69), and OFF-18/19/20 remain device/browser-only gaps.

**Conditions to convert to GO (ordered):**
1. Run the low-end Android arms (latency, RAM under load, battery/thermal) per
   `memory-results.json`/`mobile-results.json` howToRun; utility score re-measured
   at weight 100.
2. Close OFF-18 (service worker) and OFF-19 (IndexedDB persistence) with a
   Playwright/DevTools device run; implement OFF-20 offline telemetry buffering (§52).
3. Ship conditional gating (§8) behind a flag as `PILOT`, re-screen after device run.
4. Keep external arms skipped until their commands are executed — promotion requires
   measured arms, not intent.

**Automatic NO-GO triggers:** any frozen safety invariant fails; any fabricated
answer with network off; any measured arm dropping below its BEFORE anchor without
an acknowledged case-set change; a device run contradicting an offline claim.
