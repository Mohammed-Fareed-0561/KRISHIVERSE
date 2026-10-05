import React from "react";
import { Drone, Info, PhoneCall } from "@phosphor-icons/react";

const PROVIDERS = [
  { name: "AgriDrone TN", location: "Coimbatore", phone: "9876543210", service: "Crop spraying" },
  { name: "SkyFarm Services", location: "Erode", phone: "9876543211", service: "Field mapping" },
  { name: "GreenWing Drones", location: "Salem", phone: "9876543212", service: "Pest monitoring" },
];

export default function DronePage() {
  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <div>
        <h1 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] flex items-center gap-2">
          <Drone weight="fill" size={28} className="text-[var(--kv-green)]" />
          Drone Technology
        </h1>
        <p className="text-[13px] text-[var(--kv-grey-mid)] mt-1">
          Learn about drone farming and find local service providers.
        </p>
      </div>

      <div className="kv-card border border-[var(--kv-blue)] border-opacity-20 bg-[var(--kv-blue-light)] p-4 flex gap-3">
        <Info size={22} weight="fill" className="text-[var(--kv-blue)] shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-[14px] text-[var(--kv-near-black)]">What drones can do for farmers</h3>
          <ul className="text-[13px] text-[var(--kv-grey-dark)] mt-2 space-y-1.5 list-disc list-inside">
            <li>Precision pesticide and fertilizer spraying</li>
            <li>Crop health monitoring with aerial imaging</li>
            <li>Reduced labour cost and faster field coverage</li>
            <li>Early pest and disease detection</li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="kv-section-h mb-3">Local Providers</h2>
        <div className="flex flex-col gap-3">
          {PROVIDERS.map((provider) => (
            <div
              key={provider.phone}
              className="kv-card border border-[var(--kv-divider)] !shadow-sm p-4 flex items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-bold text-[15px] text-[var(--kv-near-black)]">{provider.name}</h3>
                <p className="text-[12px] text-[var(--kv-grey-mid)] mt-0.5">{provider.location} · {provider.service}</p>
              </div>
              <a
                href={`tel:${provider.phone}`}
                className="w-11 h-11 rounded-full bg-[var(--kv-green-light)] text-[var(--kv-green)] flex items-center justify-center active:scale-95 shrink-0"
              >
                <PhoneCall size={20} weight="fill" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
