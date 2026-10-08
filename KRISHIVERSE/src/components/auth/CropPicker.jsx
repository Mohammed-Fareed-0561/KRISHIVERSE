import React from "react";
import { Plant } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

/**
 * Crop multi-select shared by onboarding and the profile editor.
 * Options come from the backend crop registry (GET /crops, cached offline) and
 * a free-text "other" field keeps the flow usable when the registry is
 * unreachable. The registry is context only — it never feeds the AI pipeline.
 */
export default function CropPicker({ options = [], selected = [], onToggle, other = "", onOtherChange, disabled = false }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.length > 0 ? (
          options.map((crop) => {
            const name = typeof crop === "string" ? crop : crop.name;
            const active = selected.includes(name);
            return (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(name)}
                aria-pressed={active}
                className={`px-4 h-10 rounded-full text-[13px] font-bold border transition-colors disabled:opacity-60 ${
                  active
                    ? "bg-[var(--kv-green)] text-white border-[var(--kv-green)]"
                    : "bg-white text-[var(--kv-grey-dark)] border-[var(--kv-divider)]"
                }`}
              >
                {name}
              </button>
            );
          })
        ) : (
          <p className="text-[12px] text-[var(--kv-grey-mid)]">
            {t("onboarding.cropsOffline", "Crop list unavailable offline — type yours below.")}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-bold text-[var(--kv-grey-dark)]">
          {t("onboarding.otherCrop", "Something else? Add it")}
        </span>
        <input
          className="kv-input h-[52px] rounded-[16px]"
          value={other}
          disabled={disabled}
          placeholder={t("onboarding.otherCropPlaceholder", "e.g. chilli")}
          onChange={(event) => onOtherChange(event.target.value)}
        />
      </label>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((crop) => (
            <li
              key={crop}
              className="px-3 h-8 rounded-full bg-[var(--kv-green-light)] text-[var(--kv-green)] text-[12px] font-bold flex items-center gap-1"
            >
              <Plant size={12} weight="fill" />
              {crop}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
