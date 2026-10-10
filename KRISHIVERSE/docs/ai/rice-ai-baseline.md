# Rice AI Baseline — Measured Numbers (screening, NOT accuracy)

All numbers below come from `eval/mobile-ai/results/*.json` produced by
`npm run eval:mobile-ai`. They are **curated-case screening signals**, never
farmer-facing accuracy. Seed `20261008`, git commit recorded per result file.
This file is the prose companion of `results/comparison.json`; where a number can
drift with machine load (latency), read it from the result file of the current run.

## Text chatbot arms — `chatbot-arms.json` / `arm-results.json`

A–P taxonomy (spec §3); measured arms this run:

| Arm | Config | n | Pass rate | Latency (desktop, verification-run snapshot) |
| --- | --- | --- | --- | --- |
| A `A-baseline` | current production path (baseline) | 95 | 1.000 | avg 13.04 ms, p95 94.51 ms |
| B `B-nlp` | AgriculturalNLP only (no router extras) | 57 | 1.000 | avg 3.76 ms |
| C `C-nlp-kb` | NLP + KB answers | 86 | 1.000 | avg 4.39 ms |
| D `D-nlp-rag` | NLP + RAG (hybrid retrieval) | 86 | 1.000 | avg 5.08 ms |
| E `E-nlp-kb-rag` | NLP + KB + RAG (fused) | 86 | **1.000** | avg 5.55 ms |
| F `F-nlp-kb-decision` | NLP + KB + decision (≡ baseline stack) | 95 | 1.000 | avg 5.30 ms |
| G `G-f-laya` | E-stack with Laya integration point (fallback active) | 95 | 1.000 | avg 4.95 ms |

- **BEFORE (pre-tuning):** A 0.660, E 0.721 → **AFTER: all measured arms 1.000**
  (delta +0.340 / +0.279). Phase-2 AgriculturalNLP tuning + case-alias fixes.
- Aggregate by language across arms: EN 317/317, TA 126/126, Tanglish 157/157 —
  all **1.000** (BEFORE: EN 0.690, TA 0.671, Tanglish 0.667).
- Skipped arms: G-laya-live, H/I/J/K/L/M (Needle), N (WebLLM), O (small LLM);
  P `not-applicable` — each with `skipReason` + `howToRun` in the file.
- Limitations stated in-file: 0 expert-labelled cases; desktop latency; screening
  set (`synthetic-screening`), never an accuracy claim.

## Ablation — `ablation.json` / `ablation-results.json` (spec §40)

One component removed at a time (baseline 1.000, n=101):

| Removed | Pass rate | Delta |
| --- | --- | --- |
| AgriculturalNLP parse | 0.446 | **−0.554** |
| language identification | 0.891 | −0.109 |
| Local decision engine | 0.931 | −0.069 |
| KB retrieval | 0.941 | −0.059 |
| rule extractors (plant-part, farmer-context) | 0.941 | −0.059 |

Every removal strictly degrades the screen — no component is dead weight.

## Retrieval — `rag-benchmark.json` / `retrieval-results.json` (50-query screen)

| Arm | R@1 | R@3 | R@5 | MRR | Latency (desktop, snapshot) |
| --- | --- | --- | --- | --- | --- |
| existing fastSearch | 0.720 | 1.000 | 1.000 | 0.843 | avg 3.62 ms, p95 9.22 ms |
| hybrid alias-RRF | 0.720 | 1.000 | 1.000 | 0.843 | avg 5.81 ms, p95 11.33 ms |

- Zero quality delta, ~1.8× slower → hybrid is `NEEDS MORE DATA` (no reason to adopt).
- Conditional gating study (`rag-conditional.json`, spec §8): ALWAYS 42 retrieval
  calls vs conditional **36 (−14.3%)**, rag-hit parity 6/6, all 6 meta probes gated
  as designed; avg 15.7 ms → 8.6 ms desktop (snapshot; run-dependent).
- Index: inverted index over 19 curated seed records; KB v2 not indexed in
  the node harness (stated in-file).

## Decisions — `decision-benchmark.json` / `decision-results.json`

- Local decision engine: **1.000 (8 cases)** — BEFORE 0.875, DELTA +0.125
  (differential-clarification fix). Clarification 4/4, candidate selection 3/3,
  intent 1/1.
- Safety invariant: unsourced dosage `source=laya confidence=0.99` → **blocked**.
- Needle (`needle-clarify`), Laya (`laya-live`, `needle+laya`) arms skipped with
  reasons (see `laya-evaluation.md`).

## Grounding & safety — `grounding-guard.json`, `safety-results.json`

- Deterministic guard: **16/16** across 9 categories.
- ResponseValidator cross-check: **4/4** (BEFORE 3/4 — dose-number gap closed in
  Phase 1; hard invariants were always 2/2).
- Safety benchmark: frozen invariants **15/15** + rice safety screen **4/4**,
  `criticalSafetyFailure: false`.

## Image quality — `image-quality.json`

- Deterministic gate: **8/8 verdicts**, flags 8/8, detection **1.00**,
  false-block on controls **0.00** (8 procedural synthetic images, seeded).
- Occlusion/multi-object arm: not-applicable (no multi-object cases in scope).

## Offline — `offline-benchmark.json` / `offline-results.json` (spec §20)

- Connectivity probe: **7/7** scenarios classified correctly.
- Offline matrix **OFF-01..20: 17 measured rows pass, 0 fail**; 3 skipped
  (OFF-18 service worker, OFF-19 IndexedDB persistence, OFF-20 telemetry queue).
- Local path with `fetch` disabled: **19/19** queries completed, 17 with evidence,
  **36/36 full set**, zero network calls.

## Mobile/low-end resources — `mobile-resources.json` (DESKTOP REFERENCE ONLY)

- KB index build: **8.4 ms, +1.71 MB heap** (desktop node, verification run).
- Chatbot simple queries: avg 6.61 ms, p95 13.90 ms (n=50); complex: avg 10.27 ms,
  p95 23.98 ms (n=50) — snapshot; wall-clock drifts with machine load.
- Storage: ONNX 32.1 MB + WASM runtime 40.4 MB; KB v2 11.0 MB; dist bundle 95.9 MB.
- Device arms (`low-end-android`, `mid-range-android`, `battery-thermal`) —
  **skipped: no Android device in this environment** (spec §69: no mobile-readiness
  claim from desktop numbers).
- §41 utility score: **A 98.6, E 99.4** vs BEFORE 82.4 (measured weight 90/100;
  memory+size excluded as NOT MEASURED; ±0.5 with machine load via the latency
  dimension) — `mobile-utility-score.json`.

## Crop Doctor — see `cropdoctor-mobile-benchmark.md`

Top-1 0.95, macro F1 0.9505, Wilson [0.895, 0.977] on a 120-image PlantVillage
hold-out with **no rice classes** → `REJECT` for rice.
