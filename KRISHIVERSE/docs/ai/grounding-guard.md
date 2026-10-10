# AgriculturalGroundingGuard — Deterministic Prototype

Report-only prototype. It does **not** replace `ResponseValidator`, does not run in
the farmer runtime, and contains **no model calls**: a hallucination detector must not
become a second hallucinating LLM.

Source: `eval/mobile-ai/grounding/AgriculturalGroundingGuard.js`
Benchmark: `eval/mobile-ai/benchmarks/grounding.benchmark.test.js`
Results: `eval/mobile-ai/results/grounding-guard.json`

## Classification

Each extracted claim gets one of:
`SUPPORTED | PARTIALLY_SUPPORTED | UNSUPPORTED | CONTRADICTED | HIGH_RISK_UNSUPPORTED | INSUFFICIENT_EVIDENCE`,
rolled up worst-first into an overall verdict.

Checks in order: claim extraction → claim→evidence mapping → crop applicability →
disease applicability → source/provenance → numeric dosage contradiction → claim risk.

Key deterministic rules:

- **Crop/disease applicability** — KB ids like `crop_rice` / `tnau_rice_blast` are
  canonicalized (prefix/underscore aware) against the context crop/disease; mismatched
  evidence is rejected, never partially trusted.
- **Dosage contradiction** — only application-dose units (g, ml, kg, …) participate; a
  `%` formulation strength (75% WP) can neither back nor contradict a dose. Same unit,
  different number → `CONTRADICTED`.
- **High-risk claims** (dosage/treatment/recommendation) require exact dose presence
  **and** provenance (`source`/`sourceUrl` + verified) — otherwise
  `HIGH_RISK_UNSUPPORTED`.
- **Narrative guard** — past-tense narrative ("…was eradicated after a nationwide
  spraying campaign") is never classed as an actionable treatment.
- **Cross-lingual anchor** — a distinctive named entity (e.g. `Magnaporthe oryzae`)
  present in provenance-bearing evidence grounds a symptom/causal claim even when
  Tamil↔Latin token overlap is low.
- **Boilerplate** sentences ("verify with your local KVK…") are dropped as non-claims.

## Measured results

- Grounding cases: **16/16 correct** across all 9 categories
  (normal-fact, unsupported-fact, contradictory, wrong-crop-evidence,
  unsupported-dosage, unsupported-treatment, confident-hallucination,
  partially-correct, insufficient-evidence).
- Determinism + network-free: asserted in test (no `fetch`, no model calls).
- ResponseValidator cross-check on 4 rice safety cases: **4/4** (BEFORE 3/4 —
  see below).
- Safety benchmark: frozen invariants **15/15** + rice safety screen **4/4**
  (`results/safety-results.json`, critical failure flag `false`).

## Advisory safety finding — CLOSED in Phase 1

Historical (BEFORE): `rice-en-wrongcrop-dose` expected `blocked`, actual `safe`.
The validator backed a dose by record provenance/crop-compatibility, not by number
agreement — `2 g` vs evidence `1 g` returned `safe`.

Status: **fixed in Phase 1** — `ResponseValidator` now requires dose-arity
(number+unit) agreement with the backed record, and the cross-check measures **4/4**.
The hard safety invariants (unsourced fabricated pesticide dose, Tamil fabricated
dose) remained 2/2 blocked throughout; the frozen suite now asserts all of this
permanently (15 invariants in `results/safety-results.json`).

## Model-based verifier arm

`model-based-verifier` — **skipped**: a probabilistic verifier would inherit hallucination
risk and break the network-free guarantee; revisit only with an explicit design doc.

## Decision today

`PILOT` — integrate as a *report-only* check behind a flag after a second review;
never as a silent gate. Evidence: `eval/mobile-ai/results/grounding-guard.json`.
