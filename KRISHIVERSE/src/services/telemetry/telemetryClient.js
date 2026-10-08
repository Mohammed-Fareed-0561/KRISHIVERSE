import { appConfig } from "../config/appConfig";

/**
 * Client-side telemetry sender (schema v1).
 *
 * Design constraints:
 *  - fire-and-forget: captureTelemetry() never throws and never returns a promise
 *    the caller has to await
 *  - batched: events queue locally and flush to POST /api/admin/telemetry/batch
 *  - content-free: callers may only pass labels, codes and numbers — raw farmer
 *    text is rejected by the schema on the server as well
 *  - opt-in wiring: farmer runtime code does NOT import this module today; it is
 *    used by the admin dashboard and is the extension point for future
 *    instrumentation of client surfaces
 */

const SCHEMA_VERSION = 1;
const ENDPOINT = `${appConfig.apiBase.replace(/\/v1\/?$/, "")}/admin/telemetry/batch`;
const MAX_BATCH = 25;
const FLUSH_DELAY_MS = 5000;
const MAX_QUEUE = 200;
const SESSION_KEY = "kv_telemetry_session";

let queue = [];
let timer = null;
let enabled = true;
const counters = { captured: 0, sent: 0, failed: 0, dropped: 0 };

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "s-ephemeral";
  }
}

function normalize(partial) {
  if (!partial || typeof partial !== "object") return null;
  if (typeof partial.eventType !== "string" || !/^[a-z][a-z0-9_.]*$/.test(partial.eventType)) return null;
  const event = {
    schemaVersion: SCHEMA_VERSION,
    eventType: partial.eventType,
    occurredAt: partial.occurredAt || new Date().toISOString(),
    sessionId: partial.sessionId || sessionId(),
    feature: partial.feature || "other",
    outcome: partial.outcome || "success",
    source: {
      surface: partial.surface || "pwa",
      appVersion: partial.appVersion,
      locale: typeof navigator !== "undefined" ? navigator.language : undefined,
      platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
    },
  };
  if (partial.requestId) event.requestId = String(partial.requestId).slice(0, 64);
  if (partial.intent) event.intent = String(partial.intent).slice(0, 64);
  if (partial.language) event.language = partial.language;
  if (Number.isFinite(partial.latencyMs)) event.latencyMs = partial.latencyMs;
  if (partial.errorCode) event.errorCode = String(partial.errorCode).slice(0, 64);
  if (partial.connectivity) event.connectivity = partial.connectivity;
  if (partial.safety) event.safety = partial.safety;
  if (partial.model) event.model = partial.model;
  if (partial.retrieval) event.retrieval = partial.retrieval;
  if (partial.metadata && typeof partial.metadata === "object") {
    event.metadata = Object.fromEntries(
      Object.entries(partial.metadata)
        .slice(0, 8)
        .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 120) : value]),
    );
  }
  return event;
}

/** Queue one event. Returns true when it was queued; never throws. */
export function captureTelemetry(partial) {
  try {
    if (!enabled) return false;
    const event = normalize(partial);
    if (!event || !event.eventType) {
      counters.dropped += 1;
      return false;
    }
    queue.push(event);
    counters.captured += 1;
    if (queue.length > MAX_QUEUE) {
      queue = queue.slice(queue.length - MAX_QUEUE);
      counters.dropped += 1;
    }
    scheduleFlush();
    return true;
  } catch {
    counters.dropped += 1;
    return false;
  }
}

function scheduleFlush(delay = FLUSH_DELAY_MS) {
  try {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      flushTelemetry();
    }, delay);
    if (timer?.unref) timer.unref();
  } catch {
    /* scheduling failure must never propagate */
  }
}

/** Send queued events. Resolves to { sent, failed }; never rejects. */
export async function flushTelemetry() {
  try {
    if (!queue.length) return { sent: 0, failed: 0 };
    const events = queue.splice(0, MAX_BATCH);
    const body = JSON.stringify({ events });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) {
        counters.sent += events.length;
        return { sent: events.length, failed: 0 };
      }
    }

    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    });
    counters.sent += events.length;
    return { sent: events.length, failed: 0 };
  } catch {
    counters.failed += 1;
    return { sent: 0, failed: 1 };
  }
}

export function captureAdminSession() {
  return captureTelemetry({
    eventType: "session.start",
    feature: "other",
    outcome: "success",
    surface: "admin",
    metadata: { surface: "admin-dashboard" },
  });
}

export function setTelemetryEnabled(value) {
  enabled = Boolean(value);
  return enabled;
}

export function telemetryStatus() {
  return { ...counters, queued: queue.length, enabled };
}

export function resetTelemetryForTests() {
  queue = [];
  if (timer) clearTimeout(timer);
  timer = null;
  counters.captured = 0;
  counters.sent = 0;
  counters.failed = 0;
  counters.dropped = 0;
  enabled = true;
}
