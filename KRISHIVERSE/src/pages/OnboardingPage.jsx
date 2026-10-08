import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  SignOut,
  Warning,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { getCrops } from "../services/api/cropService";
import { captureOnboardingEvent } from "../services/telemetry/farmerEvents";
import CropPicker from "../components/auth/CropPicker";

const TOTAL_STEPS = 6;

const DISTRICTS = [
  "Coimbatore", "Madurai", "Thanjavur", "Trichy", "Salem", "Erode",
  "Tirunelveli", "Thoothukudi", "Villupuram", "Vellore", "Kanchipuram",
  "Dindigul", "Krishnagiri", "Namakkal", "Karur", "Perambalur",
];

const IRRIGATION = ["well", "borewell", "canal", "drip", "sprinkler", "rainfed", "other"];

const LANGUAGE_OPTIONS = [
  { value: "ta", label: "தமிழ்" },
  { value: "tanglish", label: "Tanglish" },
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
];

function initialState(user) {
  return {
    language: user?.language || "ta",
    location: { district: user?.location?.district || "", state: user?.location?.state || "Tamil Nadu" },
    village: user?.village || "",
    farmSize: user?.farmSize || { value: "", unit: "acre" },
    crops: Array.isArray(user?.crops) ? user.crops : [],
    irrigation: user?.irrigation || "",
    experienceYears: user?.experienceYears ?? "",
    notifications: { sms: user?.notifications?.sms ?? true, push: user?.notifications?.push ?? true },
    unitPrefs: user?.unitPrefs || { area: "acre", temperature: "c" },
  };
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, saveOnboarding, logout, loading } = useAuthStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => initialState(user));
  const [cropOptions, setCropOptions] = useState([]);
  const [otherCrop, setOtherCrop] = useState("");
  const [fieldErr, setFieldErr] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [busy, setBusy] = useState(false);

  const startedRef = useRef(false);
  const completedRef = useRef(Boolean(user?.onboarding?.completedAt));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/onboarding" }, replace: true });
      return;
    }
    if (completedRef.current) {
      navigate("/", { replace: true });
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      captureOnboardingEvent("onboarding.started");
    }
    // Registry reuse: the same backend crop list the Crop Doctor uses, cached
    // in IndexedDB. Offline → free-text crop entry stays available.
    getCrops()
      .then((crops) => setCropOptions(Array.isArray(crops) ? crops : []))
      .catch(() => setCropOptions([]));
  }, [isAuthenticated, navigate]);

  // Leaving before finishing is abandonment — only the browser can see it.
  // Mount-only cleanup: re-running this on every step change would report the
  // farmer as "abandoned" each time they tapped Continue.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    return () => {
      if (!completedRef.current && startedRef.current) {
        captureOnboardingEvent("onboarding.abandoned", { metadata: { step: stepRef.current } });
      }
    };
  }, []);

  const stepTitles = useMemo(
    () => [
      t("onboarding.step1.title", "Language & district"),
      t("onboarding.step2.title", "Your farm"),
      t("onboarding.step3.title", "Your crops"),
      t("onboarding.step4.title", "Water & experience"),
      t("onboarding.step5.title", "Preferences"),
      t("onboarding.step6.title", "Review & finish"),
    ],
    [t],
  );

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErr) setFieldErr("");
    if (saveError) setSaveError(null);
  }

  function validate() {
    if (step === 1 && !form.location.district.trim()) {
      setFieldErr(t("onboarding.error.district", "Enter your district"));
      return false;
    }
    if (step === 2) {
      if (!form.village.trim()) {
        setFieldErr(t("onboarding.error.village", "Enter your village"));
        return false;
      }
      if (!form.farmSize.value || Number(form.farmSize.value) <= 0) {
        setFieldErr(t("onboarding.error.farmSize", "Enter your farm size"));
        return false;
      }
    }
    if (step === 3) {
      const crops = [...form.crops];
      if (otherCrop.trim()) crops.push(otherCrop.trim());
      if (crops.length === 0) {
        setFieldErr(t("onboarding.error.crops", "Pick at least one crop"));
        return false;
      }
    }
    if (step === 4 && !form.irrigation) {
      setFieldErr(t("onboarding.error.irrigation", "Choose how you irrigate"));
      return false;
    }
    return true;
  }

  function payload(status) {
    const crops = [...form.crops];
    if (otherCrop.trim() && !crops.includes(otherCrop.trim())) crops.push(otherCrop.trim());
    return {
      step,
      ...(status ? { status } : {}),
      profile: {
        language: form.language,
        location: { district: form.location.district.trim(), state: form.location.state },
        village: form.village.trim(),
        farmSize: {
          value: Number(form.farmSize.value) || 0,
          unit: form.farmSize.unit || "acre",
        },
        crops,
        ...(form.irrigation ? { irrigation: form.irrigation } : {}),
        ...(form.experienceYears !== "" ? { experienceYears: Number(form.experienceYears) } : {}),
        notifications: form.notifications,
        unitPrefs: form.unitPrefs,
      },
    };
  }

  async function persist(status) {
    setBusy(true);
    setSaveError(null);
    try {
      await saveOnboarding(payload(status));
      return true;
    } catch (err) {
      setSaveError(
        err?.isOffline
          ? t("onboarding.offline", "You are offline — your answers are kept here. Try again when you reconnect.")
          : err?.message || t("onboarding.saveFailed", "Could not save this step. Please try again."),
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleNext() {
    if (!validate()) return;
    if (step === TOTAL_STEPS) {
      const ok = await persist("completed");
      if (!ok) return;
      completedRef.current = true;
      navigate("/", { replace: true });
      return;
    }
    const ok = await persist();
    if (ok) setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  async function handleExit() {
    await persist("abandoned");
    navigate("/", { replace: true });
  }

  function toggleCrop(crop) {
    setForm((prev) => ({
      ...prev,
      crops: prev.crops.includes(crop) ? prev.crops.filter((item) => item !== crop) : [...prev.crops, crop],
    }));
    if (fieldErr) setFieldErr("");
  }

  if (!isAuthenticated) return null;

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-[var(--kv-off-white)] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-[var(--kv-green-light)] opacity-30 pointer-events-none blur-3xl" />

      {/* Header: progress + exit */}
      <header className="relative z-10 px-6 pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
            {t("onboarding.progress", "Step {{current}} of {{total}}", { current: step, total: TOTAL_STEPS })}
          </span>
          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--kv-grey-mid)] active:scale-95 transition-transform"
          >
            <SignOut size={14} weight="bold" />
            {t("onboarding.exit", "Save & exit")}
          </button>
        </div>
        <div
          className="h-2 w-full bg-[var(--kv-divider)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
          aria-label={t("onboarding.progressLabel", "Onboarding progress")}
        >
          <motion.div
            className="h-full bg-[var(--kv-green)] rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
          />
        </div>
      </header>

      <main className="relative z-10 flex-1 px-6 pt-6 pb-40 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            <h2 className="text-[24px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] mb-1">
              {stepTitles[step - 1]}
            </h2>
            <p className="text-[13px] text-[var(--kv-grey-mid)] mb-5">
              {t(`onboarding.step${step}.hint`, "This personalises advice for your farm.")}
            </p>

            {(fieldErr || saveError) && (
              <div
                role="alert"
                className="bg-[var(--kv-red-light)] border border-[var(--kv-red)] border-opacity-30 rounded-[14px] p-3 mb-4 flex items-start gap-2 text-[var(--kv-red)]"
              >
                <Warning size={16} weight="bold" className="mt-0.5 shrink-0" />
                <span className="text-[12px] font-medium leading-snug">{saveError || fieldErr}</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                    {t("onboarding.language", "Preferred language")}
                  </span>
                  <select
                    className="kv-input h-[52px] rounded-[16px]"
                    value={form.language}
                    onChange={(event) => update("language", event.target.value)}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                    {t("onboarding.district", "District")}
                  </span>
                  <input
                    className="kv-input h-[52px] rounded-[16px]"
                    list="kv-districts"
                    value={form.location.district}
                    placeholder={t("onboarding.districtPlaceholder", "e.g. Coimbatore")}
                    onChange={(event) => update("location", { ...form.location, district: event.target.value })}
                  />
                  <datalist id="kv-districts">
                    {DISTRICTS.map((district) => (
                      <option key={district} value={district} />
                    ))}
                  </datalist>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                    {t("onboarding.village", "Village")}
                  </span>
                  <input
                    className="kv-input h-[52px] rounded-[16px]"
                    value={form.village}
                    placeholder={t("onboarding.villagePlaceholder", "Your village")}
                    onChange={(event) => update("village", event.target.value)}
                  />
                </label>

                <div className="flex gap-3">
                  <label className="flex-1 flex flex-col gap-2">
                    <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                      {t("onboarding.farmSize", "Farm size")}
                    </span>
                    <input
                      className="kv-input h-[52px] rounded-[16px]"
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={form.farmSize.value}
                      onChange={(event) => update("farmSize", { ...form.farmSize, value: event.target.value })}
                    />
                  </label>
                  <label className="w-32 flex flex-col gap-2">
                    <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                      {t("onboarding.unit", "Unit")}
                    </span>
                    <select
                      className="kv-input h-[52px] rounded-[16px]"
                      value={form.farmSize.unit}
                      onChange={(event) => update("farmSize", { ...form.farmSize, unit: event.target.value })}
                    >
                      <option value="acre">{t("onboarding.acre", "Acre")}</option>
                      <option value="hectare">{t("onboarding.hectare", "Hectare")}</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <CropPicker
                options={cropOptions}
                selected={form.crops}
                onToggle={toggleCrop}
                other={otherCrop}
                onOtherChange={(value) => {
                  setOtherCrop(value);
                  if (fieldErr) setFieldErr("");
                }}
                disabled={busy || loading}
              />
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                    {t("onboarding.irrigation", "How do you water your farm?")}
                  </span>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("onboarding.irrigation", "How do you water your farm?")}>
                    {IRRIGATION.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={form.irrigation === option}
                        onClick={() => update("irrigation", option)}
                        className={`h-11 rounded-[14px] text-[13px] font-bold border transition-colors ${
                          form.irrigation === option
                            ? "bg-[var(--kv-green)] text-white border-[var(--kv-green)]"
                            : "bg-white text-[var(--kv-grey-dark)] border-[var(--kv-divider)]"
                        }`}
                      >
                        {t(`onboarding.irrigation.${option}`, option)}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                    {t("onboarding.experience", "Years of farming experience (optional)")}
                  </span>
                  <input
                    className="kv-input h-[52px] rounded-[16px]"
                    type="number"
                    min="0"
                    max="80"
                    inputMode="numeric"
                    value={form.experienceYears}
                    onChange={(event) => update("experienceYears", event.target.value)}
                  />
                </label>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
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
                        checked={form.notifications[item.key]}
                        onChange={(event) =>
                          update("notifications", { ...form.notifications, [item.key]: event.target.checked })
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                      {t("onboarding.areaUnit", "Area unit")}
                    </span>
                    <select
                      className="kv-input h-[52px] rounded-[16px]"
                      value={form.unitPrefs.area}
                      onChange={(event) => update("unitPrefs", { ...form.unitPrefs, area: event.target.value })}
                    >
                      <option value="acre">{t("onboarding.acre", "Acre")}</option>
                      <option value="hectare">{t("onboarding.hectare", "Hectare")}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
                      {t("onboarding.tempUnit", "Temperature")}
                    </span>
                    <select
                      className="kv-input h-[52px] rounded-[16px]"
                      value={form.unitPrefs.temperature}
                      onChange={(event) => update("unitPrefs", { ...form.unitPrefs, temperature: event.target.value })}
                    >
                      <option value="c">°C</option>
                      <option value="f">°F</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <ReviewRow label={t("onboarding.reviewLanguage", "Language")} value={LANGUAGE_OPTIONS.find((l) => l.value === form.language)?.label || form.language} />
                <ReviewRow label={t("onboarding.reviewDistrict", "District")} value={form.location.district || "—"} />
                <ReviewRow label={t("onboarding.reviewVillage", "Village")} value={form.village || "—"} />
                <ReviewRow
                  label={t("onboarding.reviewFarm", "Farm size")}
                  value={`${form.farmSize.value || "—"} ${form.farmSize.unit === "hectare" ? t("onboarding.hectare", "Hectare") : t("onboarding.acre", "Acre")}`}
                />
                <ReviewRow
                  label={t("onboarding.reviewCrops", "Crops")}
                  value={[...form.crops, otherCrop.trim()].filter(Boolean).join(", ") || "—"}
                />
                <ReviewRow label={t("onboarding.reviewIrrigation", "Irrigation")} value={form.irrigation ? t(`onboarding.irrigation.${form.irrigation}`, form.irrigation) : "—"} />
                <p className="text-[12px] text-[var(--kv-grey-mid)] pt-1">
                  {t("onboarding.reviewNote", "You can change any of this later from your profile.")}
                </p>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* Fixed action bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-[var(--kv-off-white)] border-t border-[var(--kv-divider)] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(current - 1, 1))}
              disabled={busy || loading}
              className="kv-btn-secondary h-[52px] w-16 flex items-center justify-center"
              aria-label={t("onboarding.back", "Back")}
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={busy || loading}
            className="kv-btn-primary h-[52px] flex-1 flex items-center justify-center gap-2 text-[16px]"
          >
            {busy || loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" aria-hidden="true" />
            ) : step === TOTAL_STEPS ? (
              <>
                {t("onboarding.finish", "Finish")}
                <CheckCircle size={20} weight="bold" />
              </>
            ) : (
              <>
                {t("onboarding.continue", "Continue")}
                <ArrowRight size={20} weight="bold" />
              </>
            )}
          </button>
        </div>
        {user?.email && (
          <p className="text-center text-[11px] text-[var(--kv-grey-mid)] mt-2 max-w-md mx-auto truncate">
            {user.email}
          </p>
        )}
      </div>

      {/* Hidden sign-out escape hatch for shared devices */}
      <button
        type="button"
        className="sr-only focus:not-sr-only fixed bottom-24 left-6 z-30 kv-btn-secondary h-10 px-4"
        onClick={() => logout()}
      >
        {t("auth.logout", "Sign out")}
      </button>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 bg-white border border-[var(--kv-divider)] rounded-[14px] px-4 py-3">
      <span className="text-[13px] font-bold text-[var(--kv-grey-mid)]">{label}</span>
      <span className="text-[13px] font-bold text-[var(--kv-near-black)] text-right">{value}</span>
    </div>
  );
}
