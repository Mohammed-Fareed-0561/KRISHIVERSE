/* global process */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "admin" || entry === "__tests__") continue;
      walk(full, files);
    } else if (/\.(js|jsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function read(file) {
  return readFileSync(file, "utf8");
}

describe("admin / farmer isolation", () => {
  const farmerFiles = walk(SRC);

  it("farmer runtime files never import the admin dashboard", () => {
    const offenders = farmerFiles.filter((file) => /from\s+["'][^"']*\/admin\//.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it("farmer runtime files never import adminApi or session context", () => {
    const offenders = farmerFiles.filter(
      (file) => /from\s+["'][^"']*adminApi["']/.test(read(file)) || /sessionContext/.test(read(file)),
    );
    expect(offenders).toEqual([]);
  });

  it("farmer runtime reaches telemetry only through the allow-listed adapter", () => {
    // Auth/onboarding instrumentation (spec 3C) needs client-side events, so a
    // single dedicated adapter is permitted; every other farmer file must keep
    // its hands off the telemetry client.
    const ADAPTER = join(SRC, "services", "telemetry", "farmerEvents.js");
    const offenders = farmerFiles.filter((file) => file !== ADAPTER && /telemetryClient/.test(read(file)));
    expect(offenders).toEqual([]);
    const adapter = read(ADAPTER);
    expect(adapter).toContain("CLIENT_EVENT_TYPES");
    expect(adapter).toContain("auth.signup_started");
    expect(adapter).not.toContain("auth.login_success");
    expect(adapter).not.toContain("onboarding.completed");
  });

  it("the admin surface is mounted exactly once, behind a lazy boundary", () => {
    const app = read(join(SRC, "App.jsx"));
    expect(app).toContain('lazy(() => import("./admin/AdminApp"))');
    expect(app).toContain('lazy(() => import("./admin/AdminBoundary"))');
    expect(app.match(/path="\/admin\/\*"/g)).toHaveLength(1);
  });

  it("the admin bundle entry is isolated from farmer services", () => {
    const adminRoot = join(SRC, "admin");
    const files = readdirSync(adminRoot).filter((name) => statSync(join(adminRoot, name)).isFile());
    expect(files).toContain("AdminApp.jsx");
    expect(files).toContain("adminApi.js");
    const adminApp = read(join(adminRoot, "AdminApp.jsx"));
    expect(adminApp).not.toContain("../services/ai/");
    expect(adminApp).not.toContain("../services/db/");
    expect(adminApp).not.toContain("IndexedDBChatbotEngine");
    expect(adminApp).not.toContain("ResponseValidator");
  });

  it("telemetry client only talks to the admin telemetry endpoint", () => {
    const client = read(join(SRC, "services", "telemetry", "telemetryClient.js"));
    expect(client).toContain("/admin/telemetry/batch");
    expect(client).not.toContain("/api/v1/");
    expect(client).not.toContain("localStorage");
  });

  it("no farmer page renders admin sections", () => {
    const pages = readdirSync(join(SRC, "pages"));
    expect(pages.some((name) => /admin/i.test(name))).toBe(false);
    for (const page of pages) {
      const file = join(SRC, "pages", page);
      if (!statSync(file).isFile()) continue;
      expect(read(file)).not.toMatch(/from\s+["'][^"']*admin\//);
    }
    expect(relative(SRC, join(SRC, "admin")).split(sep).join("/")).toBe("admin");
  });
});
