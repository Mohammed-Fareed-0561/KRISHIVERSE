# Expert Dataset Plan (Phase 3C — plan only, no labels created)

Ground-truth tiers (see `docs/cropdoctor/dataset-spec.md` for the image
schema): `expert-labelled` is the ONLY ground truth; `plantvillage-eval`
(research hold-out), `synthetic-screening`, and `unlabelled` are never
reported as accuracy.

## Datasets to commission

1. **Chatbot intent/slot set** (~300 EN/TA/Tanglish/HI queries): intent,
   crop, symptom slots; hard cases prioritized (help vs scheme, Tamil/Hindi
   intent, substring traps like कितना, what-is variants).
2. **Symptom→disease text set** (~200 descriptions): crop + symptom text →
   disease id; includes unknown-crop and no-match cases (abstention measured).
3. **Crop Doctor image set** (per `docs/cropdoctor/dataset-spec.md`): field
   photos, ≥30/class target crops, quality labels, two-rater protocol.
4. **Laya decision set** (~150): ambiguous queries with gold intent /
   clarification labels for temperature fitting (currently unfitted).

## Protocol (all four)

- Label format: `{input, language, expected, alternatives[], annotator,
  date, protocolVersion}` (chat/text/decision) or the 13-field image record.
- Annotators: domain agronomists (agriculture) / native speakers (language
  slots); disagreements adjudicated by a second expert, unresolved → quarantine.
- Splits: train/validation/test recorded per item; test split NEVER used for
  tuning (thresholds, temperatures, keywords) — violations invalidate results.
- Provenance: annotator id (no PII of farmers), source, revision; image sets
  carry device/region (district max) + consent records.
- Privacy: no farmer names/phone/GPS in any split; faces/license plates out.
