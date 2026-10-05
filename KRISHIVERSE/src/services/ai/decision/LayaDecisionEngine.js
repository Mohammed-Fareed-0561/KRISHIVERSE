/**
 * LayaDecisionEngine.js
 *
 * Backend-only Laya client (Phase 1). The browser NEVER loads a Laya
 * checkpoint — the model (hundreds of MB) stays on the server.
 *
 * Contract:
 *   - Only called when ONLINE (the orchestrator enforces OFFLINE → never call).
 *   - POST {apiBase}/decision/laya with { task, state, candidates, evidence }.
 *   - 8s timeout; any network error / timeout / malformed body → throw a
 *     LAYA_UNAVAILABLE error so DecisionEngine falls back to Local silently.
 *   - Output is re-normalized via decisionSchemas — raw Laya fields never leak.
 */

import { appConfig } from "../../config/appConfig";
import { getConnectivityState, CONNECTIVITY_STATES } from "../connectivity";
import { normalizeDecision, validateDecisionRequest } from "./decisionSchemas";

export const LAYA_ENGINE_NAME = "laya";
export const LAYA_TIMEOUT_MS = 8000;

export class LayaUnavailableError extends Error {
  constructor(message = "Laya unavailable") {
    super(message);
    this.name = "LayaUnavailableError";
    this.code = "LAYA_UNAVAILABLE";
  }
}

function endpoint() {
  return `${String(appConfig.apiBase).replace(/\/+$/, "")}/decision/laya`;
}

async function postDecision(payload, { timeoutMs = LAYA_TIMEOUT_MS, fetcher = globalThis.fetch } = {}) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetcher(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
    if (!res || typeof res.status !== "number") throw new LayaUnavailableError("No response from Laya backend");
    if (res.status < 200 || res.status >= 300) throw new LayaUnavailableError(`Laya backend HTTP ${res.status}`);
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") throw new LayaUnavailableError("Malformed Laya response");
    return data;
  } catch (err) {
    if (err && err.code === "LAYA_UNAVAILABLE") throw err;
    const aborted = err && (err.name === "AbortError" || err.name === "TimeoutError");
    throw new LayaUnavailableError(aborted ? "Laya request timed out" : `Laya request failed: ${err?.message || err}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const LayaDecisionEngine = {
  name: LAYA_ENGINE_NAME,
  supportedTasks: ["intent_classification", "clarification", "candidate_selection"],
  isEnabled() {
    return (import.meta.env.VITE_ENABLE_LAYA_DECISIONS ?? "false") === "true";
  },
  async decide({ task, state = {}, candidates = [], evidence = [] } = {}, opts = {}) {
    validateDecisionRequest({ task, state, candidates, evidence });
    if (getConnectivityState() === CONNECTIVITY_STATES.OFFLINE) {
      throw new LayaUnavailableError("Offline — Laya must not be called");
    }
    const raw = await postDecision({ task, state, candidates, evidence }, opts);
    // Backend already normalizes; re-normalize defensively in case of drift.
    // Preserve the backend engine label when it is a genuine laya engine tag
    // (e.g. "laya-multilingual" vs the "laya-builtin-decider" placeholder) so
    // callers can tell model intelligence apart from deterministic fallback.
    const backendEngine = typeof raw.engine === "string" && raw.engine.startsWith("laya-")
      ? raw.engine
      : LAYA_ENGINE_NAME;
    return normalizeDecision({
      task,
      decision: raw.decision,
      confidence: typeof raw.confidence === "number" ? raw.confidence : null,
      needsClarification: Boolean(raw.needsClarification),
      clarification: raw.clarification || null,
      engine: backendEngine,
    });
  },
};

export default LayaDecisionEngine;
