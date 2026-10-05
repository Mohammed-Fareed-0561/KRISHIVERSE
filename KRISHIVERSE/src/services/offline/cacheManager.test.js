import { describe, expect, it, vi } from "vitest";
import { hoursToMs, isExpired } from "./cacheManager";

describe("cacheManager", () => {
  it("converts hours to ms", () => {
    expect(hoursToMs(1)).toBe(60 * 60 * 1000);
  });

  it("treats missing fetchedAt as expired", () => {
    expect(isExpired(undefined, 1000)).toBe(true);
  });

  it("expires after ttl", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const fetchedAt = Date.now() - 2000;
    expect(isExpired(fetchedAt, 1000)).toBe(true);
    vi.useRealTimers();
  });
});
