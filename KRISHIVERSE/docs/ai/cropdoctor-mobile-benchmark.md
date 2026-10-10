# Crop Doctor Mobile Benchmark (recorded hold-out — NOT field accuracy)

Source: `eval/mobile-ai/benchmarks/cropdoctor.benchmark.test.js`
Results: `eval/mobile-ai/results/cropdoctor-benchmark.json`
Recorded predictions: `models/onnx_eval_results.json` (mirrored at
`backend/eval/models/onnx_eval_results.json` — hashes asserted equal by the benchmark)

## What was measured (from the recorded 2026-08-27 ONNX run)

| Metric | Value |
| --- | --- |
| Top-1 accuracy | **0.95** (114/120) |
| Wilson 95% CI | **[0.895, 0.977]** |
| Macro F1 | **0.9505** |
| Per-class precision/recall/F1 + 6×6 confusion | in the result file |
| Model size | 32.1 MB (16.05 MB `.onnx` + 16.06 MB `.onnx.data`) + 40.4 MB WASM runtime |
| ONNX SHA-256 | `fab0a1dbf5a5fb582ddef6d941ab0ed8b3f5a6666d088c44022f4429af857e0f` |
| Text/rule path latency (node) | avg 0.63 ms, max 1.8 ms (deterministic matcher, not ONNX) |

Dataset: **120-image PlantVillage hold-out, 6 classes × 20** (Tomato/Potato/Pepper) —
`origin: plantvillage-eval (public benchmark)`. Performance on PlantVillage ≠ field
accuracy; the result file says so in its title and limitations.

## The rice gap (the point of this benchmark)

- The production model has **no rice classes** — zero rice accuracy can be claimed.
- The production crop gate already abstains (`UNKNOWN_CROP`) for uncovered crops;
  asserted in `KRISHIVERSE/test/diagnose.offline.edgecases.test.js`.
- Rice therefore requires a **new trained model** (Rice Phase 2 dataset). Strategy
  recorded in the result file: crop router → per-crop models; storage formula
  `n_crops × modelBytes` (load-time/RAM not measured here).

## Not measured — with exact re-run commands

| Metric | Why | Re-run |
| --- | --- | --- |
| Top-3 accuracy | recorded rows store top-1 only | re-export with top-k probabilities: `python backend/eval/export_and_eval.py` (add top-k dump), then re-run the benchmark |
| Calibration / ECE | no probability outputs recorded | same re-run; add per-class probability columns |
| Quantized (INT8) variant | export pipeline not executed here | re-export from checkpoint + dynamic quantize, then re-run |
| MobileNet-family / other lightweight candidates | no rice-capable checkpoint committed | train on the agreed rice dataset (Phase 2), export ONNX, add rows |
| ONNX WASM latency on device | browser/device-only | see `docs/ai/rice-ai-baseline.md` mobile section |

## Decision today

**REJECT for rice** (the benchmark's actual question): the current 6-class model is a
good PlantVillage performer but cannot serve the rice use case. It stays in production
for its existing crops — this decision is about the Rice mobile benchmark only.

Evidence: `eval/mobile-ai/results/cropdoctor-benchmark.json`.
