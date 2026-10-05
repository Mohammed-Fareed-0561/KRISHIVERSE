import React from "react";
import { Headset, PhoneCall, WarningCircle, CaretRight, Info } from "@phosphor-icons/react";

const HELPLINES = [
  {
    id: "kisan-call-center",
    title: "Kisan Call Center",
    number: "1800-180-1551",
    desc: "Toll-free agricultural advisory service.",
    type: "emergency",
  },
  {
    id: "pm-kisan",
    title: "PM-Kisan Helpline",
    number: "155261",
    desc: "Assistance regarding PM-Kisan scheme and payments.",
    type: "normal",
  },
  {
    id: "crop-insurance",
    title: "Crop Insurance",
    number: "14447",
    desc: "PMFBY crop insurance claims and support.",
    type: "normal",
  },
  {
    id: "agri-clinic",
    title: "Agri Clinic",
    number: "1800-425-1556",
    desc: "Consultation with local agricultural experts.",
    type: "normal",
  },
];

export default function HelplinePage() {
  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <div>
        <h1 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] flex items-center gap-2">
          <Headset weight="fill" size={28} className="text-[var(--kv-green)]" />
          Kisan Helpline
        </h1>
        <p className="text-[13px] text-[var(--kv-grey-mid)] mt-1">
          Tap directly to call agricultural support services.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {HELPLINES.map((helpline) => (
          <a
            key={helpline.id}
            href={`tel:${helpline.number}`}
            className={`kv-card flex items-center gap-4 p-4 border active:scale-[0.98] transition-transform ${
              helpline.type === "emergency"
                ? "border-[var(--kv-amber)] border-opacity-30 bg-[var(--kv-amber-light)]"
                : "border-[var(--kv-divider)]"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-[16px] flex items-center justify-center shrink-0 ${
                helpline.type === "emergency"
                  ? "bg-[var(--kv-amber)] text-white"
                  : "bg-[var(--kv-green-light)] text-[var(--kv-green)]"
              }`}
            >
              <PhoneCall size={28} weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[15px] text-[var(--kv-near-black)] leading-tight">
                  {helpline.title}
                </h3>
                {helpline.type === "emergency" && (
                  <WarningCircle size={16} weight="fill" className="text-[var(--kv-amber)] shrink-0" />
                )}
              </div>
              <p className={`font-black text-[20px] tracking-wide mt-1 ${
                helpline.type === "emergency" ? "text-[var(--kv-amber)]" : "text-[var(--kv-green)]"
              }`}>
                {helpline.number}
              </p>
              <p className="text-[12px] text-[var(--kv-grey-mid)] mt-1 line-clamp-1">{helpline.desc}</p>
            </div>
            <CaretRight size={20} className="text-[var(--kv-grey-mid)] shrink-0" />
          </a>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 bg-[var(--kv-blue-light)] border border-[var(--kv-blue)] border-opacity-20 rounded-[16px]">
        <Info size={22} weight="fill" className="text-[var(--kv-blue)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--kv-grey-dark)] leading-relaxed">
          <strong className="text-[var(--kv-near-black)]">Operating Hours:</strong> Most government helplines are available from 6:00 AM to 10:00 PM. Calls are free of charge from any network.
        </p>
      </div>
    </div>
  );
}
