/** Auth surfaces: public pages render, guards redirect, verification stays open. */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n from "../../i18n/i18n";
import { useAuthStore } from "../../store/authStore";
import ProtectedRoute from "../../components/common/ProtectedRoute";
import LoginPage from "../LoginPage";
import RegisterPage from "../RegisterPage";
import WelcomePage from "../WelcomePage";
import ForgotPasswordPage from "../ForgotPasswordPage";
import ResetPasswordPage from "../ResetPasswordPage";
import VerifyEmailPage from "../VerifyEmailPage";

function renderAt(ui, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

function setSession({ user = null, token = null, onboardingRequired = false } = {}) {
  useAuthStore.setState({
    user,
    token,
    isAuthenticated: Boolean(token),
    isOnboardingRequired: onboardingRequired,
    loading: false,
    error: null,
  });
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  setSession();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("public auth pages", () => {
  it("offers sign-in, registration, recovery, and verification entry points", () => {
    renderAt(<LoginPage />, "/login");

    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot");
    expect(screen.getByRole("link", { name: "Verify your email" })).toHaveAttribute("href", "/verify");
  });

  it("validates the sign-in form before touching the network", () => {
    renderAt(<LoginPage />, "/login");

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
  });

  it("leads with the privacy promise on registration", () => {
    renderAt(<RegisterPage />, "/register");

    expect(screen.getByText(/No Aadhaar, bank or financial details/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
  });

  it("lets a farmer keep exploring signed out", () => {
    renderAt(<WelcomePage />, "/welcome");

    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Continue without an account" })).toHaveAttribute("href", "/");
  });

  it("accepts a reset request", () => {
    renderAt(<ForgotPasswordPage />, "/forgot");
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("hides the token field when the emailed link already carries it", () => {
    renderAt(<ResetPasswordPage />, "/reset?token=abc");
    expect(screen.queryByLabelText(/Reset token/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/New password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeEnabled();
  });

  it("asks for a token when the farmer opens the page directly", () => {
    renderAt(<ResetPasswordPage />, "/reset");
    expect(screen.getByLabelText(/Reset token/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeDisabled();
  });

  it("keeps verification reachable from an emailed link", () => {
    renderAt(<VerifyEmailPage />, "/verify");
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send code/i })).toBeInTheDocument();
  });
});

describe("ProtectedRoute", () => {
  it("sends signed-out farmers to sign-in and remembers where they were going", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div>profile-body</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText("profile-body")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toBeInTheDocument();
    // LoginPage reads location.state.from and restores it after a successful login.
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("blocks the app until onboarding is done", () => {
    setSession({ token: "jwt", user: { id: "u1" }, onboardingRequired: true });

    render(
      <MemoryRouter initialEntries={["/weather"]}>
        <Routes>
          <Route
            path="/weather"
            element={
              <ProtectedRoute>
                <div>weather-body</div>
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding" element={<div>onboarding-body</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText("weather-body")).not.toBeInTheDocument();
    expect(screen.getByText("onboarding-body")).toBeInTheDocument();
  });

  it("lets the wizard itself render mid-flow (requireOnboarding={false})", () => {
    setSession({ token: "jwt", user: { id: "u1" }, onboardingRequired: true });

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireOnboarding={false}>
                <div>onboarding-body</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>login-body</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("onboarding-body")).toBeInTheDocument();
    expect(screen.queryByText("login-body")).not.toBeInTheDocument();
  });

  it("redirects authenticated farmers straight to their profile", () => {
    setSession({ token: "jwt", user: { id: "u1", onboarding: { completedAt: "2026-01-01" } } });

    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div>profile-body</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>login-body</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("profile-body")).toBeInTheDocument();
    expect(screen.queryByText("login-body")).not.toBeInTheDocument();
  });
});
