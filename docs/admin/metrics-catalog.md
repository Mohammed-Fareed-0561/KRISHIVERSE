# Metrics Catalog

Every dashboard section declares where its numbers come from. Three sources
exist and they are never mixed:

| Badge shown in UI | Meaning |
|---|---|
| `Production telemetry` | Measured from live traffic (server-side observer, sampled) |
| `Evaluation dataset — not live farmer accuracy` | From `KRISHIVERSE/eval/results/*.json` — curated/regression suites |
| *(plain label / registry)* | Static build facts: git versions, KB manifest, dependency registry |

Rules enforced in code and tests (`adminUi.test.jsx`, backend
`admin.dashboard.test.js`):

- Evaluation numbers always render under the evaluation badge/label; they are
  never titled "accuracy of the live system".
- Unlabelled production traffic is reported as counts/latency/outcomes —
  **never** as accuracy.
- The training-loss panel always shows exactly:
  `Not available — no training-loss telemetry configured.`
- Every unavailable metric carries an explicit reason string; there are no
  blank "N/A" cells.

## Sections (navigation: 3 groups, 16 routes)

### Monitoring

| Section (route) | Source | Key metrics |
|---|---|---|
| System health (`health`) | production telemetry + registry | component health blocks (api, mongo, rag, telemetry pipeline), 5xx rate, p95 latency, monitoring-pipeline isolation status, build/KB versions |
| Chatbot (`chatbot`) | production telemetry | request/response counts, outcomes (success/fallback/error/timeout/offline), intents, languages, latency percentiles (p50/p95/p99), safety-blocked share |
| RAG / knowledge (`rag`) | production telemetry + KB manifest | retrieval query/result counts, result/source counts, kbVersion distribution, retrieval latency, **not measured**: answer grounding on live traffic (unlabelled) |
| Safety (`safety`) | production telemetry + eval | validator outcomes (`safe/warning/high_risk/blocked`), rules fired tally, review queue (`POST /safety/reviews` for human labelling), eval safety panel from `safety.json` |
| Crop Doctor (`crop-doctor`) | production telemetry + eval | diagnose counts/outcomes; **accuracy panels are eval-only** (`cropdoctor.json`, ONNX top-1/top-3, Wilson CI, abstention) |
| Models (`models`) | production telemetry | `model.invoke`/`model.fallback` counts, provider/model names, latency, tokens/sec when captured |
| Languages (`languages`) | production telemetry | per-language traffic split, outcomes per language |
| Coverage (`coverage`) | production telemetry + KB manifest | feature coverage of live traffic vs registered features; gaps shown as "not captured" |
| Sources (`sources`) | KB manifest + source scan | provenance fields, quarantine counts, duplicate/freshness scan (5-min cache) |
| Failures & incidents (`failures`) | production telemetry | 4xx/5xx breakdown, error-code tally, redacted log stream, incident CRUD (`open → mitigated → resolved`, sev1–sev3) |

### Analysis

| Section | Source | Key metrics |
|---|---|---|
| Evaluation (`evaluation`) | eval results files | 8 dataset tabs (retrieval, safety, provenance, chatbot, multilingual, grounding, cropdoctor, joint-rag) with per-dataset metrics, language/topic facets, failure examples, methodology limitations, and a permanent "Panels that stay unavailable" list (training-loss, production-accuracy) |
| Farmers (`farmers`) | production telemetry + `users` collection (aggregates only) | registered/logged-in farmer counts, login success share, 7-day signups, onboarding funnel (started/completed/abandoned + completion %), per-step drop-off (`CountBars`), language/district/crop distributions; **no names, emails, phone numbers or other identifiers** (subtitle states this) |

### Operations

| Section | Source | Key metrics |
|---|---|---|
| Backups (`backups`) | backup registry | create/list/verify/restore, checksums, drill status |
| Versions & changes (`versions`) | git + registries | app/KB versions, last commits, dependency map, config change history, KB change log |
| Audit & logs (`audit`) | audit log | mutations by actor/action, access denials, summary counts, log centre (redacted, ring of 500) |
| Registries (`registry`) | registry entries | datasets registry, models registry, dependency registry |
| Readiness & DR (`readiness`) | scorecard | pass/warn/fail/unavailable checks + DR status (RTO/RPO/last drill) |

## Readiness scorecard checks

Groups: `data`, `retrieval`, `safety`, `reliability`, `operations`.
Statuses: `pass | warn | fail | unavailable` (unavailable states why).

| Check | Target | Current basis |
|---|---|---|
| `kb-manifest` | exists | `KRISHIVERSE/src/data/kb/v2/manifest.json` |
| `kb-curated-share` | ≥ 20 curated records | 23 curated → pass |
| `kb-quarantine` | tainted records quarantined | 15 000 quarantined → pass |
| `kb-provenance` | ≥ 100 records with source URL | 2 → **warn** |
| `kb-dosage` | ≥ 10 verified dosage records | 3 → **warn** (dosage advice stays blocked until this grows) |
| `kb-conflicts` | 0 unresolved conflicts | 393 build-time conflicts → warn |
| `retrieval-recall` | Recall@1 ≥ 0.70 (warn ≥ 0.60) | 0.727 → pass |
| `retrieval-recall5` | Recall@5 ≥ 0.95 | 1.00 → pass |
| `safety-invariants` | all pass | `safety.json` failed = 0 → pass |
| `provenance-invariants` | all pass | `provenance.json` failed = 0 → pass |
| `api-5xx` | ≤ 1 % (warn ≤ 5 %) | sampled window; `unavailable` with no traffic |
| `api-latency` | p95 ≤ 1500 ms (server-side only) | sampled window; `unavailable` with no traffic |
| `telemetry-pipeline` | rejection rate < 5 % | telemetry health rollup |
| `audit-log` | enabled | append-only audit, no update/delete endpoints |
| `admin-docs` | `docs/admin/` present | this documentation set |

## Declared non-measurable metrics (with reasons)

| Metric | Reason shown |
|---|---|
| Training loss | `Not available — no training-loss telemetry configured.` |
| Production accuracy | Production traffic is unlabelled; ground-truth labels do not exist for live farmer questions |
| Safety false-positive rate | No expert-labelled safety dataset exists |
| Safety false-negative rate | No expert-labelled safety dataset exists |
| Calibration (ECE) for grounding/ONNX | No probability outputs recorded by the trace |
| Live answer grounding | Substring trace without labels — eval-only via `grounding.json` |
| Client-side latency | Frontend farmer-path instrumentation not implemented yet |
| Loss/latency for offline inference | Not captured by the server-side observer |

## Evaluation datasets (files under `KRISHIVERSE/eval/results/`)

| File | Written by | Shape highlights |
|---|---|---|
| `retrieval.json` | `retrieval.eval.test.js` | `overall` (n, R@1/R@3/R@5, MRR), `byLanguage`, `byTopic`, per-row `rows`, `uncoveredTopics` |
| `safety.json` | `safety.regression.test.js` (`afterAll` writer, checks re-evaluated live) | `checks[]` with `pass`, `total/passed/failed/passRate` |
| `provenance.json` | `provenance.regression.test.js` (same pattern) | 7 invariant checks + `recordsWithFullProvenance`, `provenanceCoveragePct` from the KB manifest |
| `chatbot.json` | `chatbot.eval.test.js` | cases/scored/passed/accuracy, byLanguage, latency |
| `multilingual.json` | `multilingual.eval.test.js` | perLanguage intent/crop/retrieval accuracy |
| `grounding.json` | `grounding.eval.test.js` | grounded/scored + rows |
| `cropdoctor.json` | `cropdoctor.eval.test.js` | text top-1/top-3, ONNX top-1 + Wilson CI, abstention, confusion |
| `joint-rag.json` | joint A/B benchmark script | A recall vs B entity-mention, reachability note when B is down |

Unknown dataset names on `GET /api/admin/evaluation/:dataset` return 404;
missing files render `unavailable` with the exact command hint to populate them.
