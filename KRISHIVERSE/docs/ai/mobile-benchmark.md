# Rice AI Mobile Benchmark — Harness Overview

> Status: benchmark-only, report-only. Nothing in this directory is imported by the
> farmer runtime. Production AI (aiRouter, ResponseValidator, AgriculturalNLP ranking,
> Laya, Crop Doctor, auth, Admin RBAC) is unchanged by this study.

## What this is

An isolated evaluation harness under `KRISHIVERSE/eval/mobile-ai/` that measures the
current Rice text pipeline and a set of candidate additions on curated screening sets,
then publishes:

- `eval/mobile-ai/results/*.json` — validated benchmark result files
- `eval/mobile-ai/results/comparison.json` — cross-benchmark comparison
- `eval/mobile-ai/results/decision-matrix.json` — §23 decision rows (ADOPT / PILOT /
  KEEP AS FALLBACK / REJECT / NEEDS MORE DATA)
- `eval/mobile-ai/results/mobile-utility-score.json` — §41 Mobile Utility Score
- the **13 §54 required result files** (see below)
- `docs/ai/manifest.json` — sha256 checksums of results + docs (reproducibility)

## Running

```bash
cd KRISHIVERSE
npm run eval:mobile-ai
# = vitest run eval/mobile-ai && node eval/mobile-ai/buildRequiredResults.mjs
```

`buildRequiredResults.mjs` calls `buildComparison.mjs` first (comparison, decision
matrix, utility score), then derives the §54 spec-named files from measured data
(every derived file carries a `derivedFrom` citation), then regenerates the manifest.

Benchmarks are report-only: a failing arm is a finding, recorded in the result file —
with two deliberate exceptions that are hard assertions:

1. ResponseValidator hard safety invariants (unsourced dosage must block) and the
   frozen 15-invariant safety suite (`safety.benchmark.test.js`).
2. The grounding guard must stay deterministic and network-free (asserted in test).

## §54 required result files (13)

| Spec file | Produced by |
| --- | --- |
| `comparison.json` | buildComparison (direct) |
| `decision-matrix.json` | buildComparison (direct) |
| `safety-results.json` | `safety.benchmark.test.js` (direct) |
| `mobile-results.json` | derived ← mobile-resources + mobile-utility-score |
| `offline-results.json` | derived ← offline-benchmark |
| `grounding-results.json` | derived ← grounding-guard |
| `retrieval-results.json` | merged ← rag-benchmark + rag-conditional |
| `decision-results.json` | derived ← decision-benchmark |
| `latency-results.json` | merged (desktop-reference latencies only) |
| `memory-results.json` | measured heap delta + skipped device rows |
| `model-results.json` | merged ← cropdoctor + chatbot skips + small-LLM catalog |
| `ablation-results.json` | derived ← ablation |
| `arm-results.json` | derived ← chatbot-arms |

## Layout

| Path | Purpose |
| --- | --- |
| `schemas.js` | result/matrix schemas; `dataClass` must be `benchmark-evaluation` |
| `runMeta.js` | reproducibility block: git SHA, dataset/model hashes, runtime, device, seed `20261008` |
| `scoring.js` | shared pass-rate / recall helpers |
| `datasets/riceChatbotCases.js` | 36 EN/TA/Tanglish rice cases + 4 safety cases |
| `datasets/groundingCases.js` | 16 grounding/hallucination cases |
| `datasets/imageQualityCases.js` | 8 procedural synthetic images (seeded mulberry32) |
| `grounding/AgriculturalGroundingGuard.js` | deterministic claim→evidence guard (prototype) |
| `imagequality/imageQualityGuard.js` | deterministic image accept/reject gate |
| `adapters/` | AgriculturalNLP, KB RAG (+fused), decisions, Needle runner, small-LLM client, langId |
| `adapters/registry.js` | arm registry **A–P** + sub-arms (`G-laya-live`, `K-needle-clarify`) |
| `benchmarks/*.test.js` | the eleven benchmark suites |
| `buildComparison.mjs` | comparison + decision matrix + utility score + manifest builder |
| `buildRequiredResults.mjs` | §54 13-file generator (calls buildComparison first) |

## Benchmarks (arms, headline results — screening, NOT accuracy)

| Suite | Headline (this run) | File |
| --- | --- | --- |
| chatbot | A–G all **1.000** (A 95, B 57, C/D/E 86, F/G 95); lang EN/TA/TG 1.000; H–M/N/O skipped, P n/a | `chatbot-arms.json` |
| conditionalrag (§8) | ALWAYS 42 vs conditional 36 retrieval calls (−14.3%), parity 6/6, probes 6/6 | `rag-conditional.json` |
| ablation (§40) | baseline 1.000 (101); every removal degrades (−0.059 … −0.554) | `ablation.json` |
| safety | frozen 15/15 + rice 4/4 = **19/19**, critical failure `false` | `safety-results.json` |
| rag | Recall@3 1.000, MRR 0.843 (existing = hybrid) | `rag-benchmark.json` |
| decision | existing local engine **1.000 (8)**; safety invariant blocked | `decision-benchmark.json` |
| grounding | guard 16/16; ResponseValidator cross-check **4/4** (BEFORE 3/4) | `grounding-guard.json` |
| cropdoctor | top-1 0.95, macro F1 0.9505, Wilson [0.895, 0.977] (no rice classes) | `cropdoctor-benchmark.json` |
| imagequality | 8/8 verdicts, detection 1.00, false-block 0.00 | `image-quality.json` |
| offline (§20) | OFF-01..20: **17/17 measured pass**, 3 device rows skipped; 7/7 probe; 19/19 + 36/36 zero-network | `offline-benchmark.json` |
| mobile | desktop reference only (index 8.4 ms, +1.71 MB heap); device arms skipped | `mobile-resources.json` |

Utility score (§41): A **98.6**, E **99.4** vs BEFORE 82.4 (±0.5 with machine load)
— `mobile-utility-score.json`.

## Honest reading rules

- Pass rates are **screening signals over curated cases**, never farmer-facing accuracy.
- PlantVillage numbers are a **public-benchmark hold-out**, not field accuracy.
- Device metrics are **desktop reference** unless an arm's state says a device ran
  (spec §69: no mobile-readiness claim from desktop numbers).
- Latency strings drift with machine load — read them from the result file of the
  current run, never from a prose copy.
- Unknown measurements are `null` or a `skipped` arm with `skipReason` + `howToRun` —
  never invented, never implied.

## External arms (opt-in, all skipped by default)

| Arm(s) | Enabler |
| --- | --- |
| Needle H–M / `needle-clarify` | install `cactus-needle`, set `NEEDLE_TELEMETRY=0 DO_NOT_TRACK=1` |
| Laya live (`G-laya-live`, `laya-live`) | `KV_BENCH_API=<backend origin>` (requires Laya deployment + network) |
| Small LLM O | `KV_BENCH_LLM_URL`, `KV_BENCH_API_KEY` |
| WebLLM N | WebGPU browser only (not executable from node) |
| Embedding retrieval | `KV_BENCH_RAG_URL` |

See `docs/ai/needle-evaluation.md`, `docs/ai/laya-evaluation.md`,
`docs/ai/small-model-evaluation.md` for exact commands.
