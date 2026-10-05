import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../hooks/useLanguage";
import { CheckCircle, Info, Trash, Bell, Globe, Ruler, CaretRight, Warning } from "@phosphor-icons/react";
import { enableMockPushAlerts, disableMockPushAlerts, requestNotificationPermission } from "../services/notificationsService";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [units, setUnits] = useState(
    () => localStorage.getItem("krishiverse_units") || "metric",
  );
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("krishiverse_notifications");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleUnitChange = (e) => {
    const newUnits = e.target.value;
    setUnits(newUnits);
    localStorage.setItem("krishiverse_units", newUnits);
  };

  const handleNotificationToggle = async () => {
    const newVal = !notifications;
    
    if (newVal) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        alert(t("settings.notifications.denied", "Notification permission was denied."));
        return;
      }
      enableMockPushAlerts();
    } else {
      disableMockPushAlerts();
    }
    
    setNotifications(newVal);
    localStorage.setItem("krishiverse_notifications", JSON.stringify(newVal));
  };

  const handleClearCache = async () => {
    if (
      window.confirm(
        t(
          "settings.clearCache.confirm",
          "This will remove all your saved offline data. Are you sure?"
        )
      )
    ) {
      try {
        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }
        localStorage.clear();
        localStorage.setItem("krishiverse_units", units);
        localStorage.setItem("krishiverse_notifications", JSON.stringify(notifications));
        localStorage.setItem("i18nextLng", language);

        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 3000);
      } catch (err) {
        console.error("Failed to clear cache", err);
      }
    }
  };

  const currentLang = language?.startsWith("ta")
    ? "en"
    : language?.startsWith("hi")
      ? "en"
      : "en";

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full">
      <div className="px-1">
        <h2 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)]">Settings</h2>
      </div>

      <div className="flex flex-col gap-4">
          
        {/* General Settings Group */}
        <div className="flex flex-col gap-2">
           <h3 className="kv-section-h px-2">General</h3>
           <div className="kv-card border border-[var(--kv-divider)] !shadow-sm overflow-hidden p-0 px-2 divide-y divide-[var(--kv-divider)]">
              
              {/* Language */}
              <div className="flex items-center justify-between py-4 pl-2 pr-1">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--kv-off-white)] flex items-center justify-center text-[var(--kv-near-black)]">
                       <Globe size={20} weight="fill" />
                    </div>
                    <div>
                       <h3 className="text-[15px] font-bold text-[var(--kv-near-black)] leading-tight">
                         Language
                       </h3>
                    </div>
                 </div>
                 <select
                   className="kv-input !w-auto !min-w-[120px] !h-10 !text-[13px] bg-[var(--kv-off-white)] border-transparent"
                  value="en"
                  onChange={() => setLanguage("en")}
                 >
                   <option value="en">English</option>
                 </select>
              </div>

              {/* Units */}
              <div className="flex items-center justify-between py-4 pl-2 pr-1">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--kv-off-white)] flex items-center justify-center text-[var(--kv-near-black)]">
                       <Ruler size={20} weight="fill" />
                    </div>
                    <div>
                       <h3 className="text-[15px] font-bold text-[var(--kv-near-black)] leading-tight">
                         Units
                       </h3>
                    </div>
                 </div>
                 <select
                   className="kv-input !w-auto !min-w-[120px] !h-10 !text-[13px] bg-[var(--kv-off-white)] border-transparent"
                   value={units}
                   onChange={handleUnitChange}
                 >
                   <option value="metric">Metric (°C, km)</option>
                   <option value="imperial">Imperial (°F, mi)</option>
                 </select>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between py-4 pl-2 pr-1">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--kv-off-white)] flex items-center justify-center text-[var(--kv-near-black)]">
                       <Bell size={20} weight="fill" />
                    </div>
                    <div>
                       <h3 className="text-[15px] font-bold text-[var(--kv-near-black)] leading-tight flex items-center gap-2">
                         Alerts
                       </h3>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer mr-2">
                    <input type="checkbox" className="sr-only peer" checked={notifications} onChange={handleNotificationToggle} />
                    <div className="w-11 h-6 bg-[var(--kv-divider)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--kv-green)]"></div>
                 </label>
              </div>

           </div>
        </div>

        {/* Data & Storage */}
        <div className="flex flex-col gap-2 mt-2">
           <h3 className="kv-section-h px-2">Data</h3>
           <div className="kv-card border border-[var(--kv-divider)] !shadow-sm overflow-hidden p-0 px-2">
              <div 
                 className="flex flex-col items-start gap-4 py-4 px-2 w-full active:bg-[var(--kv-off-white)] transition-colors"
              >
                 <div className="flex flex-col w-full text-left">
                    <h3 className="text-[15px] font-bold text-[var(--kv-near-black)] leading-tight flex items-center gap-2">
                       <Warning size={18} weight="bold" className="text-[var(--kv-amber)]" />
                       Offline Data
                    </h3>
                    <p className="text-[13px] text-[var(--kv-grey-dark)] mt-1.5 leading-relaxed">
                       You can clear downloaded crop data to free up space. This resets offline access.
                    </p>
                 </div>
                 <button 
                   onClick={handleClearCache}
                   className="kv-btn-secondary h-10 border border-[var(--kv-red)] border-opacity-30 text-[var(--kv-red)] bg-white active:bg-[var(--kv-red-light)] w-full"
                 >
                    <Trash size={16} weight="bold" />
                    Clear Data
                 </button>
                 
                 {cacheCleared && (
                    <div className="w-full bg-[var(--kv-green-light)] text-[var(--kv-green)] border border-[var(--kv-green)] border-opacity-30 px-3 py-2 rounded-xl text-[12px] font-bold flex items-center gap-2">
                       <CheckCircle size={16} weight="fill" />
                       Data cleared successfully!
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Support */}
        <div className="flex flex-col gap-2 mt-2">
           <h3 className="kv-section-h px-2">Support</h3>
           <div className="kv-card border border-[var(--kv-divider)] !shadow-sm overflow-hidden p-0 px-2 divide-y divide-[var(--kv-divider)]">
              
              <div className="py-4 px-2">
                 <div className="bg-[var(--kv-green-light)] p-5 rounded-2xl border border-[var(--kv-green)] border-opacity-20 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-[var(--kv-green)] opacity-10">
                       <Info size={100} weight="fill" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-1">
                       <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--kv-green)]">
                          Agricultural Helpline
                       </span>
                       <span className="text-[24px] font-black font-[var(--font-heading)] text-[var(--kv-near-black)]">
                          1800-180-1551
                       </span>
                       <span className="text-[13px] text-[var(--kv-near-black)] font-medium mt-1">
                          Free helpline, available 24/7. Call for expert advice.
                       </span>
                    </div>
                 </div>
                 <div className="flex items-center justify-between mt-4 px-1">
                    <span className="text-[12px] font-bold text-[var(--kv-grey-mid)] uppercase tracking-wider">KrishiVerse App Version</span>
                    <span className="text-[12px] font-bold text-[var(--kv-near-black)] px-2 py-1 bg-[var(--kv-off-white)] rounded-lg">v2.0.0</span>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
