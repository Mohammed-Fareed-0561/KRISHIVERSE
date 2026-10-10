# Small-Model Evaluation (Cactus runtime / Qwen WebLLM / OpenAI-compatible local)

Status: **NOT YET RUN — all small-LLM arms skipped.** No quality or latency number for
any small LLM is claimed in this study.

## Candidate registry (A–P taxonomy, spec §3)

| Candidate | Serving path | Benchmark arm | State |
| --- | --- | --- | --- |
| Needle 3 (Cactus) | native runtime (see `needle-evaluation.md`) | H, I, J, K (+`K-needle-clarify`), L, M | skipped |
| Qwen WebLLM family | in-browser WebGPU | N `N-best-webllm` | skipped (WebGPU not available in the node harness) |
| Any OpenAI-compatible local server (llama.cpp, cactus serve, …) | `KV_BENCH_LLM_URL` | O `O-best-small-llm` | skipped (no endpoint) |
| Combined best (rules + Needle + KB/RAG + small LLM) | composite | P `P-best-mobile-offline` | not-applicable (assigned by `buildComparison` until N/O measured) |

## Exact re-run commands

```bash
# O — local OpenAI-compatible endpoint (also feeds P once Needle arms exist)
cactus serve <model> --host 127.0.0.1 --port 8080 --no-cloud-handoff
KV_BENCH_LLM_URL=http://127.0.0.1:8080/v1 npm run eval:mobile-ai

# N — WebLLM from the PWA (browser-only, not executable from the node harness)
# open the PWA in a WebGPU browser with VITE_ENABLE_ONDEVICE_LLM=auto
# or serve the model via an OpenAI-compatible endpoint and set KV_BENCH_LLM_URL
```

`--no-cloud-handoff` is mandatory: a "local" arm that can silently delegate to a cloud
endpoint would invalidate the offline claims of this study.

## Candidate catalog (sizes/licenses from public sources — never measured here)

`results/model-results.json` → `modelCatalog.smallLlmCandidates` records the six
surveyed candidates with their public sizes/licenses, plus the on-device WebGPU tiers
(`0.5b / 1.5b / 3b`). The catalog is **reference data, not a measurement** — measured
metrics only ever come from running arms (currently: none).

## Safety envelope for any future measured arm

Whatever small model is measured later, its answers still route through:

1. `ResponseValidator` — unsourced dosage / cure-guarantee blocking (production gate),
   cross-checked 4/4 in `results/grounding-guard.json`;
2. the frozen safety invariants + rice safety screen (19/19 in
   `results/safety-results.json`);
3. the `AgriculturalGroundingGuard` prototype — claim→evidence grounding
   (`docs/ai/grounding-guard.md`);
4. the deterministic image-quality gate for any uploaded photo.

A small LLM is a *generator*, never an authority: evidence comes from the KB, safety
comes from the shared gates. The benchmark adapter (`adapters/smallLlm.js`) records
the same screening columns as the rule arms so results are directly comparable.

## Decision today

`NEEDS MORE DATA`. Evidence: `eval/mobile-ai/results/arm-results.json`
(arms N/O skipped with the reasons above; P `not-applicable`).
