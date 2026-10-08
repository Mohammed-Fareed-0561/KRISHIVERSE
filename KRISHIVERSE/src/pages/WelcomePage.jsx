import React from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, CloudSun, Plant } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import AuthShell from "../components/auth/AuthShell";

/**
 * Entry screen for the authentication surface: explains what an account adds
 * (personalised advice + offline sync) without blocking the app itself — the
 * whole farmer experience stays usable signed out.
 */
export default function WelcomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, isOnboardingRequired } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={isOnboardingRequired ? "/onboarding" : "/"} replace />;
  }

  const benefits = [
    { icon: Plant, key: "crops", text: t("welcome.benefit.crops", "Advice matched to your crops and village") },
    { icon: CloudSun, key: "offline", text: t("welcome.benefit.offline", "Keeps working when the network does not") },
    { icon: ShieldCheck, key: "control", text: t("welcome.benefit.control", "You choose what is saved, and can clear it any time") },
  ];

  return (
    <AuthShell
      title={t("welcome.title", "Welcome to KrishiVerse")}
      subtitle={t("welcome.subtitle", "Create an account to personalise advice — or keep exploring signed out.")}
      footer={
        <p className="text-center text-[11px] text-[var(--kv-grey-mid)] font-medium">
          {t("welcome.footer", "Made for farmers in Tamil Nadu")}
        </p>
      }
    >
      <ul className="space-y-3 mb-7">
        {benefits.map(({ icon: Icon, key, text }) => (
          <li key={key} className="flex items-start gap-3 bg-white border border-[var(--kv-divider)] rounded-[16px] p-3 shadow-sm">
            <span className="w-9 h-9 rounded-xl bg-[var(--kv-green-light)] flex items-center justify-center shrink-0">
              <Icon size={18} className="text-[var(--kv-green)]" weight="fill" />
            </span>
            <span className="text-[13px] font-medium text-[var(--kv-grey-dark)] leading-snug pt-1.5">{text}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <Link to="/register" className="kv-btn-primary h-[56px] w-full text-[16px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(46,125,82,0.2)]">
          {t("welcome.create", "Create an account")}
          <ArrowRight size={20} weight="bold" />
        </Link>
        <Link
          to="/login"
          className="kv-btn-secondary h-[56px] w-full text-[16px] flex items-center justify-center"
        >
          {t("welcome.signin", "I already have an account")}
        </Link>
        <Link to="/" className="block text-center text-[13px] font-bold text-[var(--kv-grey-mid)] py-2">
          {t("welcome.skip", "Continue without an account")}
        </Link>
      </div>
    </AuthShell>
  );
}
