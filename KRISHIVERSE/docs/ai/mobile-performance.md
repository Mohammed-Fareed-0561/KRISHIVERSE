# Mobile Performance — Latency, Memory, Size, Utility Score

> **Spec §69:** every timing/number here is a **desktop node reference** measured on
> the benchmark host. No low-end-Android number exists in this study, therefore no
> mobile-readiness claim is made. Machine-readable sources:
> `results/mobile-results.json`, `results/latency-results.json`,
> `results/memory-results.json`, `results/mobile-utility-score.json`.

## 1. Latency (desktop node, verification-run snapshot 2026-10-08 23:23)

Values below are the snapshot of the final verification run — **wall-clock drifts
with machine load (±2× observed between runs); always read the result file of your
own run.**

| Path | avg | p95 | n |
| --- | --- | --- | --- |
| KB index build | 8.4 ms | — | 1 |
| Chatbot simple query | 6.61 ms | 13.90 ms | 50 |
| Chatbot complex query | 10.27 ms | 23.98 ms | 50 |
| A-baseline (arm A) | 13.04 ms | 94.51 ms | 36 |
| E-nlp-kb-rag (arm E) | 5.55 ms | 17.70 ms | 36 |
| lexical fastSearch | 3.62 ms | 9.22 ms | 50 |
| hybrid RRF | 5.81 ms | 11.33 ms | 50 |
| conditional retrieval (§8) | 8.62 ms | — | 42 |
| ALWAYS retrieval | 15.71 ms | — | 42 |
| connectivity probe | 707 ms | — | 7 scenarios |
| local path offline (OFF-10) | 23.99 ms | 145.32 ms | 19 |

\* arm-level latency n and full precision live in `arm-results.json` /
`latency-results.json`. No device latency was measured — `low-end-android` /
`mid-range-android` / `battery-thermal` arms are `skipped` with `skipReason` +
`howToRun`.

## 2. Memory

| Dimension | Value | State |
| --- | --- | --- |
| KB index build heap delta | +1.71 MB (node v8 heap) | measured (desktop) |
| Device RAM under chatbot load | — | **NOT MEASURED** — howToRun in `memory-results.json` (chrome://inspect / Perfetto) |

## 3. Storage / size

| Asset | Bytes |
| --- | --- |
| ONNX model (`.onnx` + `.onnx.data`) | 32.1 MB |
| ONNX WASM runtime | 40.4 MB |
| KB v2 JSON (6 files) | 11.0 MB |
| dist bundle (desktop build) | 95.9 MB |
| Installed app bundle on device | **NOT MEASURED** (excluded from utility score) |

## 4. Mobile Utility Score (spec §41)

Weights: quality 30 · safety 20 · grounding 15 · offline 15 · latency 10 ·
memory 5 · size 5. **Measured weight = 90** (memory + size are device-only and
excluded, then weights re-normalized). Latency fraction = `1 − avg/100` with a
100 ms budget (desktop reference). The latency dimension is load-sensitive (±0.5
total points between runs) — pass-rate dimensions are deterministic.

| Architecture | Score (verification run) | Verdict |
| --- | --- | --- |
| A `A-baseline` | **98.6** | GO-capable dimension profile |
| E `E-nlp-kb-rag` | **99.4** | GO-capable dimension profile |
| BEFORE (Phase-2 anchor) | 82.4 | — |
| Delta | **+16.2 / +17.0** | |

BEFORE anchors: quality 0.660, safety 0.75, grounding 1.0, offline 1.0,
latencyAvg 6.65 ms. Critical-safety rule: safety fraction < 1 ⇒ score verdict
`REJECT` (not triggered — safety 19/19).

## 5. NOT MEASURED register (device work)

1. Low-end Android end-to-end latency (arm `low-end-android`).
2. Device RAM under load (`memory-results.json` → `device-memory-under-load`).
3. Battery/thermal behaviour.
4. Installed bundle size on device.
5. OFF-18 service worker / OFF-19 IndexedDB persistence / OFF-20 telemetry queue.

Until 1–4 run on hardware, the verdict is **CONDITIONAL GO** — see
`docs/ai/final-rice-mobile-ai-benchmark-report.md` §63–65.
