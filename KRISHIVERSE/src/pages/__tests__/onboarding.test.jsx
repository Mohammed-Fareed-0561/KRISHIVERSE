/** Onboarding wizard — validation, step flow, persistence, abandonment. */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n from "../../i18n/i18n";
import { useAuthStore } from "../../store/authStore";
import OnboardingPage from "../OnboardingPage";
import { captureOnboardingEvent } from "../../services/telemetry/farmerEvents";

vi.mock("../../services/api/cropService", () => ({
  getCrops: vi.fn(() => Promise.resolve(["Rice", "Maize"])),
}));
vi.mock("../../services/telemetry/farmerEvents", () => ({
  captureAuthEvent: vi.fn(),
  captureOnboardingEvent: vi.fn(),
}));

const saveOnboarding = vi.fn(() =>
  Promise.resolve({ id: "u1", onboarding: { step: 1, startedAt: "2026-01-01" } })
);

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={["/onboarding"]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={<div data-testid="home-probe" />} />
        <Route path="/login" element={<div data-testid="login-probe" />} />
      </Routes>
    </MemoryRouter>
  );
}

function fillStep1() {
  fireEvent.change(screen.getByPlaceholderText("e.g. Coimbatore"), { target: { value: "Erode" } });
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.clearAllMocks();
  useAuthStore.setState({
    user: { id: "u1", email: "f@x.com", language: "ta" },
    token: "jwt",
    isAuthenticated: true,
    isOnboardingRequired: true,
    loading: false,
    error: null,
    saveOnboarding,
  });
});

afterEach(() => {
  cleanup();
});

describe("onboarding wizard", () => {
  it("announces progress accessibly on step one", () => {
    renderWizard();

    expect(screen.getByRole("heading", { name: "Language & district" })).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "6");
    expect(bar).toHaveAttribute("aria-label", "Onboarding progress");
    expect(captureOnboardingEvent).toHaveBeenCalledWith("onboarding.started");
  });

  it("refuses to advance without a district", () => {
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your district");
    expect(saveOnboarding).not.toHaveBeenCalled();
  });

  it("persists step one and moves to the farm step", async () => {
    renderWizard();
    fillStep1();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(saveOnboarding).toHaveBeenCalledTimes(1));
    const payload = saveOnboarding.mock.calls[0][0];
    expect(payload.step).toBe(1);
    expect(payload.profile.location).toMatchObject({ district: "Erode" });
    expect(payload.status).toBeUndefined();

    expect(await screen.findByRole("heading", { name: "Your farm" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("walks the whole wizard and finishes with status=completed", async () => {
    renderWizard();

    fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Your farm" });

    fireEvent.change(screen.getByPlaceholderText("Your village"), { target: { value: "Kumarapalayam" } });
    fireEvent.change(screen.getByLabelText("Farm size"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Your crops" });

    fireEvent.click(screen.getByRole("button", { name: "Rice" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Water & experience" });

    fireEvent.click(screen.getByRole("radio", { name: "Well" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Preferences" });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Review & finish" });

    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    // one save per step (1-5) plus the final save on Finish (6)
    await waitFor(() => expect(saveOnboarding.mock.calls.length).toBeGreaterThanOrEqual(6));
    const last = saveOnboarding.mock.calls.at(-1)[0];
    expect(last.step).toBe(6);
    expect(last.status).toBe("completed");
    expect(last.profile).toMatchObject({ village: "Kumarapalayam", crops: ["Rice"], irrigation: "well" });

    expect(await screen.findByTestId("home-probe")).toBeInTheDocument();
    expect(captureOnboardingEvent).not.toHaveBeenCalledWith("onboarding.abandoned", expect.anything());
  }, 15000);

  it("records abandonment when the farmer saves and exits early", async () => {
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /save & exit/i }));

    await waitFor(() => expect(saveOnboarding).toHaveBeenCalledTimes(1));
    expect(saveOnboarding.mock.calls[0][0]).toMatchObject({ status: "abandoned" });
    expect(await screen.findByTestId("home-probe")).toBeInTheDocument();
    expect(captureOnboardingEvent).toHaveBeenCalledWith(
      "onboarding.abandoned",
      expect.objectContaining({ metadata: expect.objectContaining({ step: 1 }) })
    );
  }, 10000);

  it("bounces signed-out visitors to sign-in", () => {
    useAuthStore.setState({ isAuthenticated: false, token: null, user: null });
    renderWizard();
    expect(screen.getByTestId("login-probe")).toBeInTheDocument();
  });
});
