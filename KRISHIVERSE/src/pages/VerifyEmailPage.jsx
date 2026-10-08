import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import AuthShell, { Field, SubmitButton, TextInput } from "../components/auth/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email verification.
 *
 * Verification is deliberately NOT a login gate: farmers can always sign in and
 * use the app while a code is outstanding. This screen only reports status and
 * lets an account opt in to a code.
 *
 * Delivery: with no mail provider configured the API returns the code in
 * development mode (shown below as a dev hint) and returns nothing in
 * production — where the hint is hidden entirely.
 */
export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, requestVerification, confirmVerification, loading, error, clearError, logout } = useAuthStore();

  const [email, setEmail] = useState(user?.email || "");
  const [code, setCode] = useState("");
  const [fieldErr, setFieldErr] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => () => clearError(), [clearError]);

  const verified = Boolean(user?.emailVerified);

  async function handleSend(event) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setFieldErr(t("auth.error.email", "Enter a valid email address"));
      return;
    }
    setFieldErr("");
    try {
      const data = await requestVerification(email.trim().toLowerCase());
      setSent(true);
      setDevCode(data?.devCode || null);
    } catch {
      /* rendered from the store error slot */
    }
  }

  async function handleConfirm(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setFieldErr(t("verify.error.code", "Enter the 6-digit code"));
      return;
    }
    setFieldErr("");
    try {
      await confirmVerification(email.trim().toLowerCase(), code);
      navigate("/profile", { replace: true });
    } catch {
      /* rendered from the store error slot */
    }
  }

  if (verified) {
    return (
      <AuthShell
        title={t("verify.done.title", "Email verified")}
        subtitle={t("verify.done.subtitle", "Your account is confirmed. Thank you!")}
        footer={
          <p className="text-center text-[12px] text-[var(--kv-grey-mid)]">
            <Link to="/profile" className="font-bold text-[var(--kv-green)]">
              {t("verify.done.profile", "Go to profile")}
            </Link>
          </p>
        }
      >
        <div className="bg-white border border-[var(--kv-divider)] rounded-[16px] p-4 flex items-center gap-3 shadow-sm">
          <ShieldCheck size={22} className="text-[var(--kv-green)] shrink-0" weight="fill" />
          <span className="text-[13px] font-medium text-[var(--kv-grey-dark)]">{user?.email}</span>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("verify.title", "Verify your email")}
      subtitle={t("verify.subtitle", "We sent a 6-digit code to your address. You can keep using KrishiVerse either way.")}
      error={error}
      footer={
        <p className="text-center text-[12px] text-[var(--kv-grey-mid)]">
          <Link to="/profile" className="font-bold text-[var(--kv-green)]">
            {t("verify.skip", "Skip for now")}
          </Link>
          {" · "}
          <button type="button" className="font-bold text-[var(--kv-red)]" onClick={() => logout()}>
            {t("auth.logout", "Sign out")}
          </button>
        </p>
      }
    >
      {!sent ? (
        <form onSubmit={handleSend} className="space-y-5" noValidate>
          <Field label={t("auth.field.email", "Email")} htmlFor="verify-email" error={fieldErr}>
            <EnvelopeSimple size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="bold" />
            <TextInput
              id="verify-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="farmer@example.com"
              value={email}
              disabled={loading || Boolean(user?.email)}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) clearError();
                if (fieldErr) setFieldErr("");
              }}
            />
          </Field>

          <SubmitButton loading={loading}>
            {t("verify.send", "Send code")}
            <ArrowRight size={20} weight="bold" />
          </SubmitButton>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-5" noValidate>
          <Field label={t("verify.codeLabel", "6-digit code")} htmlFor="verify-code" error={fieldErr}>
            <TextInput
              id="verify-code"
              inputMode="numeric"
              centered
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={code}
              disabled={loading}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                if (error) clearError();
                if (fieldErr) setFieldErr("");
              }}
            />
          </Field>

          {devCode && (
            <div className="bg-[var(--kv-amber-light)] border border-[var(--kv-amber)] border-opacity-40 rounded-[14px] p-3 text-[12px] font-bold text-[var(--kv-grey-dark)]">
              {t("verify.devHint", "Development mode — your code is")} {devCode}
            </div>
          )}

          <SubmitButton loading={loading} disabled={code.length !== 6}>
            {t("verify.confirm", "Verify email")}
            <ArrowRight size={20} weight="bold" />
          </SubmitButton>

          <button
            type="button"
            className="flex items-center justify-center gap-2 text-[13px] font-bold text-[var(--kv-grey-mid)] h-10 w-full rounded-xl transition-colors active:bg-[var(--kv-divider)]"
            disabled={loading}
            onClick={handleSend}
          >
            {t("verify.resend", "Resend code")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
