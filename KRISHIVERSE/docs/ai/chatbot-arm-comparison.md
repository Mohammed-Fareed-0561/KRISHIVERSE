# Chatbot Arm Comparison (A–P, spec §3)

Machine-readable source: `eval/mobile-ai/results/arm-results.json` (§54 name; source
`chatbot-arms.json`), rendered in Admin → Analysis → AI benchmarks. Screening set =
`synthetic-screening` — **screening pass rates, never accuracy**.

## Taxonomy

- **A–G**: local/rule arms (the current architecture and its subset stacks).
- **G-laya-live**: sub-arm of G (requires `KV_BENCH_API`).
- **H–M**: Needle 3 family (experimental sub-arm `K-needle-clarify`).
- **N**: best-measured + Qwen/WebLLM (WebGPU). **O**: best-measured + smallest local
  LLM (`KV_BENCH_LLM_URL`). **P**: best mobile/offline architecture — assigned by
  `buildComparison` once A–O produce results.

## Measured arms (verification run 2026-10-08)

Pass rates are deterministic (seed `20261008`); latencies are **desktop wall-clock
snapshots of that run** and drift with machine load (±2× observed) — read your own
run's file.

| Arm | Configuration | n | Pass | EN | TA | TG | Latency desktop (snapshot) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A `A-baseline` | production snapshot: rules + AgriculturalNLP + lexical KB + local decision | 95 | **1.000** | 1.000 | 1.000 | 1.000 | avg 13.04 ms, p95 94.51 ms |
| B `B-nlp` | AgriculturalNLP parse only (no retrieval, no decision) | 57 | 1.000 | 1.000 | 1.000 | 1.000 | avg 3.76 ms, p95 12.51 ms |
| C `C-nlp-kb` | NLP + production lexical fastSearch | 86 | 1.000 | 1.000 | 1.000 | 1.000 | avg 4.39 ms, p95 14.21 ms |
| D `D-nlp-rag` | NLP + alias-expanded RRF hybrid retrieval | 86 | 1.000 | 1.000 | 1.000 | 1.000 | avg 5.08 ms, p95 17.83 ms |
| E `E-nlp-kb-rag` | NLP + fused KB+RAG (RRF of lexical + hybrid lists) | 86 | **1.000** | 1.000 | 1.000 | 1.000 | avg 5.55 ms, p95 17.70 ms |
| F `F-nlp-kb-decision` | NLP + KB + decision composition (≡ A: baseline already ships this stack) | 95 | 1.000 | 1.000 | 1.000 | 1.000 | avg 5.30 ms, p95 15.74 ms |
| G `G-f-laya` | F-stack with Laya integration point; local fallback active | 95 | 1.000 | 1.000 | 1.000 | 1.000 | avg 4.95 ms, p95 16.32 ms |

Per-language totals across arms: **EN 317/317, TA 126/126, Tanglish 157/157 = 1.000**.

## BEFORE → AFTER

| Anchor | BEFORE | AFTER | Delta |
| --- | --- | --- | --- |
| A-baseline | 0.660 | 1.000 | **+0.340** |
| E-nlp-kb-rag | 0.721 | 1.000 | **+0.279** |
| Decision engine | 0.875 (8 cases) | 1.000 (8 cases) | +0.125 |
| ResponseValidator cross-check | 3/4 | **4/4** | +1 case (dose-arity fix) |
| Safety (frozen + rice screen) | advisory gap open | **19/19**, critical failure `false` | gap closed |

BEFORE anchors live in `results/mobile-utility-score.json` → `before` and in the
decision-matrix cells (`BEFORE … DELTA …`).

## Skipped / not-applicable arms (never scored)

| Arm(s) | State | Reason | Re-run |
| --- | --- | --- | --- |
| G-laya-live, decision `laya-live`/`needle+laya` | skipped | requires Laya deployment | `KV_BENCH_API=<origin>` |
| H, I, J, K (+`K-needle-clarify`), L, M | skipped | `cactus-needle` not installed | `pip install cactus-needle`, `KV_BENCH_NEEDLE=1` |
| N `N-best-webllm` | skipped | WebGPU browser-only | PWA + `VITE_ENABLE_ONDEVICE_LLM=auto` |
| O `O-best-small-llm` | skipped | no OpenAI-compatible endpoint | `KV_BENCH_LLM_URL=…` |
| P `P-best-mobile-offline` | not-applicable | assigned by buildComparison after A–O | — |

## Reading rules

- Latency values are desktop node wall-clock and **drift with machine load** — always
  read them from the result file of the current run (this prose is a snapshot).
- Pass rates are deterministic given seed `20261008` and the frozen case sets.
- External arms (`external: true`) are recorded as measured only when their state is
  `"measured"` with a build; skipped arms carry `skipReason` + `howToRun` and never
  enter `comparison.json` scores.
