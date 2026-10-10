# Mobile Architecture — Offline-First Rice AI (as measured)

Architecture summary of the shipping KrishiVerse text/image AI path, with each claim
cited to the benchmark that measures it. No mobile-readiness claim is made from
desktop numbers (spec §69); device dimensions are `NOT MEASURED` and listed as such.

## 1. Layer overview

```
UI (PWA, React)
  └─ aiRouter (production entry; src/services/ai/aiRouter.js)
       ├─ connectivity probe (probeConnectivity: ONLINE/OFFLINE/UNCERTAIN, 4 s timeout)
       ├─ IndexedDBChatbotEngine (local tier, src/services/ai/IndexedDBChatbotEngine.js)
       │    ├─ AgriculturalNLP parse (intent, entities, langId en/ta/tg)
       │    ├─ KB lexical fastSearch (inverted index; conditional gating §8)
       │    ├─ alias-expanded hybrid retrieval + RRF (arm D/E strategies)
       │    ├─ LocalDecisionEngine (clarification / candidate selection / intent)
       │    └─ ResponseValidator  ← FINAL SAFETY AUTHORITY (dose, cure, provenance)
       ├─ Laya (optional cloud decision — connectivity-gated fallback, never default)
       └─ Crop Doctor image path
            ├─ deterministic image-quality gate (accept/reject, 8/8)
            └─ ONNX EfficientNet-B0 via WASM (32.1 MB + 40.4 MB runtime)
```

## 2. Text path properties (measured)

| Property | Value | Evidence |
| --- | --- | --- |
| Offline completion | 19/19 queries, 36/36 full set, **zero network** (fetch disabled in harness) | `offline-results.json` |
| Screening pass | all measured arms A–G **1.000**; EN/TA/Tanglish 1.000 | `arm-results.json` |
| Decision quality | 1.000 (8 cases), safety invariant blocked | `decision-results.json` |
| Grounding | guard 16/16; ResponseValidator cross-check 4/4 | `grounding-results.json` |
| Safety | frozen 15/15 + rice screen 4/4; critical failure `false` | `safety-results.json` |
| Retrieval | R@3 1.000, MRR 0.843; conditional gating −14.3% calls with parity | `retrieval-results.json` |
| Desktop latency reference | simple avg 6.61 ms p95 13.90; complex avg 10.27 ms p95 23.98 (snapshot) | `mobile-results.json` |

## 3. Conditional retrieval gating (§8)

Production (`aiRouter.js`) retrieves for every query; the measured candidate skips
retrieval for intents that never read KB hits (greeting/help/about in production
scope; scheme/weather/price added in the candidate scope):

- ALWAYS 42 retrieval calls vs conditional **36 (−14.3%)** — `rag-conditional.json`
- rag-hit parity 6/6 on rice cases; all 6 meta probes gated as designed
- meta short-circuit exists today at `IndexedDBChatbotEngine.js` (greeting/help/about)

Decision: `PILOT` — wire the candidate gate behind a flag, keep production behavior
until the low-end device run confirms the latency win.

## 4. Image path (measured)

- Quality gate: 8/8 verdicts, detection 1.00, false-block 0.00 (`image-quality.json`).
- Model: EfficientNet-B0 PlantVillage 6-class, top-1 0.95 / macro F1 0.9505 /
  Wilson [0.895, 0.977] — **no rice classes → REJECT for rice** (`model-results.json`).
- Storage footprint: 32.1 MB ONNX + 40.4 MB WASM runtime (`mobile-results.json`).

## 5. Model strategy (catalog, not measurements)

`model-results.json` → `modelCatalog`:

- on-device WebGPU tiers: 0.5b / 1.5b / 3b (Qwen2.5 family) — arm N skipped
  (WebGPU not available in node harness);
- six small-LLM candidates with public sizes/licenses — arm O skipped
  (`KV_BENCH_LLM_URL`);
- Needle 3 (H–M) skipped (`cactus-needle` not installed).

No external-model number exists in this study; none is invented.

## 6. What is NOT measured (device)

| Dimension | State | How to measure |
| --- | --- | --- |
| Low-end Android latency | NOT MEASURED | run the PWA on device, profile with DevTools |
| Device RAM under load | NOT MEASURED | chrome://inspect / Perfetto (`memory-results.json` howToRun) |
| Battery/thermal | NOT MEASURED | on-device observation |
| Installed bundle size on device | NOT MEASURED | (desktop dist bundle 95.9 MB is a reference only) |
| Service worker + IndexedDB persistence | OFF-18/OFF-19 skipped | Playwright/Lighthouse run |

Utility score (§41) therefore counts only the 90 measured weight points:
**A 98.6, E 99.4 vs BEFORE 82.4** (`mobile-utility-score.json`; ±0.5 with machine
load via the latency dimension).

## 7. Governing rules

1. ResponseValidator is the final safety authority for every arm — no arm is scored
   around it.
2. Offline never fabricates cloud answers; with network disabled the local path must
   answer or abstain honestly.
3. Laya is optional; Needle is experimental; WebLLM/Qwen arms are optional — all
   skipped arms carry exact re-run commands.
4. Desktop numbers are labelled desktop; on-device claims require a device run (§69).
