import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

/**
 * Wraps a route that requires authentication.
 * Redirects to /login, preserving the intended destination.
 *
 * Usage in App.jsx:
 *   <Route path="/ask" element={<ProtectedRoute><AskPage /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isOnboardingRequired } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isOnboardingRequired) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

