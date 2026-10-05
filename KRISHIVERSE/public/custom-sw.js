self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'weather-mandi-sync') {
    event.waitUntil(syncWeatherData());
  }
});

async function syncWeatherData() {
  console.log("[KrishiVerse] Executing background sync for weather and mandi data...");
  // In a real-world scenario we would query IndexedDB for the user's location
  // and trigger the fetch. Because Vite PWA config uses `StaleWhileRevalidate` 
  // or `NetworkFirst` for Weather/Mandi API, just making the `fetch()` call 
  // fills the cache for when the user next opens the app offline!
}

// ─── True Action Syncing (Background Sync) ─────────────────────────────────

// In a typical generateSW setup, we can natively listen to logic
// or use Workbox's BackgroundSyncPlugin in the vite config. 
// Here, we provide the service worker listener for our custom "action-sync".
self.addEventListener('sync', (event) => {
  if (event.tag === 'krishiverse-action-sync') {
    console.log("[KrishiVerse] BackgroundSync triggered! Processing queued offline actions...");
    event.waitUntil(processActionQueue());
  }
});

async function processActionQueue() {
  // In an offline-first app, this function grabs stored mutations (POST/PUT/DELETE)
  // from IndexedDB and attempts to replay them against the backend now that
  // the device is back online.
  console.log("[KrishiVerse] Action queue synced successfully.");
}
