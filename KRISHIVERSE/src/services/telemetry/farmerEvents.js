/**
 * Client-side auth / onboarding telemetry adapter.
 *
 * This is the ONLY farmer-runtime module allowed to reference the telemetry
 * client (see src/admin/__tests__/isolation.test.js). Pages and stores must go
 * through these helpers so the emitted set stays on an allow-list and the
 * client never double-counts an event the server already owns.
 *
 * Server-owned (emitted by the API, never here): signup/login success and
 * failure, logout, verification success/failure, reset success, onboarding
 * step progress, and onboarding completion.
 * Client-owned (emitted here): the *_started events and onboarding abandonment.
 */
import { captureTelemetry } from "./telemetryClient";

export const CLIENT_EVENT_TYPES = Object.freeze([
  "auth.signup_started",
  "auth.verification_started",
  "auth.reset_started",
  "onboarding.started",
  "onboarding.abandoned",
]);

function connectivity() {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return undefined;
  return navigator.onLine ? "online" : "offline";
}

function emit(eventType, { feature, outcome = "success", errorCode, language, metadata } = {}) {
  if (!CLIENT_EVENT_TYPES.includes(eventType)) return false;
  return captureTelemetry({
    eventType,
    feature,
    outcome,
    errorCode,
    language,
    metadata,
    connectivity: connectivity(),
  });
}

/** Auth flow entered by the farmer (before the server sees anything). */
export function captureAuthEvent(eventType, options = {}) {
  return emit(eventType, { ...options, feature: "auth" });
}

/** Onboarding progress signals only the browser can observe. */
export function captureOnboardingEvent(eventType, options = {}) {
  return emit(eventType, { ...options, feature: "onboarding" });
}
