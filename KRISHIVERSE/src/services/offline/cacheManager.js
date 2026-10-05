export function nowMs() {
  return Date.now();
}

export function isExpired(fetchedAtMs, ttlMs) {
  if (!fetchedAtMs || !ttlMs) return true;
  return nowMs() - fetchedAtMs > ttlMs;
}

export function hoursToMs(hours) {
  return Math.max(0, hours) * 60 * 60 * 1000;
}

export function daysToMs(days) {
  return Math.max(0, days) * 24 * 60 * 60 * 1000;
}
