import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowClockwiseIcon, LockKeyIcon, SignOutIcon } from "@phosphor-icons/react";
import { adminLogin, adminLogout, adminSession } from "./adminApi";
import { AdminSessionContext } from "./sessionContext";
import { useAdminData } from "./useAdminData";
import { ErrorNote, LoadingNote } from "./components/ui";
import { captureAdminSession } from "../services/telemetry/telemetryClient";

const SystemHealthSection = lazy(() => import("./sections/SystemHealthSection"));
const ChatbotSection = lazy(() => import("./sections/ChatbotSection"));
const RagSection = lazy(() => import("./sections/RagSection"));
const SafetySection = lazy(() => import("./sections/SafetySection"));
const CropDoctorSection = lazy(() => import("./sections/CropDoctorSection"));
const ModelSection = lazy(() => import("./sections/CropDoctorSection").then((module) => ({ default: module.ModelSection })));
const LanguageSection = lazy(() => import("./sections/LanguageSection"));
const CoverageSection = lazy(() => import("./sections/LanguageSection").then((module) => ({ default: module.CoverageSection })));
const SourcesSection = lazy(() => import("./sections/SourcesSection"));
const EvaluationSection = lazy(() => import("./sections/EvaluationSection"));
const BenchmarkSection = lazy(() => import("./sections/BenchmarkSection"));
const FailureSection = lazy(() => import("./sections/FailureSection"));
const BackupSection = lazy(() => import("./sections/BackupSection"));
const VersionSection = lazy(() => import("./sections/BackupSection").then((module) => ({ default: module.VersionSection })));
const AuditSection = lazy(() => import("./sections/AuditSection"));
const RegistrySection = lazy(() => import("./sections/RegistrySection"));
const ReadinessSection = lazy(() => import("./sections/RegistrySection").then((module) => ({ default: module.ReadinessSection })));
const FarmersSection = lazy(() => import("./sections/FarmersSection"));

const NAV = [
  { to: "/admin/health", label: "System health", group: "Monitoring" },
  { to: "/admin/chatbot", label: "Chatbot", group: "Monitoring" },
  { to: "/admin/rag", label: "RAG / knowledge", group: "Monitoring" },
  { to: "/admin/safety", label: "Safety", group: "Monitoring" },
  { to: "/admin/crop-doctor", label: "Crop Doctor", group: "Monitoring" },
  { to: "/admin/models", label: "Models", group: "Monitoring" },
  { to: "/admin/languages", label: "Languages", group: "Monitoring" },
  { to: "/admin/coverage", label: "Coverage", group: "Monitoring" },
  { to: "/admin/sources", label: "Sources", group: "Monitoring" },
  { to: "/admin/failures", label: "Failures & incidents", group: "Monitoring" },
  { to: "/admin/farmers", label: "Farmers", group: "Analysis" },
  { to: "/admin/evaluation", label: "Evaluation", group: "Analysis" },
  { to: "/admin/benchmarks", label: "AI benchmarks", group: "Analysis" },
  { to: "/admin/backups", label: "Backups", group: "Operations" },
  { to: "/admin/versions", label: "Versions & changes", group: "Operations" },
  { to: "/admin/audit", label: "Audit & logs", group: "Operations" },
  { to: "/admin/registry", label: "Registries", group: "Operations" },
  { to: "/admin/readiness", label: "Readiness & DR", group: "Operations" },
];

function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminLogin(email.trim(), password);
      onSuccess();
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <form className="card bg-base-100 shadow-xl w-full max-w-sm p-6 space-y-3" onSubmit={submit}>
        <div className="flex items-center gap-2">
          <LockKeyIcon aria-hidden size={22} />
          <h1 className="text-lg font-semibold">KrishiVerse Admin</h1>
        </div>
        <p className="text-xs opacity-70">
          Admin access requires an account with an admin role (viewer, auditor, admin, superadmin). Farmer accounts are rejected.
        </p>
        <label className="form-control">
          <span className="label-text text-xs">Email</span>
          <input className="input input-bordered input-sm" type="email" value={email} required autoComplete="username" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Password</span>
          <input className="input input-bordered input-sm" type="password" value={password} required autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="text-error text-xs">{error}</p> : null}
        <button type="submit" className="btn btn-sm btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const location = useLocation();
  const [session, setSession] = useState(() => adminSession());
  const [tick, setTick] = useState(0);
  const me = useAdminData("/auth/me", { enabled: Boolean(session), intervalMs: 60000 });

  useEffect(() => {
    if (session) captureAdminSession();
  }, [session, tick]);

  const refreshIdentity = useCallback(async () => {
    setSession(adminSession());
    setTick((value) => value + 1);
    await me.refresh();
  }, [me]);

  const permissions = useMemo(() => me.data?.admin?.permissions || [], [me.data]);

  async function logout() {
    await adminLogout();
    setSession(null);
    me.refresh();
  }

  if (!session) {
    return <Login onSuccess={refreshIdentity} />;
  }

  const groups = [...new Set(NAV.map((entry) => entry.group))];

  return (
    <AdminSessionContext.Provider value={{ session: me.data?.admin || session, permissions }}>
      <div className="min-h-screen bg-base-200 text-base-content">
        <header className="bg-base-100 border-b border-base-300 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">KrishiVerse Admin · Observability</h1>
            <span className="badge badge-ghost badge-sm">{me.data?.admin?.role || session.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-70">{me.data?.admin?.email || session.email}</span>
            <button
              type="button"
              className="btn btn-xs"
              onClick={async () => {
                await me.refresh();
                setTick((value) => value + 1);
              }}
            >
              <ArrowClockwiseIcon aria-hidden />
              Refresh
            </button>
            <button type="button" className="btn btn-xs btn-outline" onClick={logout}>
              <SignOutIcon aria-hidden />
              Sign out
            </button>
          </div>
        </header>

        {me.error ? <div className="px-4 pt-2"><ErrorNote error={me.error} onRetry={me.refresh} /></div> : null}

        <div className="flex flex-col md:flex-row">
          <nav className="md:w-56 bg-base-100 border-b md:border-b-0 md:border-r border-base-300 p-2 shrink-0">
            {groups.map((group) => (
              <div key={group} className="mb-3">
                <div className="px-2 py-1 text-[11px] uppercase opacity-50">{group}</div>
                {NAV.filter((entry) => entry.group === group).map((entry) => (
                  <NavLink
                    key={entry.to}
                    to={entry.to}
                    className={({ isActive }) => `block rounded px-2 py-1.5 text-sm ${isActive ? "bg-primary text-primary-content" : "hover:bg-base-200"}`}
                  >
                    {entry.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <p className="px-2 text-[11px] opacity-50">
              Read-only unless your role grants operations permission. Path: {location.pathname}
            </p>
          </nav>

          <main className="flex-1 p-4 min-w-0">
            <Suspense fallback={<LoadingNote />}>
              <Routes>
                <Route index element={<Navigate to="/admin/health" replace />} />
                <Route path="health" element={<SystemHealthSection />} />
                <Route path="chatbot" element={<ChatbotSection />} />
                <Route path="rag" element={<RagSection />} />
                <Route path="safety" element={<SafetySection />} />
                <Route path="crop-doctor" element={<CropDoctorSection />} />
                <Route path="models" element={<ModelSection />} />
                <Route path="languages" element={<LanguageSection />} />
                <Route path="coverage" element={<CoverageSection />} />
                <Route path="sources" element={<SourcesSection />} />
                <Route path="evaluation" element={<EvaluationSection />} />
                <Route path="benchmarks" element={<BenchmarkSection />} />
                <Route path="failures" element={<FailureSection />} />
                <Route path="farmers" element={<FarmersSection />} />
                <Route path="backups" element={<BackupSection />} />
                <Route path="versions" element={<VersionSection />} />
                <Route path="audit" element={<AuditSection />} />
                <Route path="registry" element={<RegistrySection />} />
                <Route path="readiness" element={<ReadinessSection />} />
                <Route path="*" element={<Navigate to="/admin/health" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </AdminSessionContext.Provider>
  );
}
