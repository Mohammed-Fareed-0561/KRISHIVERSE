import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconHome2,
  IconMessage,
  IconCloud,
  IconCurrencyRupee,
  IconMapPin,
  IconFileDescription,
  IconSettings,
  IconCamera,
  IconUser,
  IconLogout,
  IconLeaf,
  IconCalendarEvent,
  IconVideo,
  IconNews,
  IconShoppingCart,
  IconBuildingBank,
  IconBell
} from "@tabler/icons-react";
import { useAuthStore } from "../../store/authStore";

// Bottom nav items — 6 most accessed pages on mobile (including diagnosis)
const BOTTOM_NAV = [
  { to: "/", icon: IconHome2, labelKey: "nav.home", end: true },
  { to: "/ask", icon: IconMessage, labelKey: "nav.ask" },
  { to: "/diagnose", icon: IconCamera, labelKey: "nav.diagnose" },
  { to: "/weather", icon: IconCloud, labelKey: "nav.weather" },
  { to: "/calendar", icon: IconCalendarEvent, labelKey: "nav.calendar" },
  { to: "/marketplace", icon: IconShoppingCart, labelKey: "nav.marketplace" },
  { to: "/finance", icon: IconBuildingBank, labelKey: "nav.finance" },
];

// Desktop sidebar items
const SIDEBAR_NAV = [
  { to: "/", icon: IconHome2, label: "Home", end: true },
  { to: "/ask", icon: IconMessage, label: "Ask AI" },
  { to: "/diagnose", icon: IconCamera, label: "Diagnose" },
  { to: "/weather", icon: IconCloud, label: "Weather" },
  { to: "/calendar", icon: IconCalendarEvent, label: "Calendar" },
  { to: "/prices", icon: IconCurrencyRupee, label: "Prices" },
  { to: "/maps", icon: IconMapPin, label: "Maps" },
  { to: "/marketplace", icon: IconShoppingCart, label: "Marketplace" },
  { to: "/finance", icon: IconBuildingBank, label: "Finance" },
  { to: "/schemes", icon: IconFileDescription, label: "Schemes" },
  { to: "/news", icon: IconNews, label: "News & RSS" },
  { to: "/videos", icon: IconVideo, label: "Krishi TV" },
  { to: "/settings", icon: IconSettings, label: "Settings" },
];

const Navbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();


  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto max-w-2xl flex justify-between items-center px-4 py-3">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 text-primary font-bold text-xl"
          >
            <IconLeaf size={22} className="text-primary" />
            {t("app.name", "KrishiVerse")}
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="btn btn-ghost btn-sm p-2 rounded-full relative"
            >
              <IconBell size={20} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Link>
            
            {isAuthenticated ? (

              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost btn-sm gap-1 rounded-full px-3"
                >
                  <IconUser size={18} className="text-primary" />
                  <span className="hidden md:inline text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {user?.name ?? "Account"}
                  </span>
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu bg-white text-base-content rounded-2xl shadow-xl w-44 p-2 mt-2 z-50 border border-gray-100"
                >
                  <li>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 py-2 text-sm"
                    >
                      <IconSettings size={16} /> {t("nav.settings", "Settings")}
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 py-2 text-sm text-error w-full text-left"
                    >
                      <IconLogout size={16} /> {t("nav.logout", "Logout")}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="btn btn-ghost btn-sm text-sm hidden md:flex"
                >
                  {t("nav.login", "Login")}
                </Link>
                <Link
                  to="/settings"
                  className="btn btn-ghost btn-sm p-2 rounded-full"
                >
                  <IconSettings size={20} className="text-gray-500" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Bottom Navigation (mobile) ───────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-stretch">
          {BOTTOM_NAV.map(({ to, icon: Icon, labelKey, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 transition-colors ${
                  isActive ? "text-primary" : "text-gray-400"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`rounded-xl p-1.5 transition-colors ${isActive ? "bg-primary/10" : ""}`}
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  </span>
                  <span className="text-[10px] font-medium leading-none">
                    {t(labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Desktop Left Sidebar ─────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col bg-white border-r border-gray-100 w-56 fixed top-[57px] left-0 h-[calc(100vh-57px)] overflow-y-auto z-30 shadow-sm">
        <ul className="menu menu-vertical p-4 gap-1">
          {SIDEBAR_NAV.map(({ to, icon: Icon, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Navbar;
