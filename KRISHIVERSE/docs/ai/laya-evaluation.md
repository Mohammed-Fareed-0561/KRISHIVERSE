# Laya Evaluation — Live Arm NOT RUN; Fallback Path Measured

## What was measured

Arm `G-f-laya` (chatbot benchmark) runs the production configuration with
the Laya integration point wired, falling back to the local pipeline when Laya is
unreachable:

- pass rate **1.000 (95 cases)** — identical to the pure baseline arm A, i.e. the
  fallback path behaves exactly like the current production pipeline when no Laya
  deployment/network is configured.
- Evidence: `eval/mobile-ai/results/chatbot-arms.json` (§54 copy:
  `arm-results.json`).

Decision benchmark:

- `existing-decision` (local engine) measured: **1.000 (8 cases)** —
  BEFORE 0.875, DELTA +0.125 after the differential-clarification fix.
  Breakdown: clarification 4/4, candidate selection 3/3, intent 1/1.
- **Safety invariant passed**: unsourced dosage with `source=laya`,
  `confidence=0.99` was **blocked**. A confident cloud answer never bypasses the gate.
- Evidence: `eval/mobile-ai/results/decision-benchmark.json` (§54 copy:
  `decision-results.json`).

## What was NOT measured

The live Laya arm requires a deployed Laya backend + network and was skipped:

```
G-laya-live / laya-live: set KV_BENCH_API=<backend origin> to run the live Laya arm
                         (requires Laya deployment + network)
```

Re-run:

```bash
KV_BENCH_API=http://localhost:5000 npx vitest run eval/mobile-ai/benchmarks/decision.benchmark.test.js
npx vitest run eval/mobile-ai/benchmarks/chatbot.benchmark.test.js   # also enables G-laya-live
```

No Laya latency, token cost, or answer-quality number exists in this study — and none
is invented anywhere. The decision matrix records this arm as `NEEDS MORE DATA`.

## Connectivity contract (measured, offline benchmark)

- 7/7 connectivity probe scenarios classified correctly
  (`probeConnectivity({force, fetcher})`, 4 s probe timeout, cache reset asserted).
- Offline matrix **OFF-01..20: 17/17 measured rows pass**; 3 device-only rows
  (OFF-18 service worker, OFF-19 IndexedDB persistence, OFF-20 telemetry queue) are
  skipped with `howToRun`.
- Local path: **19/19 queries completed** with evidence for 17, **36/36 full set** —
  zero network (global `fetch` disabled structurally), no blocking, no fabricated
  cloud answers.
- Evidence: `eval/mobile-ai/results/offline-benchmark.json` (§54 copy:
  `offline-results.json`).

## Decision today

- Local decision engine: **ADOPT** (measured 1.000, safety invariant passed).
- Laya live: **NEEDS MORE DATA** — measure with `KV_BENCH_API` before any rollout
  decision; until then Laya stays a connectivity-gated fallback, never a default.
