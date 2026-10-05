/** advisoryStore.test.js — Phase 2: conversation memory stays bounded. */
import { describe, it, expect } from "vitest";
import { boundMessages, MAX_CHAT_MESSAGES } from "./advisoryStore.js";

describe("advisoryStore memory bound", () => {
  it("exposes a sane cap", () => {
    expect(MAX_CHAT_MESSAGES).toBe(100);
  });
  it("passes short histories through untouched", () => {
    const msgs = [{ id: 1 }, { id: 2 }];
    expect(boundMessages(msgs)).toEqual(msgs);
  });
  it("drops oldest first on long conversations, preserving order and meaning", () => {
    const msgs = Array.from({ length: 250 }, (_, i) => ({ id: i, text: `m${i}` }));
    const out = boundMessages(msgs);
    expect(out).toHaveLength(MAX_CHAT_MESSAGES);
    expect(out[0].id).toBe(150); // most recent 100 kept
    expect(out[out.length - 1].id).toBe(249);
    expect(out.map((m) => m.text)).toEqual(msgs.slice(-100).map((m) => m.text));
  });
  it("tolerates non-array input", () => {
    expect(boundMessages(null)).toEqual([]);
    expect(boundMessages(undefined)).toEqual([]);
  });
});
