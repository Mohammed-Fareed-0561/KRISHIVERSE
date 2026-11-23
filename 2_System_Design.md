# KrishiVerse - System Design Document

**Version:** 2.0  
**Date:** April 2026  
**Architect:** CodeNest Team  

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FARMER'S DEVICE (PWA)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────────────────┐   │
│  │   React UI       │      │  Service Worker             │   │
│  │   (Vite)         │─────→│  • Offline caching          │   │
│  │                  │      │  • Background sync          │   │
│  └──────────────────┘      │  • Push notifications       │   │
│         │                  └──────────────────────────────┘   │
│         │                                                      │
│    ┌────▼────────────────────────────────────────────┐        │
│    │      STATE MANAGEMENT (Zustand)                 │        │
│    │  • User context                                 │        │
│    │  • Chat history                                 │        │
│    │  • Weather cache                                │        │
│    │  • Mandi prices cache                           │        │
│    │  • Sync queue                                   │        │
│    └────┬─────────────────────────────────────────────┘        │
│         │                                                      │
│    ┌────▼─────────────────────────────────────────────┐       │
│    │       OFFLINE DATA LAYER                         │       │
│    ├──────────────────────────────────────────────────┤       │
│    │  IndexedDB:                                      │       │
│    │  • weather_forecast (indexed by date)           │       │
│    │  • mandi_prices (indexed by crop_id)            │       │
│    │  • shops (indexed by type, location)            │       │
│    │  • chat_history (indexed by timestamp)          │       │
│    │  • disease_diagnoses (indexed by date)          │       │
│    │  • sync_queue (items awaiting upload)           │       │
│    └────┬──────────────────────────────────────────────┘       │
│         │                                                      │
│    ┌────▼──────────────────────────────────────────────┐      │
│    │   LOCAL AI MODELS                                │      │
│    ├──────────────────────────────────────────────────┤      │
│    │  • TensorFlow.js Plant Disease CNN (ONNX)       │      │
│    │  • Ollama Local LLM (Mistral 7B)                │      │
│    │  Both run entirely on device, offline           │      │
│    └────┬──────────────────────────────────────────────┘      │
│         │                                                      │
│         │ ┌──────────────────────────────────────┐           │
│         └─┤ WHEN ONLINE (Sync & Cloud APIs)      │           │
│           ├──────────────────────────────────────┤           │
│           │ • OpenWeatherMap (7-day forecast)    │           │
│           │ • AGMARK (mandi prices)              │           │
│           │ • Google Places (shop locator)       │           │
│           │ • Claude API (disease verification)  │           │
│           │ • Backend sync (user data)           │           │
│           └──────────────────────────────────────┘           │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Component Architecture

### 2.1 Frontend Layer (React + Vite)

**Folder Structure:**
```
src/
├── components/
│   ├── Ask/
│   │   ├── AskInput.jsx
│   │   ├── ChatHistory.jsx
│   │   └── ChatResponse.jsx
│   ├── Diagnose/
│   │   ├── ImageUpload.jsx
│   │   ├── DiseaseResult.jsx
│   │   └── TreatmentGuide.jsx
│   ├── Weather/
│   │   ├── WeatherCard.jsx
│   │   ├── ForecastGraph.jsx
│   │   └── WeatherAlert.jsx
│   ├── Mandi/
│   │   ├── PriceChart.jsx
│   │   ├── PriceComparison.jsx
│   │   └── PriceAlert.jsx
│   ├── Maps/
│   │   ├── MapView.jsx
│   │   ├── ShopCard.jsx
│   │   └── ShopFilter.jsx
│   ├── Schemes/
│   │   ├── SchemeList.jsx
│   │   ├── SchemeDetail.jsx
│   │   ├── EligibilityChecker.jsx
│   │   └── ApplicationGuide.jsx
│   ├── Drone/
│   │   ├── DroneInfo.jsx
│   │   ├── ProviderDirectory.jsx
│   │   └── CostAnalysis.jsx
│   ├── Common/
│   │   ├── Header.jsx
│   │   ├── Navigation.jsx
│   │   ├── LanguageSwitch.jsx
│   │   ├── OfflineIndicator.jsx
│   │   └── LoadingSpinner.jsx
│   └── Layout/
│       ├── MainLayout.jsx
│       └── ErrorBoundary.jsx
│
├── hooks/
│   ├── useWeather.js (fetch + cache weather)
│   ├── useMandi.js (fetch + cache prices)
│   ├── useShops.js (query nearby shops)
│   ├── useDiseaseDetection.js (TensorFlow.js)
│   ├── useChat.js (Ollama local LLM)
│   ├── useOffline.js (online/offline state)
│   └── useLanguage.js (i18next)
│
├── services/
│   ├── api/
│   │   ├── weatherService.js
│   │   ├── mandiService.js
│   │   ├── placesService.js
│   │   ├── claudeService.js (optional premium)
│   │   └── backendSync.js
│   ├── db/
│   │   ├── indexeddb.js (wrapper)
│   │   ├── migrations.js
│   │   └── schemas.js
│   ├── ai/
│   │   ├── diseaseModel.js (TensorFlow.js)
│   │   ├── chatModel.js (Ollama)
│   │   └── imageProcessor.js
│   ├── offline/
│   │   ├── syncQueue.js
│   │   ├── cacheManager.js
│   │   └── serviceWorker.js
│   └── i18n/
│       ├── i18n.js
│       └── translations/
│           ├── ta.json (Tamil)
│           ├── en.json (English)
│           ├── te.json (Telugu)
│           ├── kn.json (Kannada)
│           └── hi.json (Hindi)
│
├── store/
│   ├── userStore.js (user preferences, location)
│   ├── weatherStore.js (cached weather)
│   ├── mandiStore.js (cached prices)
│   ├── chatStore.js (chat history)
│   ├── syncStore.js (offline sync queue)
│   └── appStore.js (global app state)
│
├── utils/
│   ├── formatting.js
│   ├── validation.js
│   ├── geoLocation.js
│   ├── imageCompression.js
│   └── constants.js
│
├── pages/
│   ├── HomePage.jsx
│   ├── AskPage.jsx
│   ├── DiagnosePage.jsx
│   ├── WeatherPage.jsx
│   ├── MandiPage.jsx
│   ├── MapsPage.jsx
│   ├── SchemesPage.jsx
│   ├── DronePage.jsx
│   ├── SettingsPage.jsx
│   └── OfflinePage.jsx
│
├── styles/
│   ├── tailwind.config.js
│   ├── global.css
│   └── animations.css
│
├── App.jsx
├── main.jsx
└── index.html
```

**Key Libraries:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "vite": "^5.0.0",
    "@tensorflow/tfjs": "^4.10.0",
    "@tensorflow/tfjs-converter": "^4.10.0",
    "@tensorflow/tfjs-backend-webgl": "^4.10.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "i18next": "^23.7.0",
    "react-i18next": "^13.4.0",
    "axios": "^1.6.0",
    "daisyui": "^4.6.0",
    "tailwindcss": "^3.3.0",
    "tabler-icons-react": "^1.60.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0"
  }
}
```

---

### 2.2 Offline Data Layer (IndexedDB Schema)

```javascript
// Database: "KrishiVerse"
// Version: 1

const dbSchema = {
  // Object Store 1: Weather
  weather_forecast: {
    keyPath: "id",
    indexes: [
      { name: "date", keyPath: "date", unique: false },
      { name: "location", keyPath: "location", unique: false },
      { name: "expires_at", keyPath: "expires_at", unique: false }
    ],
    structure: {
      id: "uuid",
      location: "string",
      date: "Date",
      temp_min: "number",
      temp_max: "number",
      humidity: "number",
      rainfall: "number",
      wind_speed: "number",
      condition: "string (rainy/cloudy/sunny)",
      alerts: "array",
      farming_advice: "string",
      source: "string (OpenWeatherMap)",
      cached_at: "Date",
      expires_at: "Date" // 7 days from fetch
    }
  },

  // Object Store 2: Mandi Prices
  mandi_prices: {
    keyPath: "id",
    indexes: [
      { name: "crop_id", keyPath: "crop_id", unique: false },
      { name: "mandi_id", keyPath: "mandi_id", unique: false },
      { name: "date", keyPath: "date", unique: false },
      { name: "expires_at", keyPath: "expires_at", unique: false }
    ],
    structure: {
      id: "uuid",
      crop_id: "string",
      crop_name: "string",
      mandi_id: "string",
      mandi_name: "string",
      price_per_kg: "number",
      price_per_quintal: "number",
      trend: "string (up/down/stable)",
      min_price: "number",
      max_price: "number",
      avg_price: "number",
      volume_traded: "number",
      date: "Date",
      cached_at: "Date",
      expires_at: "Date" // 7 days
    }
  },

  // Object Store 3: Shops (Fertilizer, Seeds, Drone Services)
  shops: {
    keyPath: "id",
    indexes: [
      { name: "type", keyPath: "type", unique: false },
      { name: "location", keyPath: "location", unique: false },
      { name: "distance", keyPath: "distance", unique: false },
      { name: "latitude", keyPath: "latitude", unique: false },
      { name: "longitude", keyPath: "longitude", unique: false }
    ],
    structure: {
      id: "uuid",
      type: "string (fertilizer/seeds/drone_service/input_center/govt_office)",
      name: "string",
      address: "string",
      latitude: "number",
      longitude: "number",
      phone: "string",
      email: "string",
      hours: "string",
      products: "array",
      rating: "number (0-5)",
      reviews: "number",
      distance: "number (km from user)",
      cached_at: "Date",
      last_updated: "Date"
    }
  },

  // Object Store 4: Chat History
  chat_history: {
    keyPath: "id",
    indexes: [
      { name: "timestamp", keyPath: "timestamp", unique: false },
      { name: "model", keyPath: "model", unique: false }
    ],
    structure: {
      id: "uuid",
      user_message: "string",
      ai_response: "string",
      model: "string (ollama/claude)",
      language: "string",
      timestamp: "Date",
      confidence: "number (0-1)",
      is_useful: "boolean (user feedback)"
    }
  },

  // Object Store 5: Disease Diagnoses
  disease_diagnoses: {
    keyPath: "id",
    indexes: [
      { name: "timestamp", keyPath: "timestamp", unique: false },
      { name: "crop_type", keyPath: "crop_type", unique: false }
    ],
    structure: {
      id: "uuid",
      image_blob: "Blob (image data)",
      image_url: "string (cached local URL)",
      crop_type: "string",
      disease_name: "string",
      confidence: "number (0-1)",
      treatment: "string",
      pesticide_recommended: "string",
      severity: "string (mild/moderate/severe)",
      timestamp: "Date",
      model_used: "string (local_cnn/claude)",
      verified_by_claude: "boolean"
    }
  },

  // Object Store 6: Government Schemes
  govt_schemes: {
    keyPath: "id",
    indexes: [
      { name: "scheme_id", keyPath: "scheme_id", unique: true },
      { name: "category", keyPath: "category", unique: false }
    ],
    structure: {
      id: "uuid",
      scheme_id: "string",
      scheme_name: "string",
      description: "string",
      category: "string (subsidy/insurance/loan)",
      eligibility: "array",
      required_docs: "array",
      subsidy_amount: "string",
      application_link: "string",
      application_deadline: "Date",
      contact_details: "object",
      how_to_apply: "string (markdown)",
      video_url: "string (YouTube/local)",
      pdf_url: "string",
      last_updated: "Date"
    }
  },

  // Object Store 7: Sync Queue (Offline actions to sync when online)
  sync_queue: {
    keyPath: "id",
    indexes: [
      { name: "timestamp", keyPath: "timestamp", unique: false },
      { name: "status", keyPath: "status", unique: false }
    ],
    structure: {
      id: "uuid",
      action: "string (create_chat_history/save_diagnosis/set_price_alert)",
      data: "object",
      timestamp: "Date",
      status: "string (pending/synced/failed)",
      retry_count: "number",
      last_error: "string"
    }
  },

  // Object Store 8: User Preferences
  user_preferences: {
    keyPath: "key",
    indexes: [],
    structure: {
      key: "string (language/location/crop_types)",
      value: "any",
      updated_at: "Date"
    }
  }
};
```

---

### 2.3 API Specifications

#### 2.3.1 OpenWeatherMap API
```javascript
// Endpoint: https://api.openweathermap.org/data/2.5/forecast
// Method: GET
// Auth: ?appid={API_KEY}

// Request:
{
  lat: 11.0168, // farmer's location
  lon: 76.9558,
  units: "metric",
  cnt: 56 // 7 days * 8 (every 3 hours)
}

// Response:
{
  list: [
    {
      dt: 1234567890,
      main: {
        temp: 28.5,
        humidity: 75,
        pressure: 1013
      },
      rain: { "3h": 5.2 }, // mm rainfall
      wind: { speed: 12 },
      clouds: { all: 45 },
      weather: [{ main: "Rainy", description: "light rain" }],
      visibility: 10000,
      pop: 0.8 // probability of precipitation
    }
  ]
}

// Cache: 24 hours
// Refresh: Once daily at 6 AM
```

#### 2.3.2 AGMARK Mandi Prices API
```javascript
// Source: https://agmarknet.gov.in/SearchCmmMkt.aspx
// OR: https://spot.gov.in (Tamil Nadu specific)
// Method: GET / Web Scraping

// Response structure (standardized):
{
  mandis: [
    {
      id: "mandi_tn_coimbatore",
      name: "Coimbatore Agricultural Market",
      state: "Tamil Nadu",
      location: { lat: 11.0168, lon: 76.9558 }
    }
  ],
  prices: [
    {
      crop_id: "rice_paddy",
      crop_name: "Rice (Paddy)",
      crop_variety: "Basmati",
      mandi_id: "mandi_tn_coimbatore",
      price_per_kg: 42.5,
      price_per_quintal: 4250,
      min_price: 40,
      max_price: 45,
      avg_price: 42.8,
      volume_traded: 1200, // quintals
      trade_date: "2024-04-01",
      grade: "A"
    }
  ]
}

// Cache: 24 hours (daily update at 7 AM)
// Fallback: Show yesterday's price if today unavailable
```

#### 2.3.3 Google Places API (Shop Locator)
```javascript
// Endpoint: https://maps.googleapis.com/maps/api/place/nearbysearch/json
// Method: GET
// Auth: ?key={GOOGLE_PLACES_KEY}

// Request:
{
  location: "11.0168,76.9558",
  radius: 5000, // 5 km
  type: "store", // or "pharmacy" for input centers
  keyword: "fertilizer" // or "seeds", "agricultural", "drone"
}

// Response:
{
  results: [
    {
      name: "Krishnan Fertilizers",
      place_id: "ChIJ...",
      geometry: { location: { lat: 11.02, lng: 76.96 } },
      formatted_address: "123 Market St, Coimbatore",
      opening_hours: {
        weekday_text: ["Mon: 9 AM–6 PM", ...],
        open_now: true
      },
      rating: 4.5,
      user_ratings_total: 45,
      vicinity: "Coimbatore",
      types: ["store", "point_of_interest"]
    }
  ],
  next_page_token: "..."
}

// Cache: 1 week
// Free tier: 28,500 requests/month
```

#### 2.3.4 Claude API (Optional Premium - Disease Verification)
```javascript
// Endpoint: https://api.anthropic.com/v1/messages
// Method: POST
// Auth: Bearer {CLAUDE_API_KEY}

// Request:
{
  model: "claude-opus-4-6",
  max_tokens: 500,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: "..." }
        },
        {
          type: "text",
          text: "This leaf has yellowing and brown spots. Identify the disease and suggest treatment. Language: Tamil"
        }
      ]
    }
  ]
}

// Response:
{
  content: [
    {
      type: "text",
      text: "Disease: Leaf Spot. Treatment: Spray carbendazim 50 WP..."
    }
  ],
  usage: { input_tokens: 1500, output_tokens: 200 }
}

// Cost: ~₹0.002-0.003 per image (~$0.000025)
// Used only when online (optional premium feature)
```

---

### 2.4 Service Worker & Offline Sync

```javascript
// public/service-worker.js
// Cache static assets, handle offline, sync queue

const CACHE_VERSION = "krishiverse-v1";
const CACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/app.js", // bundled React app
  "/assets/app.css",
  "/images/icons/*.svg"
];

// Install: Cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: try network first, fallback to cache
  if (url.pathname.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  } else {
    // Static assets: serve from cache, fallback to network
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }
});

// Background sync: Retry failed queue items when online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-queue") {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const db = await openDB("KrishiVerse");
  const queue = await db.getAll("sync_queue");
  
  for (const item of queue) {
    try {
      await fetch("/api/sync", {
        method: "POST",
        body: JSON.stringify(item.data)
      });
      await db.update("sync_queue", { ...item, status: "synced" });
    } catch (error) {
      await db.update("sync_queue", {
        ...item,
        retry_count: item.retry_count + 1,
        last_error: error.message
      });
    }
  }
}
```

---

### 2.5 Local AI Model Integration

#### 2.5.1 TensorFlow.js Disease Detection
```javascript
// services/ai/diseaseModel.js

let model;

export async function loadDiseaseModel() {
  // Model: MobileNetV2 fine-tuned on PlantVillage dataset
  // Size: 6 MB (quantized)
  // Source: https://github.com/edjeelectric/plantvillage_tfjs
  
  model = await tf.loadLayersModel(
    "indexeddb://krishiverse-plant-disease-model"
  );
  
  // If not cached, download from CDN
  if (!model) {
    model = await tf.loadLayersModel(
      "https://cdn.jsdelivr.net/gh/edjeelectric/plantvillage_tfjs@latest/model.json"
    );
    // Save to IndexedDB for offline reuse
    await model.save("indexeddb://krishiverse-plant-disease-model");
  }
}

export async function detectDisease(imageBlob) {
  const img = new Image();
  img.src = URL.createObjectURL(imageBlob);
  
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  
  // Preprocess
  let tensor = tf.browser.fromPixels(img);
  let normalized = tensor.div(255.0);
  let resized = tf.image.resizeBilinear(normalized, [224, 224]);
  let batched = resized.expandDims(0);
  
  // Predict
  const predictions = model.predict(batched);
  const data = await predictions.data();
  
  // Get top result
  const diseases = [
    "Early Blight",
    "Late Blight",
    "Healthy",
    "Septoria Leaf Spot",
    "Bacterial Wilt",
    "Yellow Leaf Curl Virus"
    // ... 30+ diseases total
  ];
  
  let maxConfidence = 0;
  let maxIndex = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > maxConfidence) {
      maxConfidence = data[i];
      maxIndex = i;
    }
  }
  
  // Cleanup
  tensor.dispose();
  normalized.dispose();
  resized.dispose();
  batched.dispose();
  predictions.dispose();
  
  return {
    disease: diseases[maxIndex],
    confidence: maxConfidence,
    treatment: getTreatmentForDisease(diseases[maxIndex])
  };
}

function getTreatmentForDisease(disease) {
  const treatments = {
    "Early Blight": {
      tamil: "பூரித்த நோய்: கார்பेனடাசிம் 50 WP தெளி...",
      english: "Early Blight: Spray carbendazim 50 WP..."
    },
    "Late Blight": {
      tamil: "பிற்பகல் நோய்: ম্যানকোজেব் 75 WP...",
      english: "Late Blight: Spray mancozeb 75 WP..."
    }
    // ...
  };
  return treatments[disease];
}
```

#### 2.5.2 Local Ollama LLM Integration
```javascript
// services/ai/chatModel.js

// Ollama runs on farmer's device or local network
// Model: Mistral 7B (lightweight, Tamil-capable)

const OLLAMA_BASE_URL = "http://localhost:11434";

export async function initializeLocalLLM() {
  // Check if Ollama is running
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const data = await response.json();
    console.log("Available models:", data.models);
  } catch (error) {
    console.warn("Ollama not available. Fallback to cached responses.");
  }
}

export async function askLocalLLM(question, language = "en") {
  const systemPrompt = `You are an agricultural advisor for Tamil Nadu farmers.
    Provide concise, practical farming advice in ${language}.
    Focus on: crop care, pest management, irrigation, fertilizer use.
    Keep responses under 300 words.`;
  
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      body: JSON.stringify({
        model: "mistral",
        prompt: `${systemPrompt}\n\nQuestion: ${question}`,
        stream: false,
        temperature: 0.7,
        top_p: 0.9
      })
    });
    
    const data = await response.json();
    return {
      response: data.response,
      model: "ollama-mistral",
      confidence: 0.8
    };
  } catch (error) {
    // Fallback to FAQ database
    return getFAQFallback(question, language);
  }
}

function getFAQFallback(question, language) {
  // Simple FAQ database for offline fallback
  const faqDb = {
    "How often should I water rice?": {
      en: "Rice needs 5-10 cm water per week. Maintain 5-10 cm standing water during growth.",
      ta: "அரிசிக்கு வாரத்திற்கு 5-10 செ.மீ நீர் தேவை..."
    },
    // ... more FAQs
  };
  
  return {
    response: faqDb[question]?.[language] || "Question not found in offline database.",
    model: "faq-fallback",
    confidence: 0.5,
    isOffline: true
  };
}
```

---

### 2.6 State Management (Zustand)

```javascript
// store/index.js

import create from "zustand";
import { persist } from "zustand/middleware";

// User store
export const useUserStore = create(
  persist(
    (set) => ({
      location: { lat: null, lon: null },
      language: "ta", // Tamil default
      cropTypes: ["rice", "sugarcane"],
      crops: [],
      setLocation: (lat, lon) => set({ location: { lat, lon } }),
      setLanguage: (lang) => set({ language: lang }),
      addCrop: (crop) =>
        set((state) => ({ cropTypes: [...state.cropTypes, crop] }))
    }),
    { name: "user-storage", version: 1 }
  )
);

// Weather store
export const useWeatherStore = create((set) => ({
  forecast: [],
  lastUpdated: null,
  isLoading: false,
  error: null,
  
  setForecast: (forecast) =>
    set({
      forecast,
      lastUpdated: new Date()
    }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  refreshWeather: async (lat, lon) => {
    set({ isLoading: true });
    try {
      const data = await fetchWeather(lat, lon);
      set({ forecast: data, lastUpdated: new Date(), error: null });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));

// Chat store
export const useChatStore = create(
  persist(
    (set) => ({
      messages: [],
      addMessage: (user, response) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { user, response, timestamp: new Date() }
          ]
        })),
      clearHistory: () => set({ messages: [] })
    }),
    { name: "chat-storage", version: 1 }
  )
);

// Sync queue store
export const useSyncStore = create((set) => ({
  queue: [],
  isSyncing: false,
  
  addToQueue: (action, data) =>
    set((state) => ({
      queue: [...state.queue, { id: Date.now(), action, data }]
    })),
  
  removeFromQueue: (id) =>
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id)
    })),
  
  syncQueue: async () => {
    // Called when online
    set({ isSyncing: true });
    // ... sync logic
    set({ isSyncing: false });
  }
}));
```

---

## 3. Database Design (IndexedDB)

See Section 2.2 for full schema.

**Key Design Decisions:**
- **Client-side only:** No sensitive data sent to server
- **Expiration policy:** Weather & prices expire after 7 days
- **Lazy loading:** Shops loaded on-demand by location
- **Compression:** Images stored as blobs (native compression)
- **Versioning:** Schema updates via migrations

---

## 4. Deployment Architecture

```
┌──────────────────────────┐
│   GitHub Actions CI/CD   │
│  (on push to main)       │
└────────────┬─────────────┘
             │
    ┌────────▼────────┐
    │ Build & Bundle  │
    │ (Vite build)    │
    │ Size: 15-20 MB  │
    └────────┬────────┘
             │
    ┌────────▼────────────────────┐
    │ Static Hosting (Free Tier)   │
    │ • GitHub Pages              │
    │ • Netlify (free)            │
    │ • Vercel (free)             │
    └────────┬────────────────────┘
             │
    ┌────────▼──────────────────────┐
    │ Service Worker Deployment      │
    │ (Serve via CloudFlare CDN)     │
    │ Edge caching for assets        │
    └────────┬──────────────────────┘
             │
    ┌────────▼────────────────────┐
    │ farmer's PWA Installation    │
    │ Install button on home screen │
    │ Auto-updates when online     │
    └─────────────────────────────┘
```

---

## 5. Security Considerations

1. **API Keys:** Store in environment variables, never commit
2. **CORS:** Use proxy for AGMARK API if needed
3. **Image Data:** Never send raw images to backend
4. **Local Storage:** No passwords, sensitive tokens
5. **HTTPS Only:** All API calls require encryption

---

## 6. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 3s (3G) | Lighthouse |
| Subsequent Load | < 1s | Lighthouse |
| Offline Response | Instant | Local measurement |
| Disease Detection | < 3s | TensorFlow.js |
| Bundle Size | < 110 KB (gzipped) | Webpack analyzer |
| Total App Size | < 20 MB | App size tool |
| Lighthouse Score | > 95 | PageSpeed Insights |

---

**Document Owner:** CodeNest Team  
**Last Updated:** April 2026
