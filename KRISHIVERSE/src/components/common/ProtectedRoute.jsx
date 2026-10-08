import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

/**
 * Wraps a route that requires authentication.
 * Redirects to /login, preserving the intended destination.
 *
 * `requireOnboarding={false}` lets an authenticated farmer reach the wizard
 * (or re-enter it) instead of being bounced back to it from every route.
 *
 * Usage in App.jsx:
 *   <Route path="/ask" element={<ProtectedRoute><AskPage /></ProtectedRoute>} />
 *   <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><OnboardingPage /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { isAuthenticated, isOnboardingRequired } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireOnboarding && isOnboardingRequired) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

