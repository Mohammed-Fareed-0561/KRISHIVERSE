import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  PencilSimple,
  ShieldCheck,
  SignOut,
  CloudSlash,
  Warning,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { getCrops } from "../services/api/cropService";
import { queueProfileEdit } from "../services/offline/profileOutbox";
import { flushSync } from "../services/sync/syncService";
import CropPicker from "../components/auth/CropPicker";

const LANGUAGE_LABELS = { ta: "தமிழ்", tanglish: "Tanglish", en: "English", hi: "हिन्दी" };
const IRRIGATION = ["well", "borewell", "canal", "drip", "sprinkler", "rainfed", "other"];

function initialForm(user) {
  return {
    name: user?.name || "",
    language: user?.language || "ta",
    district: user?.location?.district || "",
    village: user?.village || "",
    farmValue: user?.farmSize?.value ?? "",
    farmUnit: user?.farmSize?.unit || "acre",
    crops: Array.isArray(user?.crops) ? user.crops : [],
    irrigation: user?.irrigation || "",
    experienceYears: user?.experienceYears ?? "",
    sms: user?.notifications?.sms ?? true,
    push: user?.notifications?.push ?? true,
    areaUnit: user?.unitPrefs?.area || "acre",
    temperature: user?.unitPrefs?.temperature || "c",
  };
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateProfile, patchUser, logout, loading, error, clearError } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => initialForm(user));
  const [cropOptions, setCropOptions] = useState([]);
  const [otherCrop, setOtherCrop] = useState("");
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setForm(initialForm(user));
  }, [user]);

  useEffect(() => {
    getCrops()
      .then((crops) => setCropOptions(Array.isArray(crops) ? crops : []))
      .catch(() => setCropOptions([]));
    // Push anything this device queued while it was offline.
    if (typeof navigator === "undefined" || navigator.onLine) {
      flushSync().catch(() => {});
    }
  }, []);

  useEffect(() => () => clearError(), [clearError]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
    if (error) clearError();
  }

  function toggleCrop(crop) {
    setForm((prev) => ({
      ...prev,
      crops: prev.crops.includes(crop) ? prev.crops.filter((item) => item !== crop) : [...prev.crops, crop],
    }));
  }

  function payload() {
    const crops = [...form.crops];
    if (otherCrop.trim() && !crops.includes(otherCrop.trim())) crops.push(otherCrop.trim());
    return {
      name: form.name.trim(),
      language: form.language,
      location: { district: form.district.trim(), state: user?.location?.state || "Tamil Nadu" },
      village: form.village.trim(),
      farmSize: { value: Number(form.farmValue) || 0, unit: form.farmUnit },
      crops,
      ...(form.irrigation ? { irrigation: form.irrigation } : {}),
      ...(form.experienceYears !== "" ? { experienceYears: Number(form.experienceYears) } : {}),
      notifications: { sms: form.sms, push: form.push },
      unitPrefs: { area: form.areaUnit, temperature: form.temperature },
    };
  }

  async function handleSave(event) {
    event.preventDefault();
    const profile = payload();
    try {
      await updateProfile(profile);
      setEditing(false);
      setOtherCrop("");
      setNotice({ kind: "saved", message: t("profile.saved", "Profile updated.") });
    } catch (err) {
      if (err?.isOffline || err?.code === "NETWORK_ERROR") {
        // Offline: queue the edit and apply it locally — the outbox syncs the
        // change when the device reconnects (server-wins-if-newer).
        await queueProfileEdit(profile);
        patchUser(profile);
        setEditing(false);
        setOtherCrop("");
        setNotice({ kind: "queued", message: t("profile.queued", "Saved on this device — it will sync when you are back online.") });
      } else {
        setNotice({ kind: "error", message: err?.message || t("profile.failed", "Could not save your changes.") });
      }
    }
  }

  if (!user) return null;

  const rows = [
    { label: t("profile.village", "Village"), value: user.village || "—" },
    { label: t("profile.district", "District"), value: user.location?.district || "—" },
    {
      label: t("profile.farmSize", "Farm size"),
      value: user.farmSize?.value ? `${user.farmSize.value} ${user.farmSize.unit === "hectare" ? t("onboarding.hectare", "Hectare") : t("onboarding.acre", "Acre")}` : "—",
    },
    { label: t("profile.crops", "Crops"), value: (user.crops || []).join(", ") || "—" },
    { label: t("profile.irrigation", "Irrigation"), value: user.irrigation ? t(`onboarding.irrigation.${user.irrigation}`, user.irrigation) : "—" },
    { label: t("profile.experience", "Experience"), value: user.experienceYears != null ? `${user.experienceYears} yrs` : "—" },
    { label: t("auth.field.language", "Language"), value: LANGUAGE_LABELS[user.language] || user.language },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Identity */}
      <section className="kv-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--kv-green)] text-white flex items-center justify-center text-[22px] font-black shrink-0">
            {(user.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] truncate">
              {user.name}
            </h1>
            <p className="text-[13px] text-[var(--kv-grey-mid)] truncate">{user.email}</p>
            <div className="mt-2">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--kv-green)]">
                  <ShieldCheck size={14} weight="fill" />
                  {t("profile.verified", "Email verified")}
                </span>
              ) : (
                <Link
                  to="/verify"
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--kv-amber)] underline"
                >
                  <Warning size={14} weight="bold" />
                  {t("profile.unverified", "Verify your email")}
                </Link>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="kv-btn-secondary h-10 px-3 text-[13px] flex items-center gap-1.5 shrink-0"
          >
            <PencilSimple size={15} weight="bold" />
            {editing ? t("profile.cancel", "Cancel") : t("profile.edit", "Edit")}
          </button>
        </div>
      </section>

      {/* Notice */}
      {notice && (
        <div
          role="status"
          className={`rounded-[16px] p-3 flex items-start gap-2 text-[13px] font-medium border ${
            notice.kind === "error"
              ? "bg-[var(--kv-red-light)] border-[var(--kv-red)] border-opacity-30 text-[var(--kv-red)]"
              : notice.kind === "queued"
                ? "bg-[var(--kv-amber-light)] border-[var(--kv-amber)] border-opacity-40 text-[var(--kv-grey-dark)]"
                : "bg-[var(--kv-green-light)] border-[var(--kv-green)] border-opacity-30 text-[var(--kv-green)]"
          }`}
        >
          {notice.kind === "queued" ? (
            <CloudSlash size={16} weight="bold" className="mt-0.5 shrink-0" />
          ) : notice.kind === "error" ? (
            <Warning size={16} weight="bold" className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {error && !notice && (
        <div role="alert" className="bg-[var(--kv-red-light)] border border-[var(--kv-red)] border-opacity-30 rounded-[16px] p-3 flex items-start gap-2 text-[var(--kv-red)] text-[13px]">
          <Warning size={16} weight="bold" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="kv-card p-5 space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("auth.field.name", "Full name")}</span>
            <input className="kv-input h-[52px] rounded-[16px]" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("profile.village", "Village")}</span>
              <input className="kv-input h-[52px] rounded-[16px]" value={form.village} onChange={(e) => update("village", e.target.value)} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("profile.district", "District")}</span>
              <input className="kv-input h-[52px] rounded-[16px]" value={form.district} onChange={(e) => update("district", e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("profile.farmSize", "Farm size")}</span>
              <input
                className="kv-input h-[52px] rounded-[16px]"
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={form.farmValue}
                onChange={(e) => update("farmValue", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("onboarding.unit", "Unit")}</span>
              <select className="kv-input h-[52px] rounded-[16px]" value={form.farmUnit} onChange={(e) => update("farmUnit", e.target.value)}>
                <option value="acre">{t("onboarding.acre", "Acre")}</option>
                <option value="hectare">{t("onboarding.hectare", "Hectare")}</option>
              </select>
            </label>
          </div>

          <div>
            <span className="text-[13px] font-bold text-[var(--kv-grey-dark)] block mb-2">{t("profile.crops", "Crops")}</span>
            <CropPicker
              options={cropOptions}
              selected={form.crops}
              onToggle={toggleCrop}
              other={otherCrop}
              onOtherChange={setOtherCrop}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("profile.irrigation", "Irrigation")}</span>
              <select className="kv-input h-[52px] rounded-[16px]" value={form.irrigation} onChange={(e) => update("irrigation", e.target.value)}>
                <option value="">{t("profile.select", "Select")}</option>
                {IRRIGATION.map((option) => (
                  <option key={option} value={option}>
                    {t(`onboarding.irrigation.${option}`, option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("profile.experience", "Experience")}</span>
              <input
                className="kv-input h-[52px] rounded-[16px]"
                type="number"
                min="0"
                max="80"
                inputMode="numeric"
                value={form.experienceYears}
                onChange={(e) => update("experienceYears", e.target.value)}
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">{t("auth.field.language", "Language")}</span>
            <select className="kv-input h-[52px] rounded-[16px]" value={form.language} onChange={(e) => update("language", e.target.value)}>
              {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="kv-card p-4 space-y-3">
            {[
              { key: "sms", label: t("onboarding.notifySms", "SMS alerts") },
              { key: "push", label: t("onboarding.notifyPush", "App notifications") },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium text-[var(--kv-grey-dark)]">{item.label}</span>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={form[item.key]}
                  onChange={(e) => update(item.key, e.target.checked)}
                />
              </label>
            ))}
          </div>

          <button type="submit" className="kv-btn-primary h-[52px] w-full text-[15px] flex items-center justify-center gap-2" disabled={loading}>
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" aria-hidden="true" />
            ) : (
              <>
                <CheckCircle size={18} weight="bold" />
                {t("profile.save", "Save changes")}
              </>
            )}
          </button>
        </form>
      ) : (
        <section className="kv-card p-5 divide-y divide-[var(--kv-divider)]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-[13px] font-bold text-[var(--kv-grey-mid)]">{row.label}</span>
              <span className="text-[13px] font-bold text-[var(--kv-near-black)] text-right">{row.value}</span>
            </div>
          ))}
        </section>
      )}

      {/* Account actions */}
      <section className="kv-card p-5 space-y-3">
        <Link to="/forgot" className="block text-[14px] font-bold text-[var(--kv-green)]">
          {t("profile.changePassword", "Change password")}
        </Link>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/welcome", { replace: true });
          }}
          className="kv-btn-secondary h-[50px] w-full flex items-center justify-center gap-2 text-[var(--kv-red)]"
        >
          <SignOut size={18} weight="bold" />
          {t("auth.logout", "Sign out")}
        </button>
      </section>
    </div>
  );
}
