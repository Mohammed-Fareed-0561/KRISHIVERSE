import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, LockKey } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import AuthShell, { Field, SubmitButton, TextInput } from "../components/auth/AuthShell";

/**
 * Step 2 of password recovery: consumes the one-time token issued by
 * POST /auth/password/forgot. The token normally arrives by email as a link to
 * `/reset?token=…`; without a mail provider (development) it can be pasted here.
 */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, loading, error, clearError } = useAuthStore();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErr, setFieldErr] = useState({});
  const [done, setDone] = useState(false);

  useEffect(() => () => clearError(), [clearError]);

  function validate() {
    const next = {};
    if (!token.trim()) next.token = t("reset.error.token", "Paste the reset link or token");
    if (password.length < 6) next.password = t("auth.error.passwordShort", "Use at least 6 characters");
    if (password !== confirm) next.confirm = t("reset.error.mismatch", "Passwords do not match");
    setFieldErr(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    try {
      await resetPassword(token.trim(), password);
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch {
      /* rendered from the store error slot */
    }
  }

  if (done) {
    return (
      <AuthShell
        title={t("reset.done.title", "Password updated")}
        subtitle={t("reset.done.subtitle", "You can now sign in with your new password.")}
      >
        <div className="bg-white border border-[var(--kv-divider)] rounded-[16px] p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle size={22} className="text-[var(--kv-green)] shrink-0" weight="fill" />
          <span className="text-[13px] font-medium text-[var(--kv-grey-dark)]">
            {t("reset.done.note", "Taking you to sign in…")}
          </span>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("reset.title", "Choose a new password")}
      subtitle={t("reset.subtitle", "Your reset link works once and then expires.")}
      error={error}
      wide
      footer={
        <p className="text-center text-[12px] text-[var(--kv-grey-mid)]">
          <Link to="/forgot" className="font-bold text-[var(--kv-green)]">
            {t("reset.requestNew", "Request a new link")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {!searchParams.get("token") && (
          <Field label={t("reset.token", "Reset token")} htmlFor="reset-token" error={fieldErr.token}>
            <TextInput
              id="reset-token"
              placeholder={t("reset.tokenPlaceholder", "Paste the token from your email")}
              value={token}
              disabled={loading}
              onChange={(event) => {
                setToken(event.target.value);
                if (error) clearError();
                if (fieldErr.token) setFieldErr((prev) => ({ ...prev, token: "" }));
              }}
            />
          </Field>
        )}

        <Field label={t("reset.newPassword", "New password")} htmlFor="reset-password" error={fieldErr.password}>
          <LockKey size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="fill" />
          <TextInput
            id="reset-password"
            type="password"
            autoComplete="new-password"
            autoFocus={Boolean(searchParams.get("token"))}
            placeholder={t("auth.placeholder.password", "At least 6 characters")}
            value={password}
            disabled={loading}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) clearError();
              if (fieldErr.password) setFieldErr((prev) => ({ ...prev, password: "" }));
            }}
          />
        </Field>

        <Field label={t("reset.confirm", "Confirm password")} htmlFor="reset-confirm" error={fieldErr.confirm}>
          <LockKey size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="fill" />
          <TextInput
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            disabled={loading}
            onChange={(event) => {
              setConfirm(event.target.value);
              if (fieldErr.confirm) setFieldErr((prev) => ({ ...prev, confirm: "" }));
            }}
          />
        </Field>

        <SubmitButton loading={loading} disabled={!token.trim()}>
          {t("reset.submit", "Update password")}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
