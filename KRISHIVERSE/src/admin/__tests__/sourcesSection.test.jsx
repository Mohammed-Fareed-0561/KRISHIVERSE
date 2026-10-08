import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SourcesSection from "../sections/SourcesSection";

const state = vi.hoisted(() => ({
  quarantineReasons: [
    { name: "missing-url", count: 4 },
    { name: "unverified", count: 2 },
  ],
}));

vi.mock("../useAdminData", () => ({
  useAdminData: () => ({
    data: {
      label: "KB BUILD STATE (from on-disk records)",
      note: "Scanned from src/data/kb/v2/*.json on disk; cached for 5 minutes.",
      sources: {
        total: 6,
        byFile: { "treatments.json": 6 },
        bySource: [{ name: "ICAR handbook", count: 4 }],
        byOrganization: [{ name: "ICAR", count: 4 }],
        byRecordKind: { treatment: 6 },
        byStatus: { active: 6 },
        provenance: {
          withSource: 5,
          withSourceUrl: 4,
          verified: 3,
          quarantineReasons: state.quarantineReasons,
          citationAvailabilityPct: 67,
          verifiedPct: 50,
        },
        freshness: { never: 0, last30d: 6, last90d: 0, last365d: 0, older: 0 },
        duplicates: {
          duplicateRecords: 0,
          duplicateGroups: 0,
          sample: [],
          method: "duplicate = identical name + linked crop/disease within a record file",
        },
        dosage: { total: 6, withProvenance: 3 },
        cacheTtlMs: 300000,
      },
    },
    error: null,
    loading: false,
    refresh: () => {},
  }),
}));

afterEach(() => {
  cleanup();
  state.quarantineReasons = [
    { name: "missing-url", count: 4 },
    { name: "unverified", count: 2 },
  ];
});

describe("sources section rendering", () => {
  it("renders backend topEntries arrays without crashing", () => {
    render(<SourcesSection />);

    expect(screen.getByText("Quarantine reasons")).toBeInTheDocument();
    const reason = screen.getByText("missing-url");
    expect(reason.closest("li")).toHaveTextContent("4");

    const org = screen.getByText("ICAR");
    expect(org.closest("li")).toHaveTextContent("4");

    expect(screen.getByText("treatment")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("renders an empty state when no quarantine reasons were recorded", () => {
    state.quarantineReasons = [];
    render(<SourcesSection />);
    const empties = screen.getAllByTestId("empty-state");
    expect(empties.some((el) => /Reasons: none recorded/i.test(el.textContent))).toBe(true);
  });
});
