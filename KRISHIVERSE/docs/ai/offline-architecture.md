# Offline Architecture — Matrix OFF-01..20 (spec §20)

Machine-readable source: `eval/mobile-ai/results/offline-benchmark.json` (§54 copy:
`offline-results.json` → `offlineMatrix`). Result: **20 rows — 17 measured pass,
0 failed, 3 skipped (device/browser-only, with `howToRun`)**.

## Environments (honesty labels)

| Label | Meaning |
| --- | --- |
| `simulated-fetch-injection (node, no real network)` | probe tested with an injected fetcher — no packet leaves the machine |
| `local deterministic (node, fetch disabled)` | `globalThis.fetch` replaced with a throwing stub — network use is structurally impossible, not merely absent |
| `device/browser-only (NOT MEASURED here)` | requires a real PWA/browser/device session — skipped with `howToRun` |

## The matrix

| Ref | Scenario | State | Expected → Actual |
| --- | --- | --- | --- |
| OFF-01 | fully-offline | measured ✓ | OFFLINE → OFFLINE |
| OFF-02 | online | measured ✓ | ONLINE → ONLINE |
| OFF-03 | lost-during-request | measured ✓ | UNCERTAIN → UNCERTAIN |
| OFF-04 | connectivity-returns | measured ✓ | OFFLINE then ONLINE ✓ |
| OFF-05 | slow-connection | measured ✓ | ONLINE (707 ms observed; 4 s probe timeout) |
| OFF-06 | intermittent | measured ✓ | OFFLINE,ONLINE,OFFLINE ✓ |
| OFF-07 | server-unavailable-503 | measured ✓ | ONLINE (production behaviour: any HTTP status counts as reachable) |
| OFF-08 | ttl-cache-no-reprobe | measured ✓ | cached ONLINE reused, fetcherCalls=0 |
| OFF-09 | cache-reset-forces-reprobe | measured ✓ | reprobe after `resetConnectivityCache` |
| OFF-10 | local-answer-path-no-network | measured ✓ | 19/19 queries answered with fetch disabled (snapshot: avg 23.99 ms desktop) |
| OFF-11 | full-rice-set-offline | measured ✓ | 36/36 cases get a validator verdict offline |
| OFF-12 | retrieval-kb-hits-offline | measured ✓ | 6/6 rag cases retrieve expected KB records |
| OFF-13 | safety-block-offline | measured ✓ | fabricated dose **blocked** with no network |
| OFF-14 | decision-clarify-offline | measured ✓ | `needsClarification=true` returned offline |
| OFF-15 | grounding-guard-offline | measured ✓ | verdict returned (HIGH_RISK_UNSUPPORTED on the probe case) |
| OFF-16 | kb-index-rebuild-offline | measured ✓ | index rebuilds from bundled seeds, hits>0 |
| OFF-17 | ondevice-tier-selection | measured ✓ | 2 GB device selects 0.5B tier vs 3B on 8 GB |
| OFF-18 | service-worker-cache | **skipped** | SW registration/Cache Storage need a PWA browser session — howToRun: DevTools/Playwright device run |
| OFF-19 | indexeddb-kb-persistence | **skipped** | persistence across restarts needs a real IndexedDB — howToRun: install PWA → query → kill → relaunch offline |
| OFF-20 | telemetry-offline-queue | **skipped** | **KNOWN GAP (§52)**: telemetry client is memory-only (failed batches lost) — implement offline buffering, then re-run |

## Offline claims this study makes (and does not make)

**Measured:** with `fetch` disabled, the local text path answers 19/19 intent+rag
queries and 36/36 of the full rice set, retrieval/safety/decision/grounding all
function, the KB index rebuilds from bundled seeds, and low-memory tier selection
picks the smaller on-device model tier. Zero fabricated cloud answers anywhere.

**NOT MEASURED (no claim):** service-worker caching behaviour (OFF-18), IndexedDB
persistence across restarts (OFF-19), telemetry durability across offline batches
(OFF-20), and any device-side timing. Those rows carry `skipReason` + `howToRun`,
never an implied pass.

## Connectivity contract (production)

- `probeConnectivity({force, fetcher})`: ONLINE / OFFLINE / UNCERTAIN, 4 s timeout,
  TTL cache with explicit `resetConnectivityCache` (OFF-08/09).
- Cloud arms (Laya) activate only when the probe says ONLINE and must fall back to
  the measured local path — never block, never fabricate.
- Conditional retrieval gating (§8, `PILOT`) only changes *when* the local index is
  consulted — it never introduces a network dependency
  (`results/retrieval-results.json`, parity 6/6).

## Reproduce

```bash
npm run eval:mobile-ai        # regenerates offline-benchmark.json + §54 files
```

Device rows (OFF-18/19/20) re-run exactly as their `howToRun` strings say; the
study treats their state as `NOT MEASURED` until then.
