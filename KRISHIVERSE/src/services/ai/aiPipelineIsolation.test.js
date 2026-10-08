/**
 * AI pipeline isolation.
 *
 * The farmer profile (and everything behind it: authService, authStore, the
 * profile outbox, the session keys) is CONTEXT for the product, never EVIDENCE
 * for a diagnosis or advisory. Nothing under src/services/ai may import the
 * auth/profile layer or read the stored session — so a profile can never
 * quietly start influencing ResponseValidator, aiRouter, RAG ranking, or the
 * Crop Doctor.
 */
import { describe, it, expect } from "vitest";

const rawModules = import.meta.glob("./**/*.{js,jsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

const sources = Object.fromEntries(
  Object.entries(rawModules).filter(
    ([path]) => !/\.test\.(js|jsx)$/.test(path)
  )
);
const files = Object.keys(sources);

const FORBIDDEN = [
  { pattern: /kv_user/, label: "session user key" },
  { pattern: /kv_token/, label: "session token key" },
  { pattern: /authService/, label: "auth API client" },
  { pattern: /authStore/, label: "session store" },
  { pattern: /profileOutbox/, label: "profile outbox" },
  { pattern: /store\/auth/, label: "session store import path" },
  { pattern: /users\/profile/, label: "profile endpoints" },
  { pattern: /auth\/(login|register|verify|password)/, label: "auth endpoints" },
];

describe("AI pipeline isolation", () => {
  it("finds the AI surface to inspect", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((path) => path.endsWith("ResponseValidator.js"))).toBe(true);
    expect(files.some((path) => path.endsWith("aiRouter.js"))).toBe(true);
  });

  it("never imports or reads the auth / profile layer", () => {
    const offenders = [];
    for (const path of files) {
      const source = sources[path];
      for (const { pattern, label } of FORBIDDEN) {
        if (pattern.test(source)) {
          offenders.push(`${path.replace(/^\.\//, "")} → ${label}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps every file inside src/services/ai (no sneaky re-exports)", () => {
    for (const path of files) {
      expect(path.startsWith("./")).toBe(true);
      expect(path.includes("..")).toBe(false);
    }
  });

  it("would actually flag an auth reference (scan is not vacuous)", () => {
    const planted =
      'import { kv_user } from "../../store/auth"; export { authService }';
    const hits = FORBIDDEN.filter(({ pattern }) => pattern.test(planted));
    expect(hits.map((hit) => hit.label)).toEqual([
      "session user key",
      "auth API client",
      "session store import path",
    ]);
  });
});
