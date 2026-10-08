import { describe, expect, it } from "vitest";

/**
 * Import-surface smoke test: every admin module must parse and evaluate.
 * Rendering tests only touch a handful of modules; this guards the rest
 * against syntax errors (e.g. bad import rewriting) that would otherwise
 * only surface in the browser at first navigation.
 */

const rootModules = import.meta.glob("../*.jsx");
const sectionModules = import.meta.glob("../sections/*.jsx");
const componentModules = import.meta.glob("../components/*.jsx");
const allModules = { ...rootModules, ...sectionModules, ...componentModules };

describe("admin module import surface", () => {
  it("covers the expected module count", () => {
    expect(Object.keys(allModules).length).toBeGreaterThanOrEqual(16);
  });

  for (const [path, loader] of Object.entries(allModules)) {
    it(`parses and evaluates ${path.replace(/^\.\.\//, "")}`, async () => {
      const mod = await loader();
      expect(mod).toBeTruthy();
    }, 60000);
  }

  it("every section module has at least one export", async () => {
    for (const [path, loader] of Object.entries(sectionModules)) {
      const mod = await loader();
      const exports = Object.keys(mod);
      expect(exports.length, `${path} exported nothing`).toBeGreaterThan(0);
    }
  });
});
