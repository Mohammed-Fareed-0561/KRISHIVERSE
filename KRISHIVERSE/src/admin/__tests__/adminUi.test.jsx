import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import axios from "axios";
import { ADMIN_BASE, adminLogin, adminSession, adminLogout, can } from "../adminApi";
import AdminBoundary from "../AdminBoundary";
import { CountList, DataTable, EmptyState, EvalBadge, Metric, NotCapturedList, Panel, ProdBadge } from "../components/ui";

vi.mock("axios", () => {
  const instance = {
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    get: vi.fn(),
    post: vi.fn(),
  };
  return { default: { create: vi.fn(() => instance), post: vi.fn(), get: vi.fn() } };
});

describe("admin session and permissions", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("derives the admin base from the farmer api base", () => {
    expect(ADMIN_BASE.endsWith("/admin")).toBe(true);
    expect(ADMIN_BASE).not.toContain("/v1/admin");
  });

  it("rejects a farmer account at login", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { token: "t", user: { id: "1", email: "f@x", role: "farmer" } },
    });
    await expect(adminLogin("f@x", "pw")).rejects.toMatchObject({ status: 403, code: "forbidden" });
    expect(adminSession()).toBeNull();
  });

  it("stores an admin session and clears it on logout", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { token: "t", user: { id: "1", email: "a@x", role: "superadmin" } },
    });
    const result = await adminLogin("a@x", "pw");
    expect(result.role).toBe("superadmin");
    expect(adminSession()).toMatchObject({ role: "superadmin" });

    await adminLogout();
    expect(adminSession()).toBeNull();
  });

  it("permission checks are role-table driven", () => {
    expect(can(["admin:read", "admin:ops"], "admin:ops")).toBe(true);
    expect(can(["admin:read"], "admin:rollback")).toBe(false);
    expect(can(undefined, "admin:read")).toBe(false);
  });
});

describe("admin UI primitives", () => {
  afterEach(() => cleanup());

  it("evaluation badge carries the mandatory label", () => {
    render(<EvalBadge />);
    expect(screen.getByTestId("eval-badge")).toHaveTextContent(/Evaluation dataset — not live farmer accuracy/i);
  });

  it("production badge distinguishes telemetry from evaluation", () => {
    render(<ProdBadge />);
    expect(screen.getByText(/Production telemetry/i)).toBeInTheDocument();
  });

  it("panels render title, children and notes", () => {
    render(
      <Panel title="Chatbot" badge={<ProdBadge />} note="window note">
        <div>content</div>
      </Panel>,
    );
    expect(screen.getByText("Chatbot")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText("window note")).toBeInTheDocument();
  });

  it("empty state explains that there is no data", () => {
    render(<EmptyState message="No production telemetry recorded." />);
    expect(screen.getByTestId("empty-state")).toHaveTextContent("No production telemetry recorded.");
  });

  it("metrics render em dash for missing values", () => {
    render(<Metric label="p95" value={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("data tables render rows and handle empty input", () => {
    const { rerender } = render(
      <DataTable columns={[{ key: "name", label: "Name" }]} rows={[{ id: "a", name: "blast" }]} />,
    );
    expect(screen.getByText("blast")).toBeInTheDocument();
    rerender(<DataTable columns={[{ key: "name", label: "Name" }]} rows={[]} empty="nothing here" />);
    expect(screen.getByTestId("empty-state")).toHaveTextContent("nothing here");
  });

  it("count lists visualise categorical counts", () => {
    render(<CountList title="Rules" counts={{ numeric_dosage: 3 }} />);
    expect(screen.getByText("numeric_dosage")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("not-measured list explains why a metric is absent", () => {
    render(<NotCapturedList items={[{ metric: "production accuracy", reason: "Production traffic is unlabelled." }]} />);
    expect(screen.getByText(/production accuracy/)).toBeInTheDocument();
    expect(screen.getByText(/unlabelled/)).toBeInTheDocument();
  });

  it("panels never render evaluation numbers as production", () => {
    render(
      <Panel title="Crop Doctor — evaluation" badge={<EvalBadge />}>
        <Metric label="top-1" value="95%" />
      </Panel>,
    );
    expect(screen.getByTestId("eval-badge")).toBeInTheDocument();
    expect(screen.queryByText("Production telemetry")).not.toBeInTheDocument();
  });
});

describe("admin render isolation", () => {
  afterEach(() => cleanup());

  it("contains a dashboard render failure instead of bubbling to the farmer app", () => {
    const Bomb = () => {
      throw new Error("panel exploded");
    };
    render(
      <AdminBoundary>
        <Bomb />
      </AdminBoundary>,
    );
    expect(screen.getByText(/Admin dashboard failed to render/i)).toBeInTheDocument();
    expect(screen.getByText(/Farmer-facing features are unaffected/i)).toBeInTheDocument();
  });

  it("renders children normally when nothing throws", () => {
    render(
      <AdminBoundary>
        <div>ok</div>
      </AdminBoundary>,
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
