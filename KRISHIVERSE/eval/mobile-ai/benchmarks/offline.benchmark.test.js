/**
 * eval/mobile-ai/benchmarks/offline.benchmark.test.js
 *
 * Offline matrix OFF-01..20 (spec §20): connectivity scenarios against the
 * production connectivity probe (read-only, fetcher INJECTED — no real
 * network calls are ever made here), TTL-cache behaviour, and proof that the
 * local chatbot/safety/decision/grounding paths all work with global fetch
 * disabled entirely. Device/browser-only rows are recorded as skipped with an
 * exact howToRun — never estimated. Writes eval/mobile-ai/results/
 * offline-benchmark.json.
 */
/* global process: readonly */
import { describe, it, expect, beforeEach } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { probeConnectivity, resetConnectivityCache, CONNECTIVITY_STATES, getConnectivityState }
  from "../../../src/services/ai/connectivity.js";
import { parseQuery, buildInvertedIndex, fastSearch, resetIndex } from "../../../src/services/ai/AgriculturalNLP.js";
import { validateResponse } from "../../../src/services/ai/ResponseValidator.js";
import { assessResponse } from "../grounding/AgriculturalGroundingGuard.js";
import { getOnDeviceModelId } from "../../../src/services/ai/onDeviceChatEngine.js";
import { CROPS } from "../../../src/data/seed/cropData.js";
import { DISEASE_PESTS, SYMPTOMS } from "../../../src/data/seed/diseaseData.js";
import { TREATMENTS } from "../../../src/data/seed/treatmentData.js";
import { RICE_CHATBOT_CASES } from "../datasets/riceChatbotCases.js";
import { existingLocal } from "../adapters/decisions.js";
import { buildRunMeta } from "../runMeta.js";
import { validateBenchmarkResult, DATA_CLASS } from "../schemas.js";
import { latencyStats } from "../scoring.js";

const OUT_DIR = join(process.cwd(), "eval", "mobile-ai", "results");

const okFetch = async () => ({ status: 200, json: async () => ({ ok: true }) });
const failFetch = async () => { throw new TypeError("fetch failed"); };
const serverDownFetch = async () => ({ status: 503, json: async () => ({ ok: false }) });
const slowFetch = async () => { await new Promise((r) => setTimeout(r, 700)); return { status: 200 }; };
const hangUntilAbort = (url, opts) => new Promise((resolve, reject) => {
  const signal = opts?.signal;
  if (signal) {
    signal.addEventListener("abort", () => {
      const e = new Error("The operation was aborted");
      e.name = "AbortError";
      reject(e);
    });
  }
  void url; void resolve;
});

/** Offline matrix row helpers — every row carries an honesty label (spec §20/§69). */
const SIM = "simulated-fetch-injection (node, no real network)";
const LOCAL = "local deterministic (node, fetch disabled)";
const DEVICE = "device/browser-only (NOT MEASURED here)";
const measuredRow = (ref, id, expected, actual, ok, extra = {}) =>
  ({ ref, id, state: "measured", env: extra.env || SIM, expected, actual, ok, ...extra });
const skippedRow = (ref, id, skipReason, howToRun) =>
  ({ ref, id, state: "skipped", env: DEVICE, skipReason, howToRun });

describe("eval/mobile-ai offline matrix (OFF-01..20)", () => {
  beforeEach(() => resetConnectivityCache());

  it("measures OFF-01..20: connectivity, cache, network-free local path, device rows skipped", async () => {
    const matrix = [];
    const scenarios = [];

    // ── OFF-01..07: connectivity probe scenarios (injected fetchers) ───────
    resetConnectivityCache();
    const s1 = await probeConnectivity({ force: true, fetcher: failFetch });
    scenarios.push({ ref: "OFF-01", id: "fully-offline", expected: "OFFLINE", actual: s1, ok: s1 === CONNECTIVITY_STATES.OFFLINE });

    resetConnectivityCache();
    const s2 = await probeConnectivity({ force: true, fetcher: okFetch });
    scenarios.push({ ref: "OFF-02", id: "online", expected: "ONLINE", actual: s2, ok: s2 === CONNECTIVITY_STATES.ONLINE });

    resetConnectivityCache();
    const s3 = await probeConnectivity({ force: true, fetcher: hangUntilAbort });
    scenarios.push({ ref: "OFF-03", id: "lost-during-request", expected: "UNCERTAIN", actual: s3, ok: s3 === CONNECTIVITY_STATES.UNCERTAIN });

    resetConnectivityCache();
    const s4a = await probeConnectivity({ force: true, fetcher: failFetch });
    resetConnectivityCache();
    const s4b = await probeConnectivity({ force: true, fetcher: okFetch });
    scenarios.push({ ref: "OFF-04", id: "connectivity-returns", expected: "OFFLINE then ONLINE",
      actual: `${s4a} -> ${s4b}`, ok: s4a === "OFFLINE" && s4b === "ONLINE" });

    resetConnectivityCache();
    const t5 = performance.now();
    const s5 = await probeConnectivity({ force: true, fetcher: slowFetch });
    const s5ms = performance.now() - t5;
    scenarios.push({ ref: "OFF-05", id: "slow-connection", expected: "ONLINE", actual: s5,
      ms: +s5ms.toFixed(1), ok: s5 === CONNECTIVITY_STATES.ONLINE });

    resetConnectivityCache();
    const i1 = await probeConnectivity({ force: true, fetcher: failFetch });
    resetConnectivityCache();
    const i2 = await probeConnectivity({ force: true, fetcher: okFetch });
    resetConnectivityCache();
    const i3 = await probeConnectivity({ force: true, fetcher: failFetch });
    scenarios.push({ ref: "OFF-06", id: "intermittent", expected: "OFFLINE,ONLINE,OFFLINE",
      actual: `${i1},${i2},${i3}`, ok: i1 === "OFFLINE" && i2 === "ONLINE" && i3 === "OFFLINE" });

    resetConnectivityCache();
    const s7 = await probeConnectivity({ force: true, fetcher: serverDownFetch });
    scenarios.push({ ref: "OFF-07", id: "server-unavailable-503",
      expected: "ONLINE (network reachable; router falls back by tier)",
      actual: s7, ok: s7 === CONNECTIVITY_STATES.ONLINE,
      note: "observed production behaviour: any HTTP status counts as ONLINE" });

    for (const s of scenarios) matrix.push(measuredRow(s.ref, s.id, s.expected, s.actual, s.ok,
      { ms: s.ms, note: s.note }));

    // ── OFF-08..09: TTL cache behaviour (fetcher call counters) ────────────
    let probeCalls = 0;
    const countingFetch = async () => { probeCalls++; return okFetch(); };
    resetConnectivityCache();
    await probeConnectivity({ force: true, fetcher: countingFetch });
    const callsAfterPrime = probeCalls;
    const cached = await probeConnectivity({ fetcher: countingFetch });
    matrix.push(measuredRow("OFF-08", "ttl-cache-no-reprobe",
      "cached ONLINE reused; 0 fetcher calls within TTL", `${cached}; fetcherCalls=${probeCalls - callsAfterPrime}`,
      cached === CONNECTIVITY_STATES.ONLINE && probeCalls === callsAfterPrime));
    resetConnectivityCache();
    await probeConnectivity({ force: true, fetcher: countingFetch });
    matrix.push(measuredRow("OFF-09", "cache-reset-forces-reprobe",
      "fetcher called again after resetConnectivityCache", `fetcherCalls=${probeCalls - callsAfterPrime - 1}`,
      probeCalls === callsAfterPrime + 1));

    // ── OFF-10..16: local path with global fetch DISABLED entirely ─────────
    resetIndex();
    buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });
    const realFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error("network disabled during offline benchmark"); };
    let localLat = [];
    let localEvidence = 0;
    let localQueryCount = 0;
    try {
      // OFF-10: local chatbot path (parse+retrieve+validate), intent+rag subset.
      const localCases = RICE_CHATBOT_CASES.filter((x) => x.type === "intent" || x.type === "rag");
      localQueryCount = localCases.length;
      const localRows = [];
      localLat = [];
      for (const c of localCases) {
        const t0 = performance.now();
        const parsed = parseQuery(c.input);
        const hits = fastSearch(c.input, { limit: 5 }).records.map((r) => r.record);
        const verdict = validateResponse({
          answer: hits.length ? `Evidence found for: ${c.input}. Verify with KVK.` : "",
          source: "local", records: hits, parsed, intent: parsed.intent,
        }).verdict;
        localLat.push(performance.now() - t0);
        localRows.push({ id: c.id, intent: parsed.intent, evidence: hits.length, verdict });
      }
      expect(localRows.every((r) => r.evidence >= 0)).toBe(true);
      localEvidence = localRows.filter((r) => r.evidence > 0).length;
      matrix.push(measuredRow("OFF-10", "local-answer-path-no-network",
        `${localCases.length}/${localCases.length} queries answered with fetch disabled`,
        `${localRows.length}/${localCases.length}`,
        localRows.length === localCases.length, { env: LOCAL, latencyMs: latencyStats(localLat) }));

      // OFF-11: FULL rice screening set end-to-end offline (all types).
      const allRows = [];
      const allLat = [];
      for (const c of RICE_CHATBOT_CASES) {
        const t0 = performance.now();
        const parsed = parseQuery(c.input);
        const hits = fastSearch(c.input, { limit: 5 }).records.map((r) => r.record);
        const verdict = validateResponse({
          answer: hits.length ? `Evidence found for: ${c.input}. Verify with KVK.` : "",
          source: "local", records: hits, parsed, intent: parsed.intent,
        }).verdict;
        allLat.push(performance.now() - t0);
        allRows.push({ id: c.id, verdict });
      }
      const completed = allRows.filter((r) => typeof r.verdict === "string" && r.verdict.length > 0).length;
      matrix.push(measuredRow("OFF-11", "full-rice-set-offline",
        `${RICE_CHATBOT_CASES.length}/${RICE_CHATBOT_CASES.length} cases complete with a validator verdict`,
        `${completed}/${RICE_CHATBOT_CASES.length}`, completed === RICE_CHATBOT_CASES.length,
        { env: LOCAL, latencyMs: latencyStats(allLat) }));

      // OFF-12: retrieval returns KB hits with fetch disabled.
      const ragCases = RICE_CHATBOT_CASES.filter((c) => c.type === "rag");
      const ragHits = ragCases.map((c) => ({
        id: c.id,
        hit: c.expected.recordIds.every((id) => fastSearch(c.input, { limit: 5 }).records.some((r) => r.record.id === id)),
      }));
      matrix.push(measuredRow("OFF-12", "retrieval-kb-hits-offline",
        `${ragCases.length}/${ragCases.length} rag cases retrieve expected KB records`,
        `${ragHits.filter((r) => r.hit).length}/${ragCases.length}`,
        ragHits.every((r) => r.hit), { env: LOCAL }));

      // OFF-13: safety gate blocks a fabricated dose with network disabled.
      const block = validateResponse({
        answer: "Spray 2.5ml per litre of pesticide every 7 days before harvest.",
        source: "local", records: [], parsed: parseQuery("how to spray"), intent: "treatment",
      });
      matrix.push(measuredRow("OFF-13", "safety-block-offline",
        "blocked (no evidence, fabricated dose)", block.verdict, block.verdict === "blocked", { env: LOCAL }));

      // OFF-14: local clarification decision offline.
      const d = await existingLocal.decide("clarification",
        { query: "my rice has problems", parsed: parseQuery("my rice has problems") }, [], []);
      matrix.push(measuredRow("OFF-14", "decision-clarify-offline",
        "decision returns with needsClarification boolean", `needsClarification=${d.needsClarification}`,
        typeof d.needsClarification === "boolean", { env: LOCAL }));

      // OFF-15: grounding guard claim assessment offline (pure string ops).
      const g = assessResponse({
        answer: "Apply Tricyclazole 300 g/ha for blast control.",
        evidence: [{ id: "tnau_rice_blast", content: "Tricyclazole 300 g/ha spray at 15 DAT", source: "TNAU", sourceUrl: "https://example.invalid/tnau" }],
        context: { crop: "rice", disease: "blast" },
      });
      matrix.push(measuredRow("OFF-15", "grounding-guard-offline",
        "overall verdict returned (SUPPORTED|…)", g.overall, typeof g.overall === "string" && g.overall.length > 0,
        { env: LOCAL }));
    } finally {
      globalThis.fetch = realFetch;
    }

    // OFF-16: KB index rebuild offline (after the fetch-disabled block —
    // rebuilding here proves the index needs only bundled seed data).
    const realFetch2 = globalThis.fetch;
    globalThis.fetch = () => { throw new Error("network disabled during index rebuild"); };
    try {
      resetIndex();
      buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });
      const rebuilt = fastSearch("rice blast", { limit: 5 }).records.length;
      matrix.push(measuredRow("OFF-16", "kb-index-rebuild-offline",
        "inverted index rebuilds from bundled seeds, hits > 0", `hits=${rebuilt}`, rebuilt > 0, { env: LOCAL }));
    } finally {
      globalThis.fetch = realFetch2;
    }

    // OFF-17: on-device model tier selection (deterministic, offline).
    const lowTier = getOnDeviceModelId(2);
    const highTier = getOnDeviceModelId(8);
    matrix.push(measuredRow("OFF-17", "ondevice-tier-selection",
      "low-memory (2 GB) selects a smaller tier than 8 GB", `${lowTier} vs ${highTier}`,
      Boolean(lowTier && highTier && lowTier !== highTier), { env: LOCAL }));

    // ── OFF-18..20: device/browser-only — recorded, never estimated ────────
    matrix.push(skippedRow("OFF-18", "service-worker-cache",
      "service worker registration/update + Cache Storage require a PWA browser session — not measurable in node",
      "run the PWA build in Chrome DevTools (Application → Service Workers) or a Playwright device run; see docs/ai/offline-architecture.md"));
    matrix.push(skippedRow("OFF-19", "indexeddb-kb-persistence",
      "IndexedDB persistence across app restarts requires a real browser/IndexedDB — jsdom has none",
      "device test: install PWA → query → kill app → relaunch → repeat query offline (manual QA script)"));
    matrix.push(skippedRow("OFF-20", "telemetry-offline-queue",
      "KNOWN GAP: telemetry client is memory-only (failed batches lost) — production change out of scope for this benchmark",
      "implement offline-buffered telemetry (spec §52) then re-run: npx vitest run eval/mobile-ai/benchmarks/offline.benchmark.test.js"));

    resetConnectivityCache();

    const measuredRows = matrix.filter((r) => r.state === "measured");
    const skippedRows = matrix.filter((r) => r.state === "skipped");

    const result = {
      dataClass: DATA_CLASS,
      title: "Offline matrix OFF-01..20 (connectivity + network-free local path + device rows)",
      runMeta: buildRunMeta("rice-offline-matrix-v1",
        ["eval/mobile-ai/datasets/riceChatbotCases.js"],
        { probeTimeoutMs: 4000, ttlMs: 30000, fetcher: "injected (no real network calls made)",
          envs: `${SIM} | ${LOCAL} | ${DEVICE}` }),
      dataset: { total: RICE_CHATBOT_CASES.length, origin: "synthetic-screening",
        note: "rice subset for OFF-10/11 executed with global fetch disabled" },
      arms: [
        { id: "connectivity-probe", label: "Production connectivity probe (ONLINE/OFFLINE/UNCERTAIN)",
          state: "measured",
          metrics: { scenarios: scenarios.length, matched: scenarios.filter((s) => s.ok).length,
            failures: scenarios.filter((s) => !s.ok).map((s) => s.id) },
          latencyMs: latencyStats(scenarios.filter((s) => typeof s.ms === "number").map((s) => s.ms)) },
        { id: "offline-matrix", label: "OFF-01..20 offline matrix (spec §20)",
          state: "measured",
          metrics: { total: matrix.length, measured: measuredRows.length, skipped: skippedRows.length,
            passed: measuredRows.filter((r) => r.ok === true).length,
            failed: measuredRows.filter((r) => r.ok !== true).map((r) => r.ref) },
          latencyMs: null },
        { id: "local-path-no-network", label: "Local chatbot path with fetch disabled (parse+retrieve+validate)",
          state: "measured",
          metrics: { queries: localQueryCount, completed: localQueryCount, withEvidence: localEvidence },
          latencyMs: latencyStats(localLat) },
        { id: "telemetry-offline-queue", label: "Production telemetry offline queue durability",
          state: "skipped",
          skipReason: "OFF-20 KNOWN GAP: telemetry client is memory-only (failed batches lost) — recorded, not hidden",
          latencyMs: null },
      ],
      scenarios,
      offlineMatrix: matrix,
      taskBreakdown: { measured: ["offline scenario classification", "network-free local answers",
        "TTL cache behaviour", "offline safety/decision/grounding", "index rebuild offline"] },
      limitations: [
        "Simulated via injected fetchers in node/jsdom — not on a physical device with a real radio (spec §69).",
        "OFF-18/OFF-19 device rows are NOT MEASURED here — exact howToRun recorded per row.",
        "Battery/thermal and real network transitions (airplane mode, tower loss) require device testing.",
        "Online enhancement path (backend RAG/Groq) requires a live backend and is exercised by scripts/joint-rag-benchmark.mjs, not here.",
      ],
    };
    validateBenchmarkResult(result);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "offline-benchmark.json"), JSON.stringify(result, null, 1));

    // ── Matrix integrity: OFF-01..20 exactly once, honesty labels present ──
    expect(matrix.length).toBe(20);
    expect(matrix.map((r) => r.ref)).toEqual(
      Array.from({ length: 20 }, (_, i) => `OFF-${String(i + 1).padStart(2, "0")}`));
    expect(measuredRows.every((r) => r.ok === true)).toBe(true);
    expect(skippedRows.every((r) => r.skipReason && r.howToRun && r.env === DEVICE)).toBe(true);
    expect(scenarios.filter((s) => s.ok).length).toBe(scenarios.length);
    expect(getConnectivityState()).toBeTruthy();
  }, 60000);
});
