import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  captureTelemetry, captureAdminSession, flushTelemetry, resetTelemetryForTests,
  setTelemetryEnabled, telemetryStatus,
} from "../telemetryClient";

function event(overrides = {}) {
  return { eventType: "chatbot.response", feature: "chatbot", ...overrides };
}

describe("telemetry client", () => {
  beforeEach(() => {
    resetTelemetryForTests();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 202 }));
  });

  afterEach(() => {
    resetTelemetryForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("captures events without throwing and normalises required fields", () => {
    expect(captureTelemetry(event())).toBe(true);
    const status = telemetryStatus();
    expect(status.captured).toBe(1);
    expect(status.queued).toBe(1);
  });

  it("never throws on hostile input", () => {
    expect(captureTelemetry(null)).toBe(false);
    expect(captureTelemetry("nope")).toBe(false);
    expect(captureTelemetry({})).toBe(false);
    expect(captureTelemetry(event({ eventType: 42 }))).toBe(false);
    expect(() => captureTelemetry(undefined)).not.toThrow();
  });

  it("does not queue raw farmer text fields", () => {
    captureTelemetry(event({ answer: "spray 3 g per litre", message: "my leaves are yellow" }));
    const status = telemetryStatus();
    expect(status.captured).toBe(1);

    flushTelemetry();
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.events[0]).not.toHaveProperty("answer");
    expect(body.events[0]).not.toHaveProperty("message");
    expect(JSON.stringify(body)).not.toContain("leaves are yellow");
  });

  it("truncates labels instead of rejecting the whole event", () => {
    captureTelemetry(event({ intent: "x".repeat(200), metadata: { note: "y".repeat(500) } }));
    flushTelemetry();
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.events[0].intent.length).toBeLessThanOrEqual(64);
    expect(body.events[0].metadata.note.length).toBeLessThanOrEqual(120);
  });

  it("batches to the endpoint as a JSON envelope", async () => {
    captureTelemetry(event({ requestId: "r1" }));
    captureTelemetry(event({ requestId: "r2" }));
    const result = await flushTelemetry();
    expect(result.sent).toBe(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toContain("/admin/telemetry/batch");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.events).toHaveLength(2);
    expect(body.events[0].schemaVersion).toBe(1);
    expect(telemetryStatus().sent).toBe(2);
    expect(telemetryStatus().queued).toBe(0);
  });

  it("does not enqueue anything when disabled", () => {
    setTelemetryEnabled(false);
    expect(captureTelemetry(event())).toBe(false);
    expect(telemetryStatus().queued).toBe(0);
    setTelemetryEnabled(true);
  });

  it("swallows network failures without rejecting", async () => {
    globalThis.fetch.mockRejectedValue(new Error("offline"));
    captureTelemetry(event());
    const result = await flushTelemetry();
    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(telemetryStatus().failed).toBe(1);
  });

  it("admin session capture is a schema-valid session.start event", async () => {
    captureAdminSession();
    await flushTelemetry();
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.events[0].eventType).toBe("session.start");
    expect(body.events[0].source.surface).toBe("admin");
    expect(body.events[0].sessionId).toMatch(/^s-/);
  });

  it("caps the queue so a stalled network cannot grow memory unbounded", () => {
    for (let index = 0; index < 500; index += 1) captureTelemetry(event({ requestId: `r${index}` }));
    expect(telemetryStatus().queued).toBeLessThanOrEqual(200);
  });
});
