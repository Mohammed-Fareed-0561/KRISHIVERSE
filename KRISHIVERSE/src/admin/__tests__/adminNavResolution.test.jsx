/**
 * Admin navigation must never grow the URL.
 *
 * The admin surface is mounted at `/admin/*`, and React Router resolves
 * relative `to` values against the *current* path inside a splat route — so a
 * relative `to="health"` on `/admin/health` becomes `/admin/health/health`,
 * the catch-all redirects relative to that, and the path runs away
 * (`/admin/health/health/health/...`) until the browser hangs. Every admin
 * target is therefore absolute: `/admin/<section>`.
 */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MemoryRouter, Navigate, Route, Routes, useLocation, useResolvedPath } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";

const SOURCE = readFileSync("src/admin/AdminApp.jsx", "utf8");

afterEach(cleanup);

function PathProbe() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function ResolvedProbe() {
  const resolved = useResolvedPath("/admin/health");
  return <div data-testid="resolved">{resolved.pathname}</div>;
}

function AdminShell() {
  return (
    <Routes>
      <Route index element={<Navigate to="/admin/health" replace />} />
      <Route path="health" element={<PathProbe />} />
      <Route path="*" element={<Navigate to="/admin/health" replace />} />
    </Routes>
  );
}

function renderAt(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/admin/*" element={<AdminShell />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("admin navigation resolution", () => {
  it("declares every nav and redirect target as an absolute /admin path", () => {
    const navTargets = [...SOURCE.matchAll(/\bto:\s*"([^"]+)"/g)].map((match) => match[1]);
    expect(navTargets.length).toBeGreaterThanOrEqual(17);
    for (const target of navTargets) {
      expect(target.startsWith("/admin/"), `${target} must be absolute`).toBe(true);
    }

    const redirectTargets = [...SOURCE.matchAll(/<Navigate\s+to="([^"]+)"/g)].map((match) => match[1]);
    expect(redirectTargets.length).toBeGreaterThanOrEqual(2);
    for (const target of redirectTargets) {
      expect(target.startsWith("/admin/"), `${target} must be absolute`).toBe(true);
    }
  });

  it("resolves an absolute target to itself, even from a deep path", () => {
    render(
      <MemoryRouter initialEntries={["/admin/health/health"]}>
        <Routes>
          <Route
            path="/admin/*"
            element={
              <Routes>
                <Route path="*" element={<ResolvedProbe />} />
              </Routes>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("resolved").textContent).toBe("/admin/health");
  });

  it("lands on /admin/health from /admin", async () => {
    renderAt("/admin");
    const el = await screen.findByTestId("path", {}, { timeout: 2000 });
    expect(el.textContent).toBe("/admin/health");
  });

  it("recovers a runaway deep path back to /admin/health instead of growing", async () => {
    renderAt("/admin/health/health/health");
    const el = await screen.findByTestId("path", {}, { timeout: 2000 });
    expect(el.textContent).toBe("/admin/health");
  });
});
