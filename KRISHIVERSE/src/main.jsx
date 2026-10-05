import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";
import "./i18n/i18n.js";
import { registerSW } from "virtual:pwa-register";
import { initSyncListener } from "./services/sync/syncService";

// Offline-first sync: flush queued local writes whenever the device is online.
initSyncListener();

if ("serviceWorker" in navigator) {
  registerSW({
    immediate: false,
    async onRegistered(registration) {
      if (
        !registration ||
        !("periodicSync" in registration) ||
        !("permissions" in navigator)
      ) {
        return;
      }

      try {
        const permission = await navigator.permissions.query({
          name: "periodic-background-sync",
        });

        if (permission.state !== "granted") {
          return;
        }

        await registration.periodicSync.register("weather-mandi-sync", {
          minInterval: 12 * 60 * 60 * 1000,
        });
      } catch (error) {
        console.warn("Periodic background sync unavailable:", error);
      }
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
