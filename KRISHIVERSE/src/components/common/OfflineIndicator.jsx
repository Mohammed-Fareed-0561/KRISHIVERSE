import React from "react";
import { useOffline } from "../../hooks/useOffline";

export default function OfflineIndicator() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div className="w-full bg-warning text-warning-content px-3 py-2 text-sm">
      You’re offline. Some data may be from cache.
    </div>
  );
}
