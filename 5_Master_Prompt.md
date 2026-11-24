# KrishiVerse - Master Prompt for AI Code Generation

**Version:** 2.0  
**Date:** April 2026  
**Purpose:** Load this document into any AI to get production-ready code  
**Status:** Ready for Use

---

## CONTEXT & BACKGROUND

You are a senior full-stack developer tasked with building **KrishiVerse**, an offline-first agricultural PWA for small-holder farmers in Tamil Nadu, South India.

### Project Overview
- **Type:** Progressive Web App (PWA)
- **Platform:** Mobile (Android 5.0+), runs offline
- **Target Users:** Non-tech farmers (Tamil Nadu, South India)
- **Stack:** React 18 + Vite + Tailwind CSS + DaisyUI
- **Size:** < 20 MB total, < 110 KB JS (gzipped)
- **Deployment:** Free tier (GitHub Pages + CloudFlare)
- **Languages:** Tamil, English, Telugu, Kannada, Hindi

### Core Problem Being Solved
Farmers in rural areas lack access to real-time agricultural advice because:
1. Poor internet connectivity (2G/3G)
2. High data costs
3. Information fragmentation (multiple apps needed)
4. Language barriers
5. Difficulty understanding government subsidies

### Solution: KrishiVerse
An offline-first PWA that provides:
- Real-time crop advisory (Ask feature)
- Pest/disease detection (Diagnose feature)
- 7-day weather forecasts (cached offline)
- Agricultural commodity prices (Mandi)
- Shop locator (Fertilizer, seeds, drone services)
- Government scheme guides
- Multi-language support (Tamil primary)
- Works 100% offline after first load

---

## CORE ARCHITECTURE

### Frontend Stack
```
React 18 (UI framework)
    ↓
Vite (build tool)
    ↓
Tailwind CSS + DaisyUI (styling)
    ↓
Zustand (state management)
    ↓
Service Worker + IndexedDB (offline)
    ↓
i18next (localization)
```

### Technology Choices & Rationale

| Component | Technology | Why |
|-----------|-----------|-----|
| UI Framework | React 18 | Fast, component-based, good mobile support |
| Build Tool | Vite | Lightning-fast builds, small bundle sizes |
| Styling | Tailwind + DaisyUI | Utility-first, farmer-friendly components |
| State | Zustand | Lightweight, offline-friendly, minimal boilerplate |
| Offline | Service Worker + IndexedDB | PWA standard, 100% offline capable |
| Maps | Leaflet.js | Open-source, no API costs, performant |
| AI (Chat) | Ollama (local) | Runs offline, no cloud dependency |
| AI (Disease) | TensorFlow.js | Browser-based inference, no backend needed |
| Language | i18next | Industry standard, easy translation management |
| Icons | Tabler Icons | Free, lightweight, clear for farmers |

### Why These Choices Matter for Farmers
- **Vite:** Fast startup (critical on slow phones)
- **Zustand:** Minimal overhead (saves battery)
- **DaisyUI:** Pre-built accessible components (easy for non-tech users)
- **Local AI models:** No cloud costs, works offline, no privacy concerns
- **IndexedDB:** Persistent storage without backend
- **Service Worker:** True offline capability

---

## DEVELOPMENT WORKFLOW

### Phase 1: MVP (Weeks 1-4)
**Goals:** Core features, offline-first, production ready

**Features to build:**
1. Ask (Chatbot) - Ollama + Local FAQ
2. Diagnose (Disease Detection) - TensorFlow.js CNN
3. Weather (7-day) - OpenWeatherMap API + caching
4. Multi-language - i18next (Tamil + English)
5. Offline sync - Service Worker + IndexedDB

**Deliverables:**
- Working PWA deployable to production
- Lighthouse score > 95
- < 20 MB app size
- All tests passing
- README with setup instructions

### Phase 2: Expansion (Weeks 5-8)
**Features:**
- Mandi Prices
- Maps (Shop Locator)
- Multi-language expansion (Telugu, Kannada)

### Phase 3: Polish (Weeks 9-12)
**Features:**
- Government Schemes
- Drone Tech Info
- Performance optimization
- User feedback integration

---

## CODE GENERATION GUIDELINES

### When Using This Prompt
1. **Always ask for clarification** if requirements are ambiguous
2. **Start with component structure** before implementation
3. **Write production-ready code** (error handling, logging, types)
4. **Include tests** (unit tests at minimum)
5. **Use TypeScript** for new components (optional but recommended)
6. **Follow naming conventions** (see below)

### Naming Conventions
```javascript
// Components: PascalCase
AskPage.jsx
ChatHistory.jsx
WeatherCard.jsx

// Hooks: useXxx
useChat.js
useWeather.js
useOffline.js

// Services/API: camelCase
weatherService.js
mandiService.js
diseaseModel.js

// Stores: use + Store
useChatStore.js
useWeatherStore.js
useSyncStore.js

// Utils: camelCase
formatting.js
validation.js
geoLocation.js

// Database: snake_case
weather_forecast
mandi_prices
chat_history
disease_diagnoses
```

### Code Style
- **Indentation:** 2 spaces
- **Quotes:** Double quotes for strings
- **Semicolons:** Always use them
- **Arrow functions:** Prefer over function keyword
- **Async/await:** Over .then() chains
- **Comments:** JSDoc style for functions

### Error Handling Template
```javascript
try {
  // Main logic
} catch (error) {
  console.error("Function: Error description", error);
  // Fallback or user-friendly message
  return null; // or throw custom error
}
```

### Testing Template
```javascript
// test.js
describe("ComponentName", () => {
  test("should render correctly", () => {
    // Arrange
    // Act
    // Assert
  });

  test("should handle error gracefully", () => {
    // Test error state
  });
});
```

---

## FEATURE SPECIFICATIONS

### Feature 1: ASK (Chatbot)

**Requirements:**
- Accept text input (primary) or voice (secondary)
- Offline: Use Ollama Mistral 7B local LLM
- Online: Optional Claude API for premium accuracy
- Save chat history to IndexedDB
- Support multi-language responses (Tamil/English)
- Show model type (Local/Cloud)

**Component Structure:**
```
AskPage.jsx
├── ChatHistory.jsx (display messages)
├── InputSection.jsx (text + voice input)
├── FeedbackButtons.jsx (rate response)
└── ModelIndicator.jsx (show model type)
```

**Key Functions:**
```javascript
// useChat.js
- loadChatHistory() → fetch from IndexedDB
- sendMessage(question, language) → send to Ollama/Claude
- saveFeedback(messageId, rating) → save user rating
- clearHistory() → delete all chat messages

// chatService.js
- fetchFromOllama(prompt) → API call to local model
- fetchFromClaude(prompt) → API call to cloud (optional)
- getFAQFallback(question) → return FAQ if Ollama fails
```

**API Specifications:**
```javascript
// Ollama Local (offline)
POST http://localhost:11434/api/generate
{
  model: "mistral",
  prompt: "System: ... User: ...",
  stream: false,
  temperature: 0.7
}

// Claude (online - optional)
POST https://api.anthropic.com/v1/messages
{
  model: "claude-opus-4-6",
  messages: [{ role: "user", content: question }],
  max_tokens: 500
}
```

**Acceptance Criteria:**
- [ ] User can type question in Tamil
- [ ] Response appears in < 3 seconds (offline)
- [ ] Chat history persists across sessions
- [ ] User can rate response (helpful/not helpful)
- [ ] Voice input works (Web Speech API)
- [ ] Model type shown correctly
- [ ] FAQ fallback triggers if Ollama unavailable

**Testing Requirements:**
- Unit: Chat message saving/loading
- Integration: Ollama API + IndexedDB
- E2E: User sends question → sees response → rates it

---

### Feature 2: DIAGNOSE (Plant Disease Detection)

**Requirements:**
- Accept image input (camera or gallery)
- Offline: Use TensorFlow.js CNN model
- Online: Optional Claude verification
- Return disease name + confidence + treatment
- Save diagnosis history with images
- Support batch processing (max 5 images)

**Key Functions:**
```javascript
// services/ai/diseaseModel.js
- loadDiseaseModel() → load ONNX model from IndexedDB
- detectDisease(imageBlob) → run inference, return results
- getTreatmentForDisease(diseaseName) → lookup treatment

// useDiseaseDetection.js
- uploadImages(fileList) → process multiple images
- analyzeImages() → run detection on all
- saveDiagnosis(results) → store in IndexedDB
```

**Model Specifications:**
- Type: MobileNetV2 (quantized ONNX)
- Size: 6 MB
- Input: 224x224 RGB image
- Output: 38 disease classes
- Accuracy: ~85-90%

**Acceptance Criteria:**
- [ ] Camera capture works on Android
- [ ] Image gallery selection works
- [ ] Model loads in < 2 seconds
- [ ] Disease detection completes in < 3 seconds
- [ ] Confidence score displays correctly
- [ ] Treatment shows in selected language
- [ ] Diagnosis saves to history
- [ ] Works 100% offline

---

### Feature 3: WEATHER (7-Day Forecast)

**Requirements:**
- Fetch 7-day weather from OpenWeatherMap
- Cache in IndexedDB for offline access
- Auto-refresh daily at 6 AM
- Show farming advice based on forecast
- Display in current + 7-day format

**Key Functions:**
```javascript
// weatherService.js
- fetchWeather(lat, lon) → API call to OpenWeatherMap
- parseForecasts(response) → aggregate to daily
- cacheWeather(data) → save to IndexedDB

// useWeather.js
- loadWeather() → from cache if available
- refreshWeather() → fetch fresh data
- setupAutoRefresh() → daily 6 AM update
```

**Data Structure:**
```javascript
{
  id: "uuid",
  location: "Coimbatore, TN",
  date: Date,
  temp_min: 24.2,
  temp_max: 32.1,
  humidity: 75,
  rainfall: 12.4, // mm
  wind_speed: 12,
  condition: "Rainy",
  alerts: ["High rainfall"],
  farming_advice: "Good day to spray",
  expires_at: Date + 7 days
}
```

**Acceptance Criteria:**
- [ ] Weather loads from cache in < 500ms
- [ ] Fresh data fetches in < 2 seconds
- [ ] Daily refresh at 6 AM works
- [ ] Shows 7-day offline forecast
- [ ] Alerts display for extreme weather
- [ ] Farming advice accurate
- [ ] No errors when offline

---

### Feature 4: MANDI PRICES

**Requirements:**
- Fetch prices from AGMARK API or spot.gov.in
- Cache daily (update at 7 AM)
- Show current + trend (7/30/90 days)
- Compare across mandis
- Support price alerts

**Key Functions:**
```javascript
// mandiService.js
- fetchPrices(cropId) → fetch from AGMARK
- compareMandis(cropId) → show all mandi prices
- getTrends(cropId, days) → historical prices
- setPriceAlert(cropId, targetPrice) → notify when reached
```

**Acceptance Criteria:**
- [ ] Prices load from cache in < 500ms
- [ ] Trends display as graph
- [ ] Compare across 10+ mandis
- [ ] Cache updates daily at 7 AM
- [ ] Price alerts work (notify user)
- [ ] Offline shows cached prices
- [ ] Accuracy: 99% vs. official prices

---

### Feature 5: MAPS (Shop Locator)

**Requirements:**
- Interactive map (Leaflet.js + OpenStreetMap)
- Show fertilizer shops, seeds, drone services
- Filter by shop type
- Display distance, rating, contact info
- Route navigation link
- Cache nearby shops for offline

**Key Functions:**
```javascript
// mapsService.js
- loadNearbyShops(lat, lon, radius) → query Google Places API
- filterShops(type) → filter by category
- calculateDistance(lat1, lon1, lat2, lon2) → distance
- cacheShops(shops) → save to IndexedDB

// useShops.js
- loadShops() → from cache or fetch
- openGoogleMaps(lat, lon) → navigation link
```

**Acceptance Criteria:**
- [ ] Map loads in < 1 second
- [ ] Shows all nearby shops with markers
- [ ] Click marker → show card details
- [ ] Filter by type works
- [ ] Distance calculation correct
- [ ] "Get Directions" → Google Maps
- [ ] Offline shows cached shops

---

### Feature 6: GOVERNMENT SCHEMES

**Requirements:**
- List 15+ active schemes
- Eligibility checker (questionnaire)
- Step-by-step how-to guides
- Embedded YouTube videos
- PDF downloads
- Contact details

**Data Structure:**
```javascript
{
  scheme_id: "pm-kisan",
  scheme_name: "Pradhan Mantri Kisan Samman Nidhi",
  description: "Direct cash support",
  category: "subsidy",
  eligibility: ["Indian farmer", "Own land"],
  required_docs: ["Aadhar", "Land docs"],
  subsidy_amount: "₹6,000/year",
  how_to_apply: "Markdown guide",
  video_urls: ["YouTube links"],
  pdf_url: "PDF URL"
}
```

**Acceptance Criteria:**
- [ ] List all schemes
- [ ] Eligibility checker works
- [ ] Videos embed correctly
- [ ] PDFs download properly
- [ ] Multi-language support
- [ ] Offline: cached scheme info

---

### Feature 7: MULTI-LANGUAGE SUPPORT

**Requirements:**
- Support: Tamil, English, Telugu, Kannada, Hindi
- All UI strings in i18next JSON files
- Language toggle in settings
- No mixed languages
- Instant language switch (< 100ms)

**Implementation:**
```javascript
// i18n.js
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

i18next
  .use(initReactI18next)
  .init({
    resources: {
      ta: { translation: taJSON },
      en: { translation: enJSON },
      te: { translation: teJSON },
      kn: { translation: knJSON },
      hi: { translation: hiJSON }
    },
    defaultLanguage: "ta",
    fallbackLng: "en"
  });

// Usage
import { useTranslation } from "react-i18next";
const { t } = useTranslation();
<h1>{t("home.title")}</h1>
```

**Acceptance Criteria:**
- [ ] All UI strings translatable
- [ ] Language toggle works (instant)
- [ ] No mixed languages on screen
- [ ] Native speakers review translations
- [ ] Regional numerals (future)

---

### Feature 8: OFFLINE & SYNC

**Requirements:**
- Service Worker caches static assets
- IndexedDB stores all data
- Background sync when online
- Offline indicator on UI
- Graceful fallback for online-only features

**Implementation:**
```javascript
// service-worker.js
const CACHE_VERSION = "krishiverse-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(["/", "/index.html", "/manifest.json", ...]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/")) {
    // API: network first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, response.clone());
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Assets: cache first
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

**Acceptance Criteria:**
- [ ] Offline indicator shows correctly
- [ ] "Last synced" timestamp displays
- [ ] Cached data shows with timestamp
- [ ] "Force Sync" button works
- [ ] Online-only features disabled offline
- [ ] Background sync queues actions
- [ ] Sync completes when online

---

## DATABASE SCHEMA (IndexedDB)

```javascript
// Database: "KrishiVerse"
// Version: 1

// Object Store: weather_forecast
{
  keyPath: "id",
  indexes: [
    { name: "date", keyPath: "date" },
    { name: "location", keyPath: "location" },
    { name: "expires_at", keyPath: "expires_at" }
  ]
}

// Object Store: mandi_prices
{
  keyPath: "id",
  indexes: [
    { name: "crop_id", keyPath: "crop_id" },
    { name: "mandi_id", keyPath: "mandi_id" },
    { name: "expires_at", keyPath: "expires_at" }
  ]
}

// Object Store: chat_history
{
  keyPath: "id",
  indexes: [
    { name: "timestamp", keyPath: "timestamp" },
    { name: "model", keyPath: "model" }
  ]
}

// Object Store: disease_diagnoses
{
  keyPath: "id",
  indexes: [
    { name: "timestamp", keyPath: "timestamp" },
    { name: "crop_type", keyPath: "crop_type" }
  ]
}

// Object Store: shops
{
  keyPath: "id",
  indexes: [
    { name: "type", keyPath: "type" },
    { name: "latitude", keyPath: "latitude" },
    { name: "longitude", keyPath: "longitude" }
  ]
}

// Object Store: sync_queue
{
  keyPath: "id",
  indexes: [
    { name: "timestamp", keyPath: "timestamp" },
    { name: "status", keyPath: "status" }
  ]
}
```

---

## PROJECT CONSTRAINTS & CONSIDERATIONS

### Technical Constraints
- **Bundle Size:** < 110 KB JavaScript (gzipped)
- **Total App:** < 20 MB (including assets)
- **Memory:** Must run on 2 GB RAM devices
- **Network:** Must work on 2G/3G
- **Devices:** Android 5.0+ minimum
- **Battery:** Minimize API calls, prefer offline

### Design Constraints
- **UI:** Large touch targets (48px minimum)
- **Language:** Tamil-first, no complex English jargon
- **Accessibility:** WCAG 2.1 Level AA
- **Icons:** Must be clear for non-tech users
- **Colors:** High contrast, colorblind-friendly

### Cost Constraints
- **Budget:** < $50/month
- **APIs:** Free tiers only
- **Hosting:** GitHub Pages (free)
- **CDN:** CloudFlare (free tier)
- **AI Models:** Open-source only

### Team Constraints
- **Size:** 4 people (CodeNest)
- **Timeline:** 12 weeks to MVP
- **Experience:** Intermediate (not expert)
- **Part-time:** Not full-time developers

---

## PERFORMANCE TARGETS

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| Initial Load | < 3s (3G) | Lighthouse |
| Subsequent Load | < 1s | Lighthouse |
| Offline Response | Instant | Local measurement |
| Disease Detection | < 3s | Inference time |
| Bundle Size | < 110 KB (gzipped) | Webpack analyzer |
| App Size | < 20 MB | File size |
| Lighthouse Score | > 95 | PageSpeed Insights |
| First Input Delay | < 100ms | Core Web Vitals |
| Largest Contentful Paint | < 2.5s | Core Web Vitals |
| Cumulative Layout Shift | < 0.1 | Core Web Vitals |

---

## DEPLOYMENT INSTRUCTIONS

### Prerequisites
```bash
Node.js 16+ (check: node --version)
npm 7+ (check: npm --version)
```

### Setup & Run
```bash
# Clone repo
git clone https://github.com/codenest/krishiverse.git
cd krishiverse

# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env
# Fill in API keys:
# VITE_OPENWEATHERMAP_KEY=...
# VITE_GOOGLE_PLACES_KEY=...
# VITE_CLAUDE_API_KEY=... (optional)

# Start development server
npm run dev
# Open http://localhost:5173

# Build for production
npm run build
# Output: dist/

# Preview production build locally
npm run preview
```

### Deploy to GitHub Pages
```bash
# Build
npm run build

# Deploy (using gh-pages)
npm run deploy
# App available at: https://codenest.github.io/krishiverse
```

### Deploy to Netlify
```bash
# Connect GitHub repo to Netlify
# Set build command: npm run build
# Set publish directory: dist
# Deploy with one click
```

---

## TESTING CHECKLIST

### Manual Testing (before each feature release)

**On Android 5.0 phone:**
- [ ] App installs from home screen
- [ ] All features work offline
- [ ] Weather loads in < 2s
- [ ] Diagnose detection < 3s
- [ ] Chat responds instantly
- [ ] Language toggle works
- [ ] No crashes
- [ ] Battery drain acceptable
- [ ] Data usage minimal (< 5 MB/day)

**On 2G network:**
- [ ] Page loads (eventually)
- [ ] Graceful fallback to cached data
- [ ] Offline mode triggers correctly
- [ ] No timeout errors

### Automated Testing
```bash
# Run all tests
npm run test

# Run specific suite
npm run test -- ChatHistory.test.js

# Coverage report
npm run test -- --coverage
```

### Lighthouse Audit
```bash
# Run Lighthouse
npm run lighthouse
# Target: Score > 95 (all categories)
```

---

## GIT WORKFLOW & CONVENTIONS

### Commit Message Format
```
type(scope): subject

body (optional)

footer (optional)

Example:
feat(ask): add voice input support

- Integrated Web Speech API
- Added voice indicator UI
- Tested on Android Chrome

Fixes #123
```

### Branch Naming
```
feature/add-weather-alerts
bugfix/offline-sync-queue
chore/upgrade-dependencies
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Tested on Android 5.0+
- [ ] Tested offline mode
- [ ] Lighthouse score checked

## Checklist
- [ ] Code follows style guide
- [ ] Tests written/updated
- [ ] Documentation updated
```

---

## TROUBLESHOOTING GUIDE

### Issue: "Ollama not available" error
**Solution:**
1. Check if Ollama is running (`ollama serve`)
2. Verify localhost:11434 is accessible
3. Fallback to FAQ database (handled in code)

### Issue: IndexedDB quota exceeded
**Solution:**
1. Clear old data (> 7 days)
2. Implement data compression
3. Use blob storage for images (more efficient)

### Issue: Service Worker not updating
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Unregister old service worker (DevTools)
3. Reload page

### Issue: Poor Lighthouse score
**Solution:**
1. Check bundle size (npm run build)
2. Enable code splitting (dynamic imports)
3. Lazy load images (IntersectionObserver)
4. Optimize images (WebP format)

---

## DOCUMENTATION STRUCTURE

You have been provided 4 production-ready documents:

1. **1_PRD_KrishiVerse.md** - Product requirements & user stories
2. **2_System_Design.md** - Architecture, database, APIs
3. **3_UI_UX_Design.md** - Wireframes, components, design system
4. **4_Feature_Breakdown.md** - Feature details & implementation tasks
5. **Master_Prompt.md** (THIS FILE) - Context for AI code generation
6. **requirements.txt** - Python dependencies (if backend needed)
7. **.env.example** - Environment variables template

### How to Use These Documents

**For Code Generation:**
1. Load this Master Prompt into your AI assistant
2. Ask for specific component implementation
3. Reference feature specs in Feature Breakdown doc
4. Use UI/UX doc for design details
5. Use System Design for architecture guidance

**For Development:**
1. Start with Feature Breakdown for task breakdown
2. Use UI/UX doc for component specs
3. Reference System Design for API/DB details
4. Follow naming conventions from Master Prompt

**Example AI Request:**
```
I want to build the Ask (Chatbot) feature for KrishiVerse.
Use the context from the Master Prompt and Feature Breakdown.
Please provide:
1. React component structure (AskPage.jsx, ChatHistory.jsx, etc.)
2. useChat hook with Ollama integration
3. IndexedDB queries for chat history
4. Unit tests
5. Error handling

Follow naming conventions and code style from Master Prompt.
```

---

## QUICK START GUIDE FOR NEW DEVELOPERS

### Day 1: Setup
```bash
# Clone repo
git clone https://github.com/codenest/krishiverse.git
cd krishiverse

# Install
npm install

# Read PRD (1hr)
# Read System Design (1hr)

# Run dev server
npm run dev
```

### Day 2-3: Understand Architecture
- Review folder structure in System Design
- Trace data flow (User Input → Store → API → IndexedDB)
- Understand Zustand store structure
- Review Service Worker caching strategy

### Day 4+: Start Coding
- Pick a feature from Feature Breakdown
- Implement components (follow UI/UX specs)
- Write tests (unit + integration)
- Submit PR with description

---

## SUCCESS METRICS & KPIs

### Launch Goals (First 6 months)
- 5,000+ farmers using app
- 1,000+ daily active users
- 60%+ feature adoption rate
- 95+ Lighthouse score
- < 0.1% error rate

### Quality Gates (Release Criteria)
- Lighthouse score > 95 (all categories)
- 80%+ code coverage (tests)
- Zero critical bugs
- No API errors > 1%
- Accessibility audit passed

### Monitoring & Analytics
- Track feature usage (Google Analytics)
- Monitor API errors (Sentry)
- Measure performance (Datadog RUM)
- Collect user feedback (in-app form)

---

## SUPPORT & ESCALATION

### Getting Help
- **Code issues:** Check System Design & Feature Breakdown
- **UI/UX questions:** Reference UI/UX Design doc
- **API problems:** See API specifications in System Design
- **Performance:** Check Performance Targets section

### Asking Good Questions
When stuck, include:
1. Feature name + specific issue
2. Error message (if any)
3. What you tried
4. Expected behavior vs actual

Example:
> "Ask feature: When I submit a question offline, it says 'Ollama not available'. I've checked localhost:11434 is running. Expected: Should use FAQ fallback. Actual: Shows error."

---

## FINAL NOTES

This document is designed to be **comprehensive, production-ready, and AI-friendly**. Every feature has:
- Clear functional requirements
- Technical specifications
- Code examples
- Testing criteria
- Implementation tasks

**Use this document as your single source of truth for:**
1. **What to build** (Feature Breakdown)
2. **How to build it** (System Design + UI/UX)
3. **Why to build it** (PRD)
4. **How to generate code** (Master Prompt + examples)

**Remember:**
- Start with MVP (features 1-4)
- Test thoroughly on low-end Android devices
- Optimize for offline-first UX
- Keep bundle size under 110 KB (gzipped)
- Prioritize user feedback over perfection

**Good luck! 🚀**

---

**Document Owner:** CodeNest Team  
**Last Updated:** April 2026  
**Version:** 2.0  
**Status:** Production Ready  
**Next Review:** July 2026

---

## APPENDIX: USEFUL COMMANDS

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # Code linting
npm run format           # Code formatting (Prettier)

# Testing
npm run test             # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run lighthouse      # Lighthouse audit

# Deployment
npm run deploy          # Deploy to GitHub Pages
npm run build:analyze   # Bundle size analysis

# Database
npm run db:migrate      # Run IndexedDB migrations
npm run db:seed         # Seed test data

# Documentation
npm run docs:build      # Build docs site
npm run docs:serve      # Serve docs locally
```

**Questions? Check the PRD, System Design, or Feature Breakdown!**
