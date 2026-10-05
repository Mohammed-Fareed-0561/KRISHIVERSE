# KrishiVerse - Feature Breakdown & Implementation Guide

**Version:** 2.0  
**Date:** April 2026  
**Status:** Ready for Development

---

## 1. Feature Matrix

| Feature | Priority | Effort | Phase | Status |
|---------|----------|--------|-------|--------|
| Ask (Chatbot) | P0 | 3d | 1 | Design Complete |
| Diagnose (Disease) | P0 | 5d | 1 | Design Complete |
| Weather (7-day) | P0 | 3d | 1 | Design Complete |
| Mandi Prices | P1 | 3d | 2 | Pending |
| Maps (Shop Locator) | P1 | 4d | 2 | Pending |
| Govt Schemes | P2 | 3d | 2 | Pending |
| Drone Tech Info | P3 | 2d | 3 | Pending |
| Multi-Language | P1 | 2d | 1 | Design Complete |
| Offline Sync | P0 | 2d | 1 | Design Complete |

---

## 2. Feature 1: ASK (Chatbot - Agriculture Advisory)

### 2.1 Functional Requirements

#### User Journey
```
Farmer → Opens "Ask" tab → Types/speaks question → Gets instant response → Saves to history → Rates usefulness
```

#### Core Functionality
- **Input:** Text (primary) or voice (secondary)
- **Processing:** 
  - Offline: Local Ollama Mistral 7B LLM
  - Online: Optional Claude API for premium accuracy
- **Output:** Text response in selected language
- **Features:**
  - Chat history (persistent)
  - Multi-language support (Tamil/English/Telugu/Kannada)
  - Crop context (pre-selected crop type)
  - Follow-up question support
  - User feedback (useful/not useful)

### 2.2 Technical Specifications

**Component Structure:**
```
AskPage.jsx
├── ChatHistory.jsx
│   ├── ChatMessage.jsx (User)
│   ├── ChatMessage.jsx (AI)
│   └── FeedbackButtons.jsx
├── InputSection.jsx
│   ├── TextInput.jsx
│   ├── VoiceInput.jsx (Web Speech API)
│   ├── CropSelector.jsx
│   └── SendButton.jsx
└── ModelIndicator.jsx (Local/Cloud)
```

**Data Flow:**
```
User Input → Validate → Check Online Status
    ↓
  If Online:
    → Send to Claude API (optional)
    → Store in IndexedDB + sync queue
    ↓
  If Offline:
    → Send to Ollama local LLM
    → Store in IndexedDB
    ↓
Display Response → User Feedback → Update history
```

**API Calls:**
```javascript
// Ollama Local (Offline)
POST http://localhost:11434/api/generate
{
  model: "mistral",
  prompt: "...",
  stream: false
}

// Claude API (Online - Optional)
POST https://api.anthropic.com/v1/messages
{
  model: "claude-opus-4-6",
  messages: [...],
  max_tokens: 500
}
```

**Database Queries:**
```javascript
// Save chat
db.chat_history.add({
  id: uuid(),
  user_message: "...",
  ai_response: "...",
  model: "ollama" | "claude",
  language: "ta" | "en",
  timestamp: Date,
  confidence: 0.85,
  is_useful: null
});

// Load history
db.chat_history.query({
  orderBy: "timestamp DESC",
  limit: 50
});
```

### 2.3 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Response Time (Offline) | < 2s | Local clock |
| Response Time (Online) | < 5s | API latency |
| History Load Time | < 500ms | PageSpeed |
| Memory Usage | < 100 MB | DevTools |
| Accuracy | > 80% relevance | User feedback NPS |
| Language Coverage | 5 languages | i18next |

### 2.4 Acceptance Criteria

- [ ] User can type question in Tamil/English
- [ ] Response appears within 3 seconds (offline)
- [ ] Chat history persists across sessions
- [ ] User can rate response (thumbs up/down)
- [ ] Voice input works on Android
- [ ] Offline indicator shows model type
- [ ] No errors when offline
- [ ] FAQ fallback triggers if Ollama unavailable

### 2.5 Implementation Tasks

```
Task 1: Ollama Setup (1d)
  - Install Ollama locally (farmer's device)
  - Download Mistral 7B model (4 GB)
  - Test API endpoint
  - Create fallback FAQ database (100 QA pairs)

Task 2: Frontend Components (2d)
  - ChatHistory component (render messages)
  - InputSection component (text + voice)
  - FeedbackButtons (save rating)
  - useChat hook (API logic)
  - Zustand chat store (state management)

Task 3: Integration (1d)
  - Connect to Ollama API
  - Connect to Claude API (optional)
  - IndexedDB persistence
  - Offline detection

Task 4: Testing (0.5d)
  - Unit tests for chat logic
  - Integration tests (Ollama + IndexedDB)
  - E2E tests (user journey)
  - Offline mode testing
```

### 2.6 Success Metrics

- **Adoption:** 60%+ of users use Ask feature
- **Engagement:** Average 3+ questions per user session
- **Satisfaction:** NPS > 40 (user ratings)
- **Accuracy:** > 85% relevant responses
- **Performance:** 95th percentile response < 3s

---

## 3. Feature 2: DIAGNOSE (Plant Disease Detection)

### 3.1 Functional Requirements

#### User Journey
```
Farmer → Takes leaf photo → Uploads image → Model analyzes → Shows disease + treatment → Saves diagnosis
```

#### Core Functionality
- **Input:** Image (camera or gallery, JPEG/PNG)
- **Processing:**
  - TensorFlow.js CNN model (offline)
  - Claude API verification (online, optional)
- **Output:** Disease name + confidence + recommended treatment
- **Features:**
  - Batch processing (up to 5 images)
  - Crop type pre-selection (influences model)
  - Confidence score display
  - Treatment guide with pesticide recommendations
  - Diagnosis history with images

### 3.2 Technical Specifications

**Component Structure:**
```
DiagnosePage.jsx
├── ImageUploadSection.jsx
│   ├── CameraCapture.jsx
│   ├── FileUpload.jsx
│   └── ImagePreview.jsx
├── ResultsSection.jsx
│   ├── DiseaseCard.jsx
│   ├── ConfidenceIndicator.jsx
│   ├── TreatmentGuide.jsx
│   └── LearnMoreButton.jsx
└── DiagnosisHistory.jsx
```

**Model Details:**
```
Model: PlantVillage MobileNetV2 (quantized)
Size: 6 MB (ONNX format)
Input: 224x224px RGB image
Output: 38 disease classes
Accuracy: ~85-90% on test set
Supported Diseases:
  - Early Blight (Tomato/Potato)
  - Late Blight
  - Septoria Leaf Spot
  - Bacterial Wilt
  - Yellow Leaf Curl Virus
  - Fungal Diseases (Rice)
  - ... 30+ more
```

**Data Flow:**
```
Image Capture/Upload
    ↓
Compress (max 5 MB)
    ↓
Preprocess (224x224)
    ↓
TensorFlow.js Model (offline)
    ↓
Get Predictions (disease + confidence)
    ↓
If Online: Send to Claude for verification
    ↓
Get Treatment (from local DB)
    ↓
Save to IndexedDB
    ↓
Display Results
```

**API Calls:**
```javascript
// Claude API (Online verification - optional)
POST https://api.anthropic.com/v1/messages
{
  model: "claude-opus-4-6",
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { ... } },
        { type: "text", text: "Verify this disease diagnosis. Local model says: Early Blight (87% confidence). Suggest treatment in Tamil." }
      ]
    }
  ]
}
```

**Database Schema:**
```javascript
// Save diagnosis
db.disease_diagnoses.add({
  id: uuid(),
  image_blob: Blob,
  crop_type: "tomato",
  disease_name: "Early Blight",
  confidence: 0.87,
  treatment: "Spray carbendazim...",
  severity: "moderate",
  timestamp: Date,
  model_used: "tensorflow",
  verified_by_claude: false
});

// Query history
db.disease_diagnoses.query({
  orderBy: "timestamp DESC",
  limit: 50
});
```

### 3.3 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Detection Time | < 3s | Local inference |
| Model Size | < 10 MB | File size |
| Memory Usage | < 150 MB | Peak during inference |
| Accuracy | > 85% | Confusion matrix |
| Image Size Limit | 5 MB | Validation |
| Supported Crops | 10+ | Model training data |

### 3.4 Acceptance Criteria

- [ ] User can capture image from camera
- [ ] User can select image from gallery
- [ ] Image preprocessing works (resize, normalize)
- [ ] Model loads in < 2 seconds
- [ ] Disease prediction appears in < 3 seconds
- [ ] Confidence score shows correctly
- [ ] Treatment displays in selected language
- [ ] Diagnosis saves to history
- [ ] No GPU required (CPU-only)
- [ ] Works offline completely

### 3.5 Implementation Tasks

```
Task 1: Model Setup (1d)
  - Download PlantVillage ONNX model
  - Convert to TensorFlow.js format
  - Test inference on mock images
  - Create disease-treatment mapping (38 diseases)

Task 2: Image Processing (1d)
  - Camera capture (getUserMedia)
  - Gallery selection (File API)
  - Compression (canvas)
  - Preprocessing for model (224x224, normalize)

Task 3: Frontend Components (2d)
  - ImageUploadSection
  - ResultsSection (disease card, treatment)
  - DiagnosisHistory
  - useDisease hook (TensorFlow logic)

Task 4: Integration (1d)
  - TensorFlow.js loading
  - IndexedDB persistence
  - Claude verification (optional)
  - Error handling

Task 5: Testing (1d)
  - Model accuracy test (known images)
  - Performance test (inference time)
  - Memory leak test
  - Offline mode test
  - E2E test (capture → result)
```

### 3.6 Success Metrics

- **Adoption:** 50%+ of users use Diagnose
- **Accuracy:** > 85% match with agronomist diagnosis
- **Speed:** 95th percentile detection < 4s
- **Satisfaction:** > 4.0/5.0 rating
- **Daily Usage:** > 100 diagnoses/day

---

## 4. Feature 3: WEATHER (7-Day Forecast - Offline)

### 4.1 Functional Requirements

#### User Journey
```
Farmer → Allows location access → Sees current + 7-day weather → Gets farming advice → Checks offline
```

#### Core Functionality
- **Input:** GPS location (or manual selection)
- **Data Source:** OpenWeatherMap API
- **Caching:** IndexedDB (7-day offline access)
- **Display:** Current + 7-day forecast
- **Features:**
  - Daily temperature, humidity, rainfall, wind
  - Weather alerts (extreme conditions)
  - Farming advice (spray, irrigation, planting)
  - Offline mode (show cached data)
  - Auto-refresh daily at 6 AM

### 4.2 Technical Specifications

**API Endpoint:**
```
GET https://api.openweathermap.org/data/2.5/forecast
?lat={lat}&lon={lon}&units=metric&appid={KEY}&cnt=56
```

**Response Example:**
```json
{
  "list": [
    {
      "dt": 1709251200,
      "main": {
        "temp": 28.5,
        "temp_min": 24.2,
        "temp_max": 32.1,
        "humidity": 75,
        "pressure": 1013
      },
      "wind": { "speed": 12 },
      "clouds": { "all": 45 },
      "rain": { "3h": 5.2 },
      "weather": [
        {
          "id": 500,
          "main": "Rain",
          "description": "light rain"
        }
      ],
      "visibility": 10000,
      "pop": 0.8
    }
  ]
}
```

**Data Storage:**
```javascript
// Aggregate 8 forecasts per day to daily data
db.weather_forecast.add({
  id: uuid(),
  location: "Coimbatore, TN",
  date: Date,
  temp_min: 24.2,
  temp_max: 32.1,
  humidity: 75,
  rainfall: 12.4, // mm
  wind_speed: 12,
  condition: "Rainy",
  alerts: ["High rainfall", "Strong wind"],
  farming_advice: "Good day to spray (low wind). Avoid irrigation.",
  source: "OpenWeatherMap",
  cached_at: Date,
  expires_at: Date + 7 days
});
```

**Component Structure:**
```
WeatherPage.jsx
├── CurrentWeather.jsx
│   ├── TemperatureDisplay.jsx
│   ├── ConditionIcon.jsx
│   ├── HumidityWindDisplay.jsx
│   └── AlertBanner.jsx
├── ForecastChart.jsx (7-day graph)
├── WeeklyForecast.jsx
│   └── ForecastCard.jsx (repeated)
└── FarmingAdvice.jsx
```

### 4.3 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Fetch Time | < 2s | API latency |
| Load Time | < 1s | From cache |
| Cache Duration | 24 hours | Auto-refresh |
| Offline Accuracy | Show 7-day cached | Always available |
| Refresh Interval | Daily at 6 AM | Background sync |
| Forecast Accuracy | 95% | vs. IMD data |

### 4.4 Acceptance Criteria

- [ ] User can grant location permission
- [ ] Current weather displays with icon + temperature
- [ ] 7-day forecast loads correctly
- [ ] Data refreshes automatically daily
- [ ] Offline mode shows cached data (7 days old)
- [ ] Weather alerts display prominently
- [ ] Farming advice appears based on forecast
- [ ] No API errors when offline
- [ ] Cache expires after 7 days
- [ ] Manual refresh button works

### 4.5 Implementation Tasks

```
Task 1: API Integration (1d)
  - Get API key from OpenWeatherMap
  - Implement fetchWeather()
  - Parse forecast data (aggregate to daily)
  - Handle API errors + rate limiting

Task 2: Caching Logic (1d)
  - Save to IndexedDB on fetch
  - Load from cache when offline
  - Auto-refresh at 6 AM (using Background Sync)
  - Cleanup old data (> 7 days)

Task 3: UI Components (1d)
  - CurrentWeather display
  - 7-day forecast cards
  - AlertBanner for extreme weather
  - FarmingAdvice section

Task 4: Integration (0.5d)
  - Geolocation API (request + handle)
  - Background sync setup
  - IndexedDB integration
  - useWeather hook

Task 5: Testing (0.5d)
  - API call testing
  - Cache behavior testing
  - Offline mode testing
  - Background sync testing
```

### 4.6 Success Metrics

- **Adoption:** 80%+ of users check weather
- **Engagement:** Average 1-2 checks/day
- **Accuracy:** 95%+ forecast accuracy vs. official
- **Refresh Rate:** 100% daily updates
- **Offline Usage:** 40%+ weather checks happen offline

---

## 5. Feature 4: MANDI PRICES (Market Intelligence)

### 5.1 Functional Requirements

- **Data Source:** AGMARK API or spot.gov.in scraping
- **Update Frequency:** Daily at 7 AM
- **Display:** Current prices, trends, comparisons
- **Features:**
  - Filter by crop type
  - Compare across mandis
  - 7/30/90-day price trends
  - Price alerts (notify when target price reached)
  - Offline: Show cached prices from last sync

### 5.2 Technical Specifications

**API Source:**
```
AGMARK: https://agmarknet.gov.in/SearchCmmMkt.aspx
OR
Tamil Nadu Mandi: https://spot.gov.in/live-price
```

**Data Structure:**
```javascript
db.mandi_prices.add({
  id: uuid(),
  crop_id: "rice_paddy",
  crop_name: "Rice (Paddy)",
  mandi_id: "coimbatore",
  mandi_name: "Coimbatore Agricultural Market",
  price_per_kg: 42.5,
  price_per_quintal: 4250,
  min_price: 40,
  max_price: 45,
  avg_price: 42.8,
  volume_traded: 1200,
  date: Date,
  trend: "up", // up/down/stable
  change_percent: 2.4
});
```

**Component Structure:**
```
MandiPage.jsx
├── Filters.jsx (Crop, Mandi)
├── PriceChart.jsx (Recharts line graph)
├── CurrentPrices.jsx
│   └── MandiBroadcast.jsx (per mandi)
└── PriceAlerts.jsx
```

### 5.3 Acceptance Criteria

- [ ] Fetch prices from government API
- [ ] Display prices for top 20 crops in Tamil Nadu
- [ ] Show trends (7, 30, 90 days)
- [ ] Compare across 10+ mandis
- [ ] Cache prices locally (7-day retention)
- [ ] Support price alerts (notification on target)
- [ ] Offline mode shows cached prices
- [ ] Trends display as graph
- [ ] Updates daily at 7 AM

### 5.4 Implementation Effort: 3 days

---

## 6. Feature 5: MAPS (Shop Locator)

### 6.1 Functional Requirements

- **Maps Library:** Leaflet.js + OpenStreetMap
- **Shop Types:** Fertilizer, seeds, drone services, govt offices, input centers
- **Features:**
  - Interactive map with markers
  - Search/filter by type
  - Show distance + rating
  - Click for details (phone, hours, route)
  - Route navigation (link to Google Maps)

### 6.2 Technical Specifications

**Data Source:**
```
Google Places API + Manual Database (Firebase)
- Fertilizer shops: 50+ per district
- Drone services: 10+ per district
- Input centers: 30+ per district
- Govt offices: 5+ per district
```

**API Call:**
```javascript
// Google Places API
GET https://maps.googleapis.com/maps/api/place/nearbysearch/json
?location=11.0168,76.9558
&radius=5000
&type=store
&keyword=fertilizer
&key={KEY}
```

**Component Structure:**
```
MapsPage.jsx
├── MapContainer.jsx (Leaflet)
├── ShopMarkers.jsx
├── ShopCard.jsx
├── Filters.jsx
└── LoadingState.jsx
```

### 6.3 Acceptance Criteria

- [ ] Map loads in < 1s
- [ ] Markers show for all shops nearby
- [ ] Click marker → show card details
- [ ] Filter by shop type works
- [ ] Distance calculation correct
- [ ] "Get Directions" links to Google Maps
- [ ] Offline: Show cached shops from last location
- [ ] Smooth zoom/pan
- [ ] Support current location (GPS)

### 6.4 Implementation Effort: 4 days

---

## 7. Feature 6: GOVERNMENT SCHEMES

### 7.1 Functional Requirements

- **Schemes:** 15+ active schemes (PMKSY, PM-KISAN, Fasal Bima, etc.)
- **Features:**
  - List with brief description
  - Eligibility checker (questionnaire)
  - Step-by-step how-to guides
  - Embedded YouTube videos
  - PDF downloads
  - Contact details for support

### 7.2 Data Structure

```javascript
db.govt_schemes.add({
  id: uuid(),
  scheme_id: "pm-kisan",
  scheme_name: "Pradhan Mantri Kisan Samman Nidhi",
  description: "Direct cash transfer to farmers",
  category: "subsidy",
  eligibility: [
    "Indian farmer",
    "Own agricultural land",
    "Income < specified limit"
  ],
  required_docs: [
    "Aadhar Card",
    "Land documents",
    "Bank account"
  ],
  subsidy_amount: "₹6,000 per year",
  application_link: "https://pmkisan.gov.in",
  how_to_apply: "Markdown guide",
  video_urls: [
    "https://www.youtube.com/..." // Govt channel
  ],
  pdf_url: "https://..." // Hosted PDF
});
```

### 7.3 Acceptance Criteria

- [ ] List 15+ schemes
- [ ] Show scheme description
- [ ] Eligibility checker works (simple form)
- [ ] YouTube videos embed correctly
- [ ] PDF download works
- [ ] Offline: Show cached scheme info
- [ ] Multi-language support
- [ ] Update schemes quarterly

### 7.4 Implementation Effort: 3 days

---

## 8. Multi-Language Support (i18next)

### 8.1 Translation Keys

```json
// en.json
{
  "home.title": "Welcome to KrishiVerse",
  "ask.input_placeholder": "Ask your farming question",
  "diagnose.upload": "Upload leaf image",
  "weather.title": "7-Day Forecast",
  "mandi.title": "Mandi Prices",
  "maps.title": "Nearby Shops",
  "schemes.title": "Government Schemes"
}

// ta.json (Tamil)
{
  "home.title": "KrishiVerse-க்கு வரவேற்கிறோம்",
  "ask.input_placeholder": "உங்கள் விவசாய கேள்வி கேட்கவும்",
  ...
}
```

### 8.2 Implementation

```javascript
// i18n.js
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enJSON },
      ta: { translation: taJSON },
      te: { translation: teJSON },
      kn: { translation: knJSON }
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

// Usage in components
import { useTranslation } from "react-i18next";

function AskPage() {
  const { t } = useTranslation();
  return <h1>{t("ask.input_placeholder")}</h1>;
}
```

### 8.3 Acceptance Criteria

- [ ] All UI strings translatable
- [ ] Support 5 languages (Tamil, English, Telugu, Kannada, Hindi)
- [ ] Language toggle in settings
- [ ] No mixed languages on screen
- [ ] RTL support (if needed)
- [ ] Regional numerals (future)

---

## 9. Offline & Sync Features

### 9.1 Service Worker

- Cache all static assets on install
- Serve from cache when offline
- Sync queue for failed API calls
- Background sync when online

### 9.2 IndexedDB

- Store weather, prices, shops, chat, diagnoses
- Auto-cleanup old data
- Query performance optimization

### 9.3 Offline Indicators

- Show "Offline" banner with last sync time
- Disable online-only features
- Show "Cached" label on old data
- Provide "Force Sync" button

### 9.4 Sync Strategy

```javascript
// On online event
window.addEventListener("online", async () => {
  // Sync all offline actions
  await syncWeather();
  await syncPrices();
  await syncQueue();
});

// Periodic sync (even when offline, next time online)
if ("serviceWorker" in navigator && "SyncManager" in window) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.sync.register("sync-offline-queue");
  });
}
```

---

## 10. Testing Strategy

### Unit Tests
- API call mocking
- Component rendering
- State management (Zustand)
- Utility functions

### Integration Tests
- API + IndexedDB integration
- Offline mode behavior
- Service Worker caching

### E2E Tests
- User journey (Ask → Diagnose → Weather)
- Offline transitions
- Data persistence across sessions

### Performance Tests
- Lighthouse score > 95
- Bundle size < 120 KB (gzipped)
- Time to interactive < 3s
- API response times

---

## 11. Deployment Checklist

- [ ] All features merged to main branch
- [ ] Tests pass (unit, integration, E2E)
- [ ] Lighthouse score > 95
- [ ] Performance budgets met
- [ ] Accessibility audit passed
- [ ] Manual QA on Android 5.0+
- [ ] API keys configured (env vars)
- [ ] Service Worker registered
- [ ] Analytics configured
- [ ] Error logging setup
- [ ] Staged rollout (5% → 25% → 100%)

---

**Document Owner:** CodeNest Development Team  
**Last Updated:** April 2026  
**Status:** Ready for Sprint Planning
