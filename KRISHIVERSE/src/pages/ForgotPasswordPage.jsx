import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, EnvelopeSimple, CheckCircle } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import AuthShell, { Field, SubmitButton, TextInput } from "../components/auth/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password reset request. The API answers identically whether or not the
 * address exists, so this screen always reports the same success message.
 * When no mail provider is configured (development), the API returns the token
 * directly and we surface a continue button instead of a dead end.
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { forgotPassword, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [fieldErr, setFieldErr] = useState("");
  const [sent, setSent] = useState(null);

  useEffect(() => () => clearError(), [clearError]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setFieldErr(t("auth.error.email", "Enter a valid email address"));
      return;
    }
    setFieldErr("");
    try {
      const data = await forgotPassword(email.trim().toLowerCase());
      setSent(data);
    } catch {
      /* rendered from the store error slot */
    }
  }

  if (sent) {
    return (
      <AuthShell
        title={t("forgot.sent.title", "Check your inbox")}
        subtitle={t("forgot.sent.subtitle", "If an account exists for this address, a reset link is on its way.")}
        footer={
          <p className="text-center text-[12px] text-[var(--kv-grey-mid)]">
            <Link to="/login" className="font-bold text-[var(--kv-green)]">
              {t("forgot.sent.back", "Back to sign in")}
            </Link>
          </p>
        }
      >
        <div className="bg-white border border-[var(--kv-divider)] rounded-[16px] p-4 flex items-start gap-3 shadow-sm mb-5">
          <CheckCircle size={20} className="text-[var(--kv-green)] shrink-0" weight="fill" />
          <span className="text-[13px] text-[var(--kv-grey-dark)] leading-snug">
            {t("forgot.sent.note", "The link expires shortly and can only be used once.")}
          </span>
        </div>

        {sent.devToken && (
          <button
            type="button"
            className="kv-btn-primary h-[52px] w-full text-[15px] flex items-center justify-center gap-2"
            onClick={() => navigate(`/reset?token=${encodeURIComponent(sent.devToken)}`)}
          >
            {t("forgot.sent.devContinue", "Continue (development mode)")}
            <ArrowRight size={18} weight="bold" />
          </button>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("forgot.title", "Reset your password")}
      subtitle={t("forgot.subtitle", "Enter the email you registered with and we'll send a reset link.")}
      error={error}
      footer={
        <p className="text-center text-[12px] text-[var(--kv-grey-mid)]">
          <Link to="/login" className="font-bold text-[var(--kv-green)]">
            {t("forgot.back", "Back to sign in")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field label={t("auth.field.email", "Email")} htmlFor="forgot-email" error={fieldErr}>
          <EnvelopeSimple size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="bold" />
          <TextInput
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="farmer@example.com"
            value={email}
            disabled={loading}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) clearError();
              if (fieldErr) setFieldErr("");
            }}
          />
        </Field>

        <SubmitButton loading={loading}>
          {t("forgot.submit", "Send reset link")}
          <ArrowRight size={20} weight="bold" />
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
