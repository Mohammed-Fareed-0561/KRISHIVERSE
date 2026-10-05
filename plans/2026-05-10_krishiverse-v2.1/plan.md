# KrishiVerse v2.1 — Improvement Plan

## Spec Header
- **App:** KrishiVerse — Offline-first Agricultural Advisory PWA
- **Version:** 2.1
- **Target:** Small-holder farmers in Tamil Nadu / South India
- **Platform:** PWA (React + Vite), Express + MongoDB backend
- **Smallest Scope:** Ship all 9 improvements as phased upgrades, keeping app < 20MB

## Non-Goals
- No iOS native app
- No blockchain / IoT integration (v3.0+)
- No full operational transform for collaboration
- No paid SMS provider (using Firebase free tier for OTP)

---

## Paths to Supplementary Guidelines
- React + Vite stack: https://raw.githubusercontent.com/memextech/templates/refs/heads/main/stack/react_website.md

---

## Decision Snapshot

| Decision | Choice | Reason |
|----------|--------|--------|
| Phone OTP provider | Firebase Auth | Free tier, handles sessions, minimal backend code |
| TF.js loading | Dynamic import | Keeps main bundle small — only loads on Diagnose page |
| Page loading | React.lazy + Suspense | Each page becomes its own JS chunk |
| @xenova/transformers | Keep, already isolated | Runs inside Web Worker — Vite auto-splits it |
| Offline news cache | IndexedDB via `idb` | Already used in app, consistent pattern |
| Push notifications | Web Push API + Service Worker | SW already set up, just needs real triggers |
| Onboarding | 3-step flow in-app | Language → Region → Crops, stored in localStorage |
| Weather advice | Rule-based tips layer | No API needed, pure logic on existing forecast data |

---

## Architecture at a Glance

```
KrishiVerse PWA
├── App.jsx               ← Lazy-loads ALL pages (React.lazy + Suspense)
├── pages/
│   ├── Home.jsx          ← Add CalendarPage to quick actions grid
│   ├── AskPage.jsx       ← Wire TTS speak() on AI responses + stop button
│   ├── WeatherPage.jsx   ← Add farming advice layer (contextual tips)
│   ├── NewsPage.jsx      ← Add IndexedDB cache + offline fallback UI
│   ├── DiagnosePage.jsx  ← TF.js now dynamically imported (not eager)
│   ├── LoginPage.jsx     ← Replace email/password → Firebase Phone OTP
│   ├── RegisterPage.jsx  ← Replace form → Firebase Phone OTP
│   └── OnboardingPage.jsx ← NEW: 3-step (Language → Region → Crops)
├── components/common/
│   └── InstallBanner.jsx ← NEW: PWA "Add to Home Screen" prompt banner
├── services/
│   ├── tfjsDiseaseService.js  ← TF.js converted to dynamic import
│   ├── notificationsService.js ← Wire real triggers (rain, mandi price)
│   └── firebase.js            ← NEW: Firebase Auth config
└── store/
    └── authStore.js      ← Updated: Firebase Phone OTP session handling
```

---

## Implementation Plan

### 🗜️ Phase 1 — App Size Reduction (DO FIRST)
**Goal:** Shrink initial JS bundle so app loads faster on 2G/3G

1. **Lazy-load all 15 pages** in `App.jsx` using `React.lazy()` + `Suspense`
   - Before: 1 giant bundle with all page code
   - After: Each page = separate JS chunk, only downloaded when visited
   - Add `PageLoader` spinner as Suspense fallback

2. **Dynamic import TensorFlow.js** in `tfjsDiseaseService.js`
   - Before: `import * as tf from "@tensorflow/tfjs"` — loads for ALL users
   - After: `await import("@tensorflow/tfjs")` — only loads when Diagnose page opened
   - Fix all `tf.xxx` calls to use lazily fetched reference

3. **Verify @xenova/transformers** — confirm it's Web Worker isolated
   - Used only in `worker.js` → Vite auto-splits into separate chunk ✅
   - No change needed

4. **Run build before/after** to confirm bundle size reduction

---

### 📅 Phase 2 — Quick Wins (Fast, High Value)
**Goal:** Surface hidden features, complete half-built ones

5. **Add CalendarPage to Home quick actions grid** (`Home.jsx`)
   - CalendarPage is fully built but missing from the home grid
   - Add entry to `QUICK_ACTIONS` array with `IconCalendar` icon

6. **Complete Voice TTS on AskPage** (`AskPage.jsx`)
   - `speak()` from `useVoice` is imported but never called on AI responses
   - After each AI message renders, auto-call `speak(response)`
   - Add stop-speaking button (🔇) next to each AI bubble
   - Respect user's selected language (Tamil/Hindi/English)

---

### 📲 Phase 3 — PWA Install Banner
**Goal:** Surface the "Add to Home Screen" prompt so farmers actually install it

7. **Create `InstallBanner.jsx`** component
   - Hook into browser's `beforeinstallprompt` event
   - Show a friendly bottom banner: *"Install KrishiVerse — works offline!"*
   - "Install" button triggers native prompt
   - "Later" button dismisses and saves to localStorage (don't show again for 3 days)
   - Already wired into `App.jsx` as `<InstallBanner />`

---

### 🌾 Phase 4 — Weather Farming Advice Layer
**Goal:** Make weather data actionable for farmers, not just informational

8. **Add contextual farming tips to `WeatherPage.jsx`**
   - Rule-based logic on existing forecast data (no new API needed)
   - Examples:
     - 🌧️ Rain tomorrow → "Avoid pesticide/fertilizer spraying today"
     - 🌡️ Temp > 38°C → "Irrigate crops early morning or evening"
     - 💨 Wind > 20 km/h → "Do not spray chemicals — drift risk"
     - ☀️ Clear + low humidity → "Good day for harvesting"
   - Show as a colored tip card below current weather
   - Works fully offline (logic only, no fetch)

---

### 📰 Phase 5 — News Offline Cache
**Goal:** News page shows something useful even without internet

9. **Add IndexedDB cache to `NewsPage.jsx`**
   - On successful fetch → save articles to IndexedDB (`news-cache` store)
   - On offline / fetch failure → load from IndexedDB cache
   - Show "📦 Showing cached news from [date]" badge when offline
   - If no cache exists yet → show helpful offline placeholder card

---

### 🔔 Phase 6 — Real Push Notifications
**Goal:** Replace mock alerts with notifications that actually help farmers

10. **Wire real triggers to existing notification infrastructure**
    - **Rain alert:** After weather fetch, if rain in next 24h → push "🌧️ Rain expected tomorrow. Avoid spraying."
    - **Mandi price threshold:** User sets price target on PricesPage → notify when crossed on next sync
    - **Scheme deadline:** Hardcode upcoming deadlines in schemes data → push 3 days before
    - Update `notificationsService.js` with real trigger functions
    - Add price watchlist UI to `PricesPage.jsx` (set alert icon per crop)

---

### 👋 Phase 7 — Onboarding Flow
**Goal:** First-time users get a relevant, personalized experience

11. **Create `OnboardingPage.jsx`** — 3 clean steps
    - **Step 1 — Language:** Pick Tamil / Telugu / Kannada / Hindi / English (saves to i18n + localStorage)
    - **Step 2 — Region:** Pick state/district (saves for weather & mandi price defaults)
    - **Step 3 — My Crops:** Select crops they grow (saves to localStorage, used in CalendarPage tracking)
    - "Get Started" completes onboarding, redirects to Home
    - On first app load, check `krishiverse_onboarded` in localStorage → redirect to `/onboarding` if not set
    - Route already added to `App.jsx` as `/onboarding`

---

### 🔐 Phase 8 — Firebase Phone OTP Auth
**Goal:** Replace email/password login with phone OTP — far more accessible for rural farmers

12. **Install + configure Firebase**
    ```
    npm install firebase
    ```
    - Create `src/services/firebase.js` with Firebase app + Auth init
    - Enable Phone Auth in Firebase Console

13. **Rewrite `LoginPage.jsx`**
    - Step 1: Enter phone number (with +91 prefix selector)
    - Step 2: Enter 6-digit OTP (invisible reCAPTCHA via Firebase)
    - On success: Firebase session token → update `authStore`
    - Keep existing UI style (large buttons, farmer-friendly)

14. **Rewrite `RegisterPage.jsx`**
    - Same Phone OTP flow for new users
    - After OTP verified: collect farmer name + crop (minimal friction)
    - Save profile to MongoDB via existing backend

15. **Update `authStore.js`**
    - Replace JWT/bcrypt logic with Firebase `onAuthStateChanged`
    - Persist Firebase user session (survives page refresh offline)

---

## Verification & Demo Script

After all phases complete, verify:

1. **Bundle size:** Run `npm run build` — confirm JS chunks are split, main bundle < 200KB gzipped
2. **Calendar:** Open Home → confirm Calendar tile visible → tap → see crop timeline
3. **Voice:** Open Ask → tap mic → speak question → see transcript → get AI answer → hear it read aloud
4. **PWA Banner:** Open in Chrome mobile → see install banner at bottom → tap Install
5. **Weather tips:** Open Weather → confirm farming advice card shows below forecast
6. **News offline:** Load news → turn off wifi → refresh → see cached articles
7. **Push notification:** Enable notifications in Settings → trigger rain condition → receive alert
8. **Onboarding:** Clear localStorage → refresh app → see 3-step onboarding flow
9. **Phone OTP:** Tap Login → enter phone number → receive OTP → enter code → logged in

---

## Deploy

- **Frontend:** `npm run deploy` (existing gh-pages script)
- **Backend:** Deploy to Railway / Render (existing Express server)
- **Firebase:** Configure Firebase project → enable Phone Auth → add web app config to `.env`

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

---

**Total estimated improvements:**
- 📦 Bundle size: ~40–60% reduction in initial load (lazy pages + dynamic TF.js)
- 🎤 Voice: Full input + output on Ask page
- 📲 PWA install rate: Surfaced to users for first time
- 🌾 Weather utility: Actionable farming tips added
- 📰 News: Works offline
- 🔔 Notifications: Real weather + price alerts
- 👋 Onboarding: Personalized first-time experience
- 🔐 Auth: Phone OTP — no email needed, works for all literacy levels
