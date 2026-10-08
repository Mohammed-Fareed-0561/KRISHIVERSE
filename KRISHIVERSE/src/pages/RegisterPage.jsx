import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, EnvelopeSimple, LockKey, MapPin, User as UserIcon } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { useLanguage } from "../hooks/useLanguage";
import AuthShell, { Field, SubmitButton, TextInput } from "../components/auth/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANGUAGES = [
  { value: "ta", label: "தமிழ்" },
  { value: "tanglish", label: "Tanglish" },
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();
  const { register, loading, error, clearError, isAuthenticated, isOnboardingRequired } = useAuthStore();

  const [form, setForm] = useState({ name: "", email: "", password: "", language: "ta", district: "" });
  const [fieldErr, setFieldErr] = useState({});

  useEffect(() => () => clearError(), [clearError]);

  if (isAuthenticated) {
    return <Navigate to={isOnboardingRequired ? "/onboarding" : "/"} replace />;
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) clearError();
    if (fieldErr[key]) setFieldErr((prev) => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = t("auth.error.name", "Enter your name (at least 2 characters)");
    if (!EMAIL_RE.test(form.email.trim())) next.email = t("auth.error.email", "Enter a valid email address");
    if (form.password.length < 6) next.password = t("auth.error.passwordShort", "Use at least 6 characters");
    setFieldErr(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        language: form.language,
        ...(form.district.trim() ? { location: { district: form.district.trim() } } : {}),
      });
      if (["en", "ta", "hi"].includes(form.language)) await setLanguage(form.language);
      navigate("/onboarding", { replace: true });
    } catch {
      /* rendered from the store error slot */
    }
  }

  return (
    <AuthShell
      title={t("auth.register.title", "Create your account")}
      subtitle={t("auth.register.subtitle", "A quick setup so KrishiVerse can tailor advice to your farm")}
      error={error}
      wide
      footer={
        <p className="text-center text-[11px] text-[var(--kv-grey-mid)] font-medium leading-relaxed max-w-[280px] mx-auto">
          {t("auth.register.privacy", "We only ask for what the pilot needs. No Aadhaar, bank or financial details.")}
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field label={t("auth.field.name", "Full name")} htmlFor="reg-name" error={fieldErr.name}>
          <UserIcon size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="bold" />
          <TextInput
            id="reg-name"
            autoComplete="name"
            autoFocus
            placeholder={t("auth.placeholder.name", "Your name")}
            value={form.name}
            disabled={loading}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>

        <Field label={t("auth.field.email", "Email")} htmlFor="reg-email" error={fieldErr.email}>
          <EnvelopeSimple size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="bold" />
          <TextInput
            id="reg-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="farmer@example.com"
            value={form.email}
            disabled={loading}
            onChange={(event) => update("email", event.target.value)}
          />
        </Field>

        <Field label={t("auth.field.password", "Password")} htmlFor="reg-password" error={fieldErr.password}>
          <LockKey size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="fill" />
          <TextInput
            id="reg-password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.placeholder.password", "At least 6 characters")}
            value={form.password}
            disabled={loading}
            onChange={(event) => update("password", event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="reg-language" className="text-[13px] font-bold text-[var(--kv-grey-dark)] ml-1">
              {t("auth.field.language", "Language")}
            </label>
            <select
              id="reg-language"
              className="kv-input h-[56px] rounded-[16px]"
              value={form.language}
              disabled={loading}
              onChange={(event) => update("language", event.target.value)}
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Field label={t("auth.field.district", "District")} htmlFor="reg-district" error={fieldErr.district}>
            <MapPin size={20} className="text-[var(--kv-grey-mid)] shrink-0" weight="bold" />
            <TextInput
              id="reg-district"
              placeholder={t("auth.placeholder.district", "Optional")}
              value={form.district}
              disabled={loading}
              onChange={(event) => update("district", event.target.value)}
            />
          </Field>
        </div>

        <SubmitButton loading={loading}>
          {t("auth.register.submit", "Create account")}
          <ArrowRight size={20} weight="bold" />
        </SubmitButton>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[14px] text-[var(--kv-grey-dark)]">
          {t("auth.register.haveAccount", "Already have an account?")}{" "}
          <Link to="/login" className="text-[var(--kv-green)] font-bold">
            {t("auth.register.signIn", "Sign in")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
