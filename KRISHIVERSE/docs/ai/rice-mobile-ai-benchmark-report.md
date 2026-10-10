# Rice Mobile AI Benchmark & Architecture Study — Final Report

> **SUPERSEDED** — this is the Phase-1/2 interim report. The current final report
> (40 sections, GO/NO-GO verdict, A–P arms, OFF-01..20 matrix, ablation §40,
> utility score §41) is `docs/ai/final-rice-mobile-ai-benchmark-report.md`.
> Numbers below (A 0.660, E 0.721, cross-check 3/4, 14-row matrix) are historical
> BEFORE/AFTER anchors only.

**Status:** benchmark-only, report-only. No production AI code changed
(aiRouter, ResponseValidator, AgriculturalNLP ranking, Laya, Crop Doctor, auth,
Admin RBAC untouched). No fabricated results, no deployments, no farmer-runtime
integration of experimental models. Every number below cites a result file.

Reproduce everything:

```bash
cd KRISHIVERSE && npm run eval:mobile-ai
```

## 1. Executive summary

- The **current offline pipeline is strong enough to adopt**: rule/KB arms match or
  beat every measured alternative on the available evidence, answer with **zero
  network** (19/19 local queries), and keep the safety invariants (2/2 hard blocks).
- **Best measured text arm:** AgriculturalNLP + KB RAG (arm E) at **0.721 screening
  pass rate** vs 0.660 baseline → `PILOT`.
- **Everything else is `NEEDS MORE DATA`, not rejected**: Needle 3, small LLMs, Laya
  live, hybrid retrieval, and device profiling all have skipped arms with exact
  re-run commands. No unmeasured candidate was promoted *or* condemned.
- **Rice image classification cannot ship on the current model**: PlantVillage
  top-1 0.95, macro F1 0.9505 — but **zero rice classes** → `REJECT` for rice,
  build in Phase 2.
- One **advisory safety finding** was discovered and is displayed, not hidden:
  `rice-en-wrongcrop-dose expected blocked got safe` (dose-number mismatch not
  caught by `ResponseValidator`).

## 2. What was built (all isolated, under `KRISHIVERSE/eval/mobile-ai/`)

- Validated result schemas (`benchmark-evaluation` dataClass, arm states, §23 matrix
  vocabulary, runMeta with git SHA/hashes/seed).
- Case datasets: rice chatbot (~37 + 4 safety, EN/TA/Tanglish), grounding (16),
  image quality (8 procedural, seeded).
- Deterministic components: **AgriculturalGroundingGuard** (claim→evidence,
  cross-lingual anchoring, dose contradiction) and **image-quality gate**
  (calibrated, 8/8 verdicts).
- Adapters: AgriculturalNLP, KB RAG (+hybrid RRF, external arms), decisions
  (local + Laya live), Needle runner (telemetry forced off), small-LLM client.
- Eight benchmark suites + `buildComparison.mjs` → comparison, decision matrix,
  docs manifest. One npm script: `eval:mobile-ai`.

## 3. Measured results (screening, NOT accuracy)

| Area | Result | File |
| --- | --- | --- |
| Chatbot arms | A 0.660 · B 0.684 · **E 0.721** · G 0.660 | `results/chatbot-arms.json` |
| Languages (aggregate) | EN 0.690 · TA 0.671 · Tanglish 0.667 | same |
| Retrieval | R@3 1.000, MRR 0.843 (existing = hybrid), 3.2 ms avg | `results/rag-benchmark.json` |
| Decisions | 0.875 (8); safety invariant blocked | `results/decision-benchmark.json` |
| Grounding guard | 16/16; validator cross-check 3/4 (1 advisory) | `results/grounding-guard.json` |
| Crop Doctor | top-1 0.95, macro F1 0.9505, Wilson [0.895, 0.977], **no rice** | `results/cropdoctor-benchmark.json` |
| Image quality | 8/8, detection 1.00, false-block 0.00 | `results/image-quality.json` |
| Offline | 7/7 probe scenarios; 19/19 local answers, zero network | `results/offline-benchmark.json` |
| Mobile | desktop reference only (index 13.2 ms, +1.7 MB); device arms skipped | `results/mobile-resources.json` |

## 4. Decision matrix (14 rows — full detail in `model-selection.md`)

- **ADOPT (5):** AgriculturalNLP+ResponseValidator pipeline, existing fastSearch
  retrieval, ResponseValidator, local decision engine, image-quality gate,
  connectivity/offline router.
- **PILOT (2):** arm E (agnlp+KB RAG), AgriculturalGroundingGuard (report-only).
- **REJECT (1):** Crop Doctor 6-class model *for rice*.
- **NEEDS MORE DATA (5):** hybrid RRF, Laya live, Needle 3, small LLM, device profile.

## 5. Findings worth acting on

1. **Dose-number gap (safety):** ResponseValidator backs a dose by record provenance
   and crop compatibility, not by number agreement — `2 g` vs evidence `1 g` returned
   `safe`. Hard invariants (fabricated/unsourced doses) still block 2/2. Production
   fix is out of this study's scope; tracked as advisory finding in the result file
   and Admin panel.
2. **Hybrid retrieval is not worth adopting on current evidence** — identical quality,
   ~1.8× slower.
3. **Tanglish aliases:** "nel" is not in `CROP_ALIASES` (only `nellu`/`நெல்`) —
   included as an adversarial case; contributes to Tanglish being the weakest
   language band (0.667).
4. **Laya fallback ≡ baseline:** with no Laya deployment the G arm reproduces arm A
   exactly — the fallback path is safe but adds nothing until live Laya is measured.
5. **Ganesh-style honesty:** desktop numbers are labelled desktop; PlantVillage is
   labelled public benchmark; unmeasured metrics carry `skipReason` + `howToRun`.

## 6. Admin integration

New read-only panel **Admin → Analysis → AI benchmarks** (`BenchmarkSection.jsx`,
`GET /api/admin/benchmarks`, RBAC `admin:read` unchanged):

- per-benchmark tabs with arms (measured/skipped + metrics + skip reasons),
  safety findings blocks, unmeasured-metric notes, limitations;
- decision matrix table with §23 badges and evidence citations;
- cross-benchmark comparison with SHA-256 per result file.

Tests: `backend/tests/admin.benchmarks.test.js` (5 tests: dashboard shape, matrix
vocabulary, single benchmark, 404, 401 unauthenticated).

## 7. Documentation set (`docs/ai/`)

`mobile-benchmark.md` (harness) · `rice-ai-baseline.md` (numbers) ·
`needle-evaluation.md` · `small-model-evaluation.md` · `laya-evaluation.md` ·
`grounding-guard.md` · `cropdoctor-mobile-benchmark.md` · `model-selection.md` ·
this report · `manifest.json` (sha256 of results + docs).

## 8. Recommended next steps (in order)

1. Fix the dose-number gap in `ResponseValidator` (production change; re-run the
   grounding benchmark to confirm 4/4).
2. Run arm E as a staged pilot behind the existing router; re-screen after adding
   Tanglish aliases (`nel`).
3. Measure the low-end Android arm (device + battery/thermal) — current mobile
   numbers are desktop reference only.
4. Only then decide on external arms (`KV_BENCH_API`, Needle install,
   `KV_BENCH_LLM_URL`) — commands are in the docs above.
5. Phase 2: rice image dataset → new model → re-run `cropdoctor.benchmark.test.js`
   with rice classes.
