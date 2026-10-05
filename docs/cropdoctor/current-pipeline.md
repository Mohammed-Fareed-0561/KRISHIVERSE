# Crop Doctor — Current Pipeline (Phase 3A)

## Paths (production)

```
DiagnosePage (/diagnose, the only routed UI)
 ├─ validateImageFile → IMAGE_UNUSABLE message (missing/empty/non-image/>15MB)
 ├─ 1) onDeviceClassifier.diagnoseFromFile (ONNX EfficientNet-B0, 6 classes)
 │     → result.state ∈ {KNOWN, POSSIBLE, INSUFFICIENT_EVIDENCE, HEALTHY}
 ├─ 2) Gemini vision (online only) → cloud result (unverified: false)
 └─ 3) buildOfflineDiagnosis → NO_RESULT honest fallback (generic guidance,
      explicit "Do NOT apply pesticides", unverified: true)
```

Legacy/unwired (kept, never called by UI): `tfjsDiseaseService` (deprecated
stub, deterministic index 0), `advancedDiseaseDetection` (heuristic CV
ensemble, no callers), `DiseaseDetectionOffline` (4-record text matcher),
`offlineChatbot` keyword fallback (chat offline path only). Deleted 2026-10:
`components/Working/*` + `components/Diagnosis/*` (10 unreferenced demo pages,
incl. random-diagnosis mocks — verified zero importers before removal).

Image mapping: `enhancedOfflineDiseaseService.detectDisease(img, lang,
{cropHint})` — rule-based visual analysis (deterministic since Phase 2/3A),
states POSSIBLE/HEALTHY/UNKNOWN_CROP/IMAGE_UNUSABLE. Text matching:
`ComprehensiveDiseaseDetector.detect(desc, crop)` — explicit unknown crop
abstains (`[]`); empty hint still searches by symptoms (retrieval, documented).

## Mappings

- ONNX classes (`labels.json`, `CLASS_META`): Tomato Early/Late blight (+KB
  `tomato_early/late_blight`), Tomato healthy, Potato Early/Late blight
  (no KB `diseaseId` → generic guidance), Pepper Bacterial spot (crop mapped
  to chili, no `diseaseId` → generic guidance).
- Crop coverage: image path identifies tomato/potato/pepper ONLY. Rice,
  chilli, banana etc. have no image classes — photo diagnosis for them is
  unsupported by design (chat + DiagnosePage wording must not imply otherwise).
- Preprocessing (browser `Resize256→CenterCrop224→/255→ImageNet norm`,
  bilinear) matches training (`export_and_eval.py` torchvision Resize256/
  CenterCrop224, BILINEAR default) — verified by exact reproduction (§7).

## Confidence audit — calibration NOT ESTABLISHED

- ONNX: `confidence = round(topSoftmax × 100)`. Raw softmax, uncalibrated.
  Gate `KNOWN_MIN_TOP_PROBABILITY = 0.6` is a heuristic, NOT a calibrated
  cutoff: ≥0.6 + KB backing → KNOWN_DIAGNOSIS; ≥0.6 without backing →
  POSSIBLE_DIAGNOSIS; <0.6 → INSUFFICIENT_EVIDENCE (never presented as a
  finding). Do not quote these as probabilities.
- Heuristic path: rule confidences 0.6–0.95 (`VISUAL_ANALYSIS_RULES`,
  detector `score/√matches` capped 95%, `min(0.97, 0.68+score×0.1)` in chat)
  are hand-set weights, uncalibrated. States cap their meaning: heuristic
  outcomes are at most POSSIBLE_DIAGNOSIS.
- Fallback: hardcoded 0.88/0.82/0.8/0.75/0.3 etc. in chat builders —
  uncalibrated constants, unchanged (out of scope).
- Safety layering (unchanged): `sanitizeTreatmentList` (verified flag+source+
  sourceUrl required) + `ResponseValidator` on chat answers. Chemical dosages
  cannot reach UI without provenance.

## ONNX 95% vs 86.7% — resolved

- Files: shipped `public/models/efficientnet_b0_plantvillage.onnx`
  sha256 `FAB0A1DB…AF857E0F` (16.05MB + 16.06MB `.data`) is byte-identical to
  `backend/eval/models/*.onnx`. Class order, `labels.json` (mean/std 224),
  preprocessing match the trainer.
- `models/onnx_eval_results.json` + `backend/eval/models/onnx_eval_results.json`:
  2026-08-27, **114/120 = 95%**, Wilson [0.895, 0.977].
- `public/models/onnx_eval_results.json`: 2026-08-19, **26/30 = 86.7%** —
  STALE snapshot from superseded v1 weights (files no longer present;
  `train_log*.txt` indicate a retrain between the runs). **Archived
  2026-10-01 to `backend/eval/onnx_eval_results_2026-08-19_v1-weights_HISTORICAL.json`**
  (no code referenced it; SW precache glob no longer ships it).
- The 30 are a subset of the 120 (img1–5/class). On overlap, v1 agreed 28/30
  and flipped 2 → the delta is weight-version + sample-size difference.
- Reproducibility (2026-10-01, read-only probe, onnxruntime 1.23.2 CPU):
  current weights re-evaluated on all 120 → **114/120, per-class identical,
  120/120 prediction agreement**, ~28ms/image. The 95% reproduces exactly;
  the 86.7% is NOT reproducible (v1 weights gone) and must not be quoted.
- Neither figure is field performance: PlantVillage lab photos ≠ field
  conditions. Never claim 95% as production accuracy.

## Known limitations (not fixed in 3A)

- Tomato-default heuristic in the rule-based fallback (`generateFallbackResult`
  assumes tomato); cropHint gates only explicit hints.
- `isDiseaseSymptomQuery` still raw-substring (routing only; intent layer is
  boundary-aware since Phase 2).
- Demo-component deletion is unreferenced-code removal, no behavior change.
