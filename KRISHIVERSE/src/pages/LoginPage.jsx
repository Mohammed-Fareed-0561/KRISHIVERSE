import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import AuthShell, { Field, SubmitButton, TextInput } from "../components/auth/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError, isAuthenticated, isOnboardingRequired } = useAuthStore();

  const from = location.state?.from || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErr, setFieldErr] = useState({ email: "", password: "" });

  useEffect(() => () => clearError(), [clearError]);

  if (isAuthenticated) {
    return <Navigate to={isOnboardingRequired ? "/onboarding" : from} replace />;
  }

  function validate() {
    const next = { email: "", password: "" };
    if (!EMAIL_RE.test(email.trim())) next.email = t("auth.error.email", "Enter a valid email address");
    if (!password) next.password = t("auth.error.passwordRequired", "Enter your password");
    setFieldErr(next);
    return !next.email && !next.password;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    try {
      await login({ email: email.trim().toLowerCase(), password });
      const store = useAuthStore.getState();
      navigate(store.isOnboardingRequired ? "/onboarding" : from, { replace: true });
    } catch {
      /* rendered from the store error slot */
    }
  }

  return (
    <AuthShell
      title={t("auth.login.title", "Namaste! 🙏")}
      subtitle={t("auth.login.subtitle", "Sign in with your email and password")}
      error={error}
      footer={
        <p className="text-center text-[11px] text-[var(--kv-grey-mid)] font-medium leading-relaxed max-w-[260px] mx-auto">
          {t("auth.login.terms", "By signing in, you agree to KrishiVerse's Terms and Privacy Policy")}
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field label={t("auth.field.email", "Email")} htmlFor="login-email" error={fieldErr.email}>
          <EnvelopeSimple size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="bold" />
          <TextInput
            id="login-email"
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
              if (fieldErr.email) setFieldErr({ ...fieldErr, email: "" });
            }}
          />
        </Field>

        <Field label={t("auth.field.password", "Password")} htmlFor="login-password" error={fieldErr.password}>
          <LockKey size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="fill" />
          <TextInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            disabled={loading}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) clearError();
              if (fieldErr.password) setFieldErr({ ...fieldErr, password: "" });
            }}
          />
        </Field>

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot"
            className="text-[13px] text-[var(--kv-green)] font-bold active:scale-95 transition-transform"
          >
            {t("auth.login.forgot", "Forgot password?")}
          </Link>
        </div>

        <SubmitButton loading={loading}>
          {t("auth.login.submit", "Sign in")}
          <ArrowRight size={20} weight="bold" />
        </SubmitButton>
      </form>

      <div className="mt-6 text-center space-y-3">
        <p className="text-[14px] text-[var(--kv-grey-dark)]">
          {t("auth.login.noAccount", "New to KrishiVerse?")}{" "}
          <Link to="/register" className="text-[var(--kv-green)] font-bold">
            {t("auth.login.createAccount", "Create an account")}
          </Link>
        </p>
        <p className="text-[13px] text-[var(--kv-grey-mid)]">
          <Link to="/verify" className="underline font-medium">
            {t("auth.login.verify", "Verify your email")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
