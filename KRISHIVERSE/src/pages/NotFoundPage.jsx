import React from "react";
import { Link } from "react-router-dom";
import { House, Plant, ArrowLeft } from "@phosphor-icons/react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 pt-8">
      <div className="w-20 h-20 rounded-full bg-[var(--kv-green-light)] flex items-center justify-center text-[var(--kv-green)]">
        <Plant size={40} weight="duotone" />
      </div>
      <h1 className="text-[28px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)]">
        Page not found
      </h1>
      <p className="text-[14px] text-[var(--kv-grey-mid)] max-w-xs leading-relaxed">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to="/" className="kv-btn-primary max-w-xs mt-2">
        <House size={20} weight="fill" />
        Go Home
      </Link>
    </div>
  );
}
