# Needle 3 (Cactus) Evaluation — Status: NOT YET RUN

Needle 3 is the smallest credible on-device LLM candidate for clarify/extract tasks.
All Needle arms in this benchmark are **skipped with exact re-run commands** — no
Needle number is claimed anywhere in this study.

## Research findings (engineering constraints for any future pilot)

- License: **Apache-2.0**; install via `pip install cactus-needle`.
- Weights: Hugging Face `Cactus-Compute/needle3`, ~8–29 MB depending on quantization.
- Runtime: **no JS/WASM binding exists** — native Swift/Kotlin/Flutter/RN/Python/Rust
  only. A KrishiVerse mobile pilot must go through the React Native/Python bridge or
  a native sidecar; the web PWA cannot run it in-process today.
- **Telemetry is ON by default.** Any local run must force
  `NEEDLE_TELEMETRY=0 DO_NOT_TRACK=1`. The benchmark adapter (`adapters/needle.js`)
  injects both into the child process environment automatically; manual runs must set
  them too.
- Cloud handoff must be **disabled** in serving mode
  (`cactus serve ... --no-cloud-handoff`) so a "local" arm never silently phones home.
- Only benchmark case text is ever passed to the runner — never farmer data, never
  chat history.

## Benchmark arms (all skipped in this environment)

A–P taxonomy (spec §3): Needle occupies the **H–M** family (sub-arms
`G-laya-live` and `K-needle-clarify` are separate row ids in their suites).

| Arm | State | Reason | How to run |
| --- | --- | --- | --- |
| H `H-nlp-needle` | skipped | `cactus-needle` not installed | `pip install cactus-needle`, set `KV_BENCH_NEEDLE=1` + `NEEDLE_MODEL_PATH=<path/needle3.cact>`, then `npm run eval:mobile-ai` |
| I `I-h-kb` (H + KB) | skipped | requires arm H | same |
| J `J-i-rag` (I + RAG) | skipped | requires arm H | same |
| K `K-h-kb-decision` (+ sub-arm `K-needle-clarify`) | skipped | requires arm H | same; clarification sub-arm also runs under `decision-benchmark` (`needle-clarify` row) |
| L `L-k-rag` | skipped | requires arm H | same |
| M `M-l-laya` (Needle + Laya) | skipped | requires arm H + `KV_BENCH_API` | same |
| cactus-needle (generic registry row) | skipped | not installed | as above |

Download weights first: `huggingface.co/Cactus-Compute/needle3`, then set
`KV_BENCH_NEEDLE_MODEL=<path/needle3.cact>`.

## What the adapter measures (once enabled)

`adapters/needle.js` + `adapters/needleRunner.py` run the same curated chatbot and
clarification cases through the model and report the same screening pass-rate columns
as the rule arms (`en`/`ta`/`tanglish`), plus wall-clock per-call latency on the host.
Results land in `eval/mobile-ai/results/arm-results.json` (source:
`chatbot-arms.json`) and `decision-results.json` (source: `decision-benchmark.json`)
under arms H–M and `needle-clarify` — and only then do they enter
`comparison.json` and the decision matrix. Skipped arms stay `state: "skipped"`
with `skipReason` + `howToRun`; they never enter any score.

## Decision today

`NEEDS MORE DATA` (see `docs/ai/model-selection.md`). Evidence:
`eval/mobile-ai/results/arm-results.json` (arms H–M skipped with reasons above).
