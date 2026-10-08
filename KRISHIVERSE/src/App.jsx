import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import AppHeader from "./components/common/AppHeader";
import BottomNav from "./components/common/BottomNav";
import OfflineBanner from "./components/common/OfflineBanner";
import InstallBanner from "./components/common/InstallBanner";
import ServiceWorkerUpdate from "./components/common/ServiceWorkerUpdate";
import PageTransition from "./components/common/PageTransition";
import Seo from "./components/common/Seo";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { AUTH_ROUTES } from "./config/navigation";

// ─── Lazy-loaded pages — each page becomes its own JS chunk ──────────────────
const Home         = lazy(() => import("./pages/Home"));
const AskPage      = lazy(() => import("./pages/AskPage"));
const DiagnosePage = lazy(() => import("./pages/DiagnosePage"));
const WeatherPage  = lazy(() => import("./pages/WeatherPage"));
const PricesPage   = lazy(() => import("./pages/PricesPage"));
const MapsPage     = lazy(() => import("./pages/MapsPage"));
const SchemesPage  = lazy(() => import("./pages/SchemesPage"));
const DronePage    = lazy(() => import("./pages/DronePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage    = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const WelcomePage  = lazy(() => import("./pages/WelcomePage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage  = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyEmailPage    = lazy(() => import("./pages/VerifyEmailPage"));
const ProfilePage        = lazy(() => import("./pages/ProfilePage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const VideosPage   = lazy(() => import("./pages/VideosPage"));
const NewsPage     = lazy(() => import("./pages/NewsPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const FinancialPage   = lazy(() => import("./pages/FinancialPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const HelplinePage    = lazy(() => import("./pages/HelplinePage"));

const TestComponent = lazy(() => import("./components/Test/TestComponent"));

// Admin observability surface — code-split so it never lands in the farmer bundle.
const AdminApp = lazy(() => import("./admin/AdminApp"));
const AdminBoundary = lazy(() => import("./admin/AdminBoundary"));

// ─── Minimal page-level loading fallback ─────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48" role="status" aria-live="polite">
      <span
        className="w-8 h-8 border-2 border-[var(--kv-divider)] border-t-[var(--kv-green)] rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading page content</span>
    </div>
  );
}

const SWIPEABLE_ROUTES = [
  "/",
  "/ask",
  "/weather",
  "/calendar",
  "/prices",
  "/maps"
];

function scheduleIdleTask(callback) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 2500 });
  }

  return window.setTimeout(callback, 1200);
}

function cancelIdleTask(handle) {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      const idx = SWIPEABLE_ROUTES.indexOf(location.pathname);
      if (idx !== -1 && idx < SWIPEABLE_ROUTES.length - 1) {
        navigate(SWIPEABLE_ROUTES[idx + 1]);
      }
    },
    onSwipedRight: () => {
      const idx = SWIPEABLE_ROUTES.indexOf(location.pathname);
      if (idx !== -1 && idx > 0) {
        navigate(SWIPEABLE_ROUTES[idx - 1]);
      }
    },
    preventDefaultTouchmoveEvent: false,
    trackMouse: false, 
  });

  useEffect(() => {
    let cancelled = false;

    const idleHandle = scheduleIdleTask(async () => {
      try {
        const saved = localStorage.getItem("krishiverse_notifications");
        const notificationsEnabled = saved !== null ? JSON.parse(saved) : true;

        const [{ seedAgriculturalData }, { warmUpCache }] = await Promise.all([
          import("./services/db/seedingService"),
          import("./services/ai/IndexedDBChatbotEngine"),
        ]);

        if (cancelled) {
          return;
        }

        await seedAgriculturalData();

        if (!cancelled) {
          await warmUpCache();
        }

        if (notificationsEnabled && !cancelled) {
          const { enableMockPushAlerts } = await import("./services/notificationsService");
          enableMockPushAlerts();
        }
      } catch (err) {
        console.error("Deferred startup task failed:", err);
      }
    });

    return () => {
      cancelled = true;
      cancelIdleTask(idleHandle);
    };
  }, []);

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAuthPage = AUTH_ROUTES.includes(location.pathname) || isAdminRoute;

  return (
    <div {...handlers}>
      <Seo />
      <a href="#main-content" className="kv-skip-link">
        Skip to main content
      </a>
      {!isAuthPage && <AppHeader />}
      {!isAuthPage && <OfflineBanner />}
      {!isAuthPage && <InstallBanner />}
      <ServiceWorkerUpdate />
      <main
        id="main-content"
        tabIndex="-1"
        className={isAuthPage ? "min-h-screen" : "kv-page"}
      >
        <PageTransition>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/ask" element={<AskPage />} />
              <Route path="/diagnose" element={<DiagnosePage />} />
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/prices" element={<PricesPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/maps" element={<MapsPage />} />
              <Route path="/schemes" element={<SchemesPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/finance" element={<FinancialPage />} />
              <Route path="/financial" element={<Navigate to="/finance" replace />} />
              <Route path="/helpline" element={<HelplinePage />} />
              <Route path="/drone" element={<DronePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Auth flow — full-screen, chrome hidden via AUTH_ROUTES */}
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot" element={<ForgotPasswordPage />} />
              <Route path="/reset" element={<ResetPasswordPage />} />
              {/* Verification works from an emailed link with no session, and
                  never blocks login — so it stays public. */}
              <Route path="/verify" element={<VerifyEmailPage />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute requireOnboarding={false}>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/test" element={<TestComponent />} />
              <Route
                path="/admin/*"
                element={
                  <AdminBoundary>
                    <AdminApp />
                  </AdminBoundary>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </PageTransition>
      </main>
      {!isAuthPage && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
