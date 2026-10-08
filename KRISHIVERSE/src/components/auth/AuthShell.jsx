import React from "react";
import { Link } from "react-router-dom";
import { Plant, Warning } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

/**
 * Shared shell for the full-screen auth surfaces (welcome, sign in, create
 * account, verify, reset). Auth routes render without the app header/chrome,
 * so every one of them supplies its own branding, error slot and footer links.
 */
export default function AuthShell({ title, subtitle, children, error, footer, wide = false }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--kv-off-white)] flex flex-col pt-8 pb-8 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[var(--kv-green-light)] opacity-30 pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-72 h-72 rounded-full bg-[var(--kv-amber-light)] opacity-30 pointer-events-none blur-3xl" />

      <div className={`w-full ${wide ? "max-w-md" : "max-w-sm"} mx-auto relative z-10 flex-1 flex flex-col justify-center`}>
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" aria-label={t("auth.home", "KrishiVerse home")} className="flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--kv-green)] rounded-[18px] mb-4 shadow-[0_8px_24px_rgba(46,125,82,0.25)] flex items-center justify-center">
              <Plant size={36} weight="fill" className="text-white" />
            </div>
            <h1 className="text-[28px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] tracking-tight">
              KrishiVerse
            </h1>
          </Link>
          <p className="text-[13px] text-[var(--kv-grey-mid)] mt-1 font-medium tracking-wide">
            {t("auth.tagline", "Smart farming for South India")}
          </p>
        </div>

        <div className="w-full">
          <div className="mb-6 text-center">
            <h2 className="text-[24px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] mb-1">
              {title}
            </h2>
            {subtitle && <p className="text-[14px] text-[var(--kv-grey-dark)] leading-snug">{subtitle}</p>}
          </div>

          {error && (
            <div
              role="alert"
              className="bg-[var(--kv-red-light)] border border-[var(--kv-red)] border-opacity-30 rounded-[16px] p-3 mb-6 flex items-start gap-2 text-[var(--kv-red)]"
            >
              <Warning size={18} weight="bold" className="mt-0.5 shrink-0" />
              <span className="text-[13px] font-medium leading-snug">{error}</span>
            </div>
          )}

          {children}
        </div>
      </div>

      {footer && <div className="mt-auto pt-8 relative z-10">{footer}</div>}
    </div>
  );
}

/** Rounded bordered input row used across the auth forms. */
export function Field({ label, htmlFor, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-bold text-[var(--kv-grey-dark)] ml-1">
          {label}
        </label>
      )}
      <div
        className={`flex items-center bg-white border ${
          error ? "border-[var(--kv-red)]" : "border-[var(--kv-divider)]"
        } rounded-[16px] overflow-hidden focus-within:border-[var(--kv-green)] transition-colors h-[56px] shadow-sm px-4`}
      >
        {children}
      </div>
      {error && <span className="text-[12px] font-bold text-[var(--kv-red)] ml-1">{error}</span>}
    </div>
  );
}

export function TextInput({ centered, className, ...props }) {
  return (
    <input
      {...props}
      className={`flex-1 w-full text-[16px] font-bold text-[var(--kv-near-black)] placeholder:text-[var(--kv-divider)] focus:outline-none bg-transparent ${
        centered ? "text-center tracking-[0.3em]" : ""
      } ${className || ""}`}
    />
  );
}

export function SubmitButton({ loading, disabled, children }) {
  return (
    <button
      type="submit"
      className="kv-btn-primary h-[56px] w-full text-[16px] shadow-[0_8px_20px_rgba(46,125,82,0.2)] flex items-center justify-center gap-2"
      disabled={loading || disabled}
    >
      {loading ? (
        <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
}
