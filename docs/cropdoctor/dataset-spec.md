# Crop Doctor — Dataset Spec (Phase 3A)

Contract for the future expert-labelled KrishiVerse disease dataset.
No expert labels exist yet; nothing here invents any.

## Record fields

| Field | Required | Description |
|---|---|---|
| `image` | yes | file reference (sha256); original + 224px normalized copy |
| `crop` | yes | canonical crop id (must exist in crop registry) |
| `disease` | yes | canonical disease id, or `healthy` |
| `healthy` | yes | boolean (disease === healthy) |
| `severity` | if available | none/mild/moderate/severe + rater note |
| `image_quality` | yes | usable/poor + reason (blur/dark/tiny/occluded) |
| `growth_stage` | if available | seedling/vegetative/flowering/etc. |
| `device` | if available | phone model / camera |
| `source` | yes | field survey / kvk / farmer submission (no PII) |
| `region` | if available | district, state (never finer than district) |
| `expert_label` | yes | primary agronomist label (disease id) |
| `expert_label_2` | on disagreement | second agronomist label |
| `provenance` | yes | who labelled, when, protocol version |
| `disagreement` | on conflict | free-text resolution note; unresolved → quarantine |

## Label tiers (never mix without tagging)

- `expert-labelled` — two-agronomist protocol above; the ONLY ground truth.
- `public-benchmark` — PlantVillage hold-out (`backend/eval/dataset`, 120 imgs):
  research-grade labels, lab photos, NOT field performance.
- `synthetic` — generated/augmented; screening only, quarantined like KB records.
- `unlabelled` — field photos awaiting labels; must not score accuracy.

## Acceptance gates for future model/detector work

- Per-class n ≥ 30 expert-labelled field images before claiming per-class skill.
- Report top-1/top-3 + confusion + abstention rate on expert set only.
- Calibration set (≥200 labelled) before quoting any probability.
- Unknown-crop and unusable-image cases in the eval split (abstention measured).
