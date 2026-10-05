/**
 * useAdvisory.test.js — Phase 2: location is explicit-or-unknown, never invented.
 * - buildAdvisoryContext forwards an explicit district, drops anything else
 * - no hardcoded default district may exist in app source (regression scan)
 */
/* global process: readonly */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAdvisoryContext } from "./useAdvisory.js";

describe("advisory location handling", () => {
  it("forwards an explicit district, otherwise omits it", () => {
    expect(buildAdvisoryContext({ district: "Madurai", crop: "rice" })).toEqual({ district: "Madurai", crop: "rice" });
    expect(buildAdvisoryContext({})).toEqual({});
    expect(buildAdvisoryContext()).toEqual({});
    expect(buildAdvisoryContext({ district: "   " })).toEqual({});
  });

  it("contains no hardcoded district default on the advisory path", () => {
    // Advisory path only: vendor listings (DronePage) and input placeholders
    // elsewhere legitimately name cities; the chat context must not.
    const advisoryFiles = [
      "hooks/useAdvisory.js",
      "store/advisoryStore.js",
      "services/api/advisoryService.js",
      "pages/AskPage.jsx",
      "services/ai/aiRouter.js",
      "services/ai/IndexedDBChatbotEngine.js",
    ];
    const hits = advisoryFiles.filter((rel) =>
      /coimbatore/i.test(readFileSync(join(process.cwd(), "src", rel), "utf8")),
    );
    expect(hits).toEqual([]);
  });
});
