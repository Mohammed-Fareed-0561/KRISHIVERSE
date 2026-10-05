/**
 * connectivity.js
 *
 * Lightweight connectivity detection for the AI router.
 *
 * States:
 *   ONLINE    — navigator.onLine is true and a recent probe reached the backend
 *   OFFLINE   — navigator.onLine is false (device is offline) or a probe failed
 *               with a network error
 *   UNCERTAIN — navigator says online but we have no probe result yet (probe
 *               pending or timed out)
 *
 * Design rules:
 *  - Never blocks: probes use a short timeout, results are cached with a TTL,
 *    and the fast navigator.onLine signal is returned synchronously.
 *  - A probe that merely times out maps to UNCERTAIN (the device may still be
 *    online), while a resolved network error maps to OFFLINE.
 *  - The router treats this as a hint for gating live (Groq/backend) calls; it
 *    must never block offline/local answers.
 */

import { appConfig } from "../config/appConfig";

export const CONNECTIVITY_STATES = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  UNCERTAIN: "UNCERTAIN",
};

export const CONNECTIVITY_CONFIG = {
  probeUrl: `${appConfig.apiBase.replace(/\/+$/, "")}/health`,
  probeTimeoutMs: 4000,
  ttlMs: 30_000,
};

let _state = null; // { state, at }
let _probePromise = null;

function isDeviceOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function record(state) {
  _state = { state, at: Date.now() };
}

/**
 * Fast, synchronous connectivity signal. Never probes, never throws.
 * Falls back to UNCERTAIN when online but unverified.
 */
export function getConnectivityState() {
  if (!isDeviceOnline()) return CONNECTIVITY_STATES.OFFLINE;
  if (_state && Date.now() - _state.at < CONNECTIVITY_CONFIG.ttlMs) {
    return _state.state;
  }
  return _state ? _state.state : CONNECTIVITY_STATES.UNCERTAIN;
}

export function resetConnectivityCache() {
  _state = null;
  _probePromise = null;
}

/**
 * Probe the backend health endpoint. Returns the resolved connectivity state.
 * Never throws. A timed-out probe maps to UNCERTAIN; a network error maps to
 * OFFLINE; any HTTP response means the network is reachable → ONLINE.
 */
export async function probeConnectivity({ force = false, fetcher = globalThis.fetch } = {}) {
  if (!isDeviceOnline()) {
    record(CONNECTIVITY_STATES.OFFLINE);
    return CONNECTIVITY_STATES.OFFLINE;
  }

  if (!force && _state && Date.now() - _state.at < CONNECTIVITY_CONFIG.ttlMs) {
    return _state.state;
  }

  if (_probePromise) return _probePromise;

  _probePromise = (async () => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), CONNECTIVITY_CONFIG.probeTimeoutMs)
      : null;
    try {
      const res = await fetcher(CONNECTIVITY_CONFIG.probeUrl, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller?.signal,
      });
      // Any HTTP response (2xx, 3xx, 4xx, 5xx) proves the network is reachable.
      if (res && typeof res.status === "number") {
        record(CONNECTIVITY_STATES.ONLINE);
        return _state.state;
      }
      record(CONNECTIVITY_STATES.UNCERTAIN);
      return _state.state;
    } catch (err) {
      // Timeout/abort → unknown; real network failure → offline.
      const aborted = err && (err.name === "AbortError" || err.name === "TimeoutError");
      record(aborted ? CONNECTIVITY_STATES.UNCERTAIN : CONNECTIVITY_STATES.OFFLINE);
      return _state.state;
    } finally {
      if (timer) clearTimeout(timer);
      _probePromise = null;
    }
  })();

  return _probePromise;
}

export default {
  CONNECTIVITY_STATES,
  CONNECTIVITY_CONFIG,
  getConnectivityState,
  probeConnectivity,
  resetConnectivityCache,
};