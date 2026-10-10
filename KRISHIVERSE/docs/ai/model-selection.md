# Model Selection — Decision Matrix & Rules (§23 vocabulary)

Machine-readable source of truth: `eval/mobile-ai/results/decision-matrix.json`
(rebuilt by `npm run eval:mobile-ai`, validated against `eval/mobile-ai/schemas.js`,
rendered in Admin → Analysis → AI benchmarks; §54 copy: `results/decision-matrix.json`).

Vocabulary: `ADOPT | PILOT | KEEP AS FALLBACK | REJECT | NEEDS MORE DATA`.
Cells are `null` when never measured — null means *not measured*, never *bad*.

## Current matrix (15 rows, evidence-cited)

| Technology | Role | Recommendation | Evidence |
| --- | --- | --- | --- |
| AgriculturalNLP + ResponseValidator pipeline | primary offline text engine | **ADOPT** | screening 1.000 (BEFORE 0.660); offline 19/19 zero-network; cross-check 4/4 |
| AgriculturalNLP + KB-RAG answer arm (E) | grounded answer candidate | **ADOPT** | screening 1.000 (86 cases; BEFORE 0.721) |
| KB retrieval — existing fastSearch | evidence retrieval | **ADOPT** | R@3 1.000, MRR 0.843, ~4 ms desktop (this run) |
| Hybrid alias-RRF fusion | retrieval fusion candidate | **NEEDS MORE DATA** | Δ=0 quality, ~1.8× slower |
| Conditional retrieval gating (§8) | skip retrieval for intents that never read KB hits | **PILOT** | parity 6/6, −14.3% retrieval calls, avg 15.7→8.6 ms (snapshot) |
| AgriculturalGroundingGuard | report-only grounding check | **PILOT** | 16/16, network-free by construction |
| ResponseValidator | dosage/cure safety gate | **ADOPT** | invariants 15/15 + rice screen 4/4; cross-check 4/4 (BEFORE 3/4) |
| Local decision engine | clarification/candidate selection | **ADOPT** | 1.000 (8; BEFORE 0.875) + safety invariant blocked |
| Laya cloud decision engine | cloud fallback | **NEEDS MORE DATA** | live arm skipped (`KV_BENCH_API`) |
| Needle 3 (Cactus) | on-device LLM candidate | **NEEDS MORE DATA** | arms H–M skipped (not installed) |
| Small on-device LLM (Qwen WebLLM family) | answer-generation candidate | **NEEDS MORE DATA** | arms N/O skipped (no endpoint/WebGPU) |
| Crop Doctor ONNX 6-class | image classification for **rice** | **REJECT** (for rice) | top-1 0.95 but no rice classes |
| Deterministic image-quality gate | image accept/reject | **ADOPT** | 8/8, false-block 0 |
| Connectivity probe / offline router | online/offline routing | **ADOPT** | OFF-01..20: 17/17 measured; 19/19 + 36/36 offline |
| Low-end Android device profile | device-fit validation | **NEEDS MORE DATA** | desktop reference only (spec §69) |

Mobile Utility Score (§41): A **98.6**, E **99.4** vs BEFORE 82.4 — measured weight
90/100 (memory+size NOT MEASURED on device, excluded and re-normalized; ±0.5 with
machine load via the latency dimension).
Evidence: `results/mobile-utility-score.json`.

## Selection rules for Phase 2

1. **Grounding first.** Any generator (rule arm, cloud LLM, on-device LLM) answers
   *through* `ResponseValidator` + KB evidence; the generator never authors facts.
2. **Offline is the default.** Cloud arms (Laya) activate only when
   `probeConnectivity()` says online, and must degrade to the measured local path
   (19/19, zero network) — never block, never fabricate.
3. **No number without a result file.** Every matrix cell cites an evidence file or is
   null. A candidate cannot be promoted from `NEEDS MORE DATA` without its arms
   actually running (commands in `needle-evaluation.md`, `laya-evaluation.md`,
   `small-model-evaluation.md`).
4. **Device measurement gates mobile claims.** Desktop latency is a reference only;
   `PILOT`/`ADOPT` → mobile release requires the low-end Android arm to run
   (`mobile-resources.json` device arms) — spec §69.
5. **Rice image classification is a Phase-2 build**, not a tuning exercise: the current
   model is `REJECT`ed for rice regardless of its PlantVillage score.
6. **Safety findings block promotion.** The Phase-1 dose-number gap is **closed**
   (cross-check 4/4) and frozen as 15 invariants in `results/safety-results.json`;
   any future regression of those invariants is an automatic release blocker
   (critical safety failure ⇒ NO-GO).

## Promotion path (summary)

```
NEEDS MORE DATA --arms run--> PILOT --device + safety + field labels--> ADOPT
                            \-> REJECT when a hard constraint fails (e.g. rice coverage)
```
