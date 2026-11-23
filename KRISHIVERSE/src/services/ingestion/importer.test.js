/**
 * ingestion/importer.test.js — Phase 3C ingestion repair regression.
 * The CJS→ESM breakage, front-matter bugs, and single-object drops each made
 * the authoritative pipeline silently produce zero records. All locked here.
 */
import { describe, it, expect } from "vitest";
import {
  detectFormat,
  attemptParse,
  parseDocument,
  parseCSV,
  parseMarkdown,
} from "./importer.js";
import { normalizeRecord } from "./normalizer.js";
import { validateRecord } from "./validator.js";

describe("ingestion importer (Phase 3C repair)", () => {
  it("detects front-matter-only markdown", () => {
    expect(detectFormat("---\nid: x\n---\n\nBody")).toBe("markdown");
  });

  it("parses YAML front matter without dropping the first field", () => {
    const out = parseMarkdown("---\nid: x1\nname: Test Blight\n---\n\nBody text here");
    expect(out.data).toHaveLength(1);
    expect(out.data[0].id).toBe("x1");
    expect(out.data[0].name).toBe("Test Blight");
  });

  it("converts verified true/false strings to booleans", () => {
    const out = parseMarkdown("---\nid: x1\nverified: false\n---\n\nBody");
    expect(out.data[0].verified).toBe(false);
    const out2 = parseMarkdown("---\nid: x2\nverified: true\n---\n\nBody");
    expect(out2.data[0].verified).toBe(true);
  });

  it("parses CRLF YAML front matter and preserves boolean types", () => {
    const out = parseMarkdown("---\r\nid: x1\r\nverified: true\r\n---\r\n\r\nBody");
    expect(out.data).toHaveLength(1);
    expect(out.data[0].verified).toBe(true);
  });

  it("preserves a real document source over the markdown placeholder", () => {
    const out = parseMarkdown("---\nid: x1\nsource: TNAU Test\n---\n\nBody");
    expect(out.data[0].source).toBe("TNAU Test");
  });

  it("normalizes single-object JSON docs to one record", () => {
    const out = attemptParse(JSON.stringify({ id: "a", name: "A" }));
    expect(out.data).toHaveLength(1);
    expect(parseCSV("id,name\n1,Two").data).toHaveLength(1);
  });

  it("parseDocument rejects empty input", () => {
    expect(parseDocument("")).toBeNull();
    expect(parseDocument("   ")).toBeNull();
  });
});

describe("ingestion provenance safety", () => {
  it("normalizer never invents verification", () => {
    const r = normalizeRecord({ id: "x", name: "X" }, "disease", "TNAU Test");
    expect(r.verified).not.toBe(true);
    expect(r.source).toBe("TNAU Test");
  });

  it("validator rejects verified-without-provenance", () => {
    const res = validateRecord(
      { id: "x", name: "X", recordKind: "treatment", verified: true, source: null, sourceUrl: null },
      [], [],
    );
    expect(res.valid).toBe(false);
  });
});
