import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CONNECTIVITY_STATES,
  CONNECTIVITY_CONFIG,
  getConnectivityState,
  probeConnectivity,
  resetConnectivityCache,
} from "./connectivity";

const realOnLine = navigator.onLine;

function setNavigatorOnline(value) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

const okFetcher = async () => ({ status: 200 });
const failFetcher = async () => {
  const err = new TypeError("fetch failed");
  throw err;
};
const abortFetcher = (_url, opts) =>
  new Promise((_resolve, reject) => {
    opts?.signal?.addEventListener("abort", () => reject({ name: "AbortError" }));
  });

beforeEach(() => {
  resetConnectivityCache();
  setNavigatorOnline(true);
});

afterEach(() => {
  resetConnectivityCache();
  setNavigatorOnline(realOnLine);
  CONNECTIVITY_CONFIG.probeTimeoutMs = 4000;
});

describe("connectivity", () => {
  it("reports OFFLINE immediately when navigator says offline", () => {
    setNavigatorOnline(false);
    expect(getConnectivityState()).toBe(CONNECTIVITY_STATES.OFFLINE);
  });

  it("reports UNCERTAIN when online but never probed", () => {
    expect(getConnectivityState()).toBe(CONNECTIVITY_STATES.UNCERTAIN);
  });

  it("becomes ONLINE after a successful probe", async () => {
    const state = await probeConnectivity({ fetcher: okFetcher });
    expect(state).toBe(CONNECTIVITY_STATES.ONLINE);
    expect(getConnectivityState()).toBe(CONNECTIVITY_STATES.ONLINE);
  });

  it("becomes OFFLINE on a network error", async () => {
    const state = await probeConnectivity({ fetcher: failFetcher });
    expect(state).toBe(CONNECTIVITY_STATES.OFFLINE);
  });

  it("maps a timed-out probe to UNCERTAIN (never blocks)", async () => {
    CONNECTIVITY_CONFIG.probeTimeoutMs = 40;
    const state = await probeConnectivity({ fetcher: abortFetcher });
    expect(state).toBe(CONNECTIVITY_STATES.UNCERTAIN);
  });

  it("caches the probe result until the TTL expires", async () => {
    await probeConnectivity({ fetcher: okFetcher });
    let calls = 0;
    const countingFetcher = async () => {
      calls += 1;
      return { status: 200 };
    };
    // Force refresh with a different fetcher — should probe again (force: true)
    await probeConnectivity({ fetcher: countingFetcher, force: true });
    expect(calls).toBe(1);
    // Non-forced call within TTL uses the cache without probing
    await probeConnectivity({ fetcher: countingFetcher });
    expect(calls).toBe(1);
  });

  it("respects OFFLINE gating even inside probeConnectivity", async () => {
    setNavigatorOnline(false);
    const state = await probeConnectivity({ fetcher: okFetcher });
    expect(state).toBe(CONNECTIVITY_STATES.OFFLINE);
  });
});