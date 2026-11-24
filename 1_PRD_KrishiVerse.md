# KrishiVerse - Product Requirement Document (PRD)

**Version:** 2.0  
**Date:** April 2026  
**Status:** Production Ready  
**Target Users:** Small-holder farmers (Tamil Nadu, South India)  
**Platform:** PWA (Progressive Web App) - Offline-first

---

## 1. Executive Summary

KrishiVerse is an **offline-first agricultural advisory PWA** designed for small-holder farmers in South India. It provides real-time guidance on crop management, pest detection, market prices, weather forecasting, and government scheme information—with minimal data usage and zero dependency on constant internet connectivity.

### Key Value Proposition
- **Works completely offline** after first load
- **Lightweight** (~15-20 MB total, ~35 KB gzipped JS)
- **Multi-language support** (Tamil, Telugu, Kannada, Hindi, English)
- **Free and open-source** core features
- **Farmer-friendly UI** (large buttons, simple language, icons)

---

## 2. Problem Statement

### User Pain Points
1. **Poor internet connectivity** in rural areas → Can't access agricultural advice when needed
2. **High data costs** → Can't afford constant API calls
3. **Language barrier** → Information only in English
4. **Information fragmentation** → Must visit multiple apps for weather, prices, pest info
5. **Complex government schemes** → Difficult to understand subsidy eligibility
6. **Pest/disease misidentification** → Leads to crop loss and wasted pesticides

### Business Problem
- Current AgriTech solutions require constant connectivity
- Farmers in Tier-2/3 areas are underserved
- No affordable, locally-relevant advisory platform

---

## 3. User Personas

### Primary User: Rajeesh (35-year-old sugarcane farmer, Tamil Nadu)
- **Device:** Android 8.0 phone, 2 GB RAM, limited data (2G/3G connectivity)
- **Language:** Tamil (primary), English (secondary)
- **Pain point:** Crop disease identification, pest management, market prices
- **Behavior:** Checks app 2-3 times daily in fields
- **Success metric:** Saves 20% on pesticides, increases yield by 10%

### Secondary User: Priya (28-year-old horticulture farmer)
- **Device:** Decent smartphone, occasional 4G
- **Language:** Tamil + English
- **Pain point:** Subsidy eligibility, drone service availability
- **Behavior:** Plans crop cycle quarterly
- **Success metric:** Accesses govt schemes info, reduces paperwork time

---

## 4. Core Features

### 4.1 Ask (Chatbot)
**Description:** Farmers ask agricultural questions in natural language.

**Functionality:**
- Accept text/voice input in multiple languages
- Local LLM responds (Mistral 7B via Ollama)
- Claude AI verification when online (optional premium)
- Cache common Q&A for offline access
- History of past questions

**Requirements:**
- Instant response (< 2 seconds offline)
- Support for 200+ common farming questions
- Graceful fallback to FAQ when offline

**Success Criteria:**
- 90% query satisfaction rate
- Response time < 2s

---

### 4.2 Diagnose (Plant Disease Detection)
**Description:** Farmers upload leaf/plant image to detect diseases.

**Functionality:**
- Capture image from camera or gallery
- Local TensorFlow.js CNN model predicts disease (offline)
- Show confidence score + recommended treatments
- Claude API verification (when online)
- Link to pest management guides

**Requirements:**
- Support JPEG, PNG, WebP formats
- Handle images up to 5 MB
- Batch processing (max 5 images/session to save memory)
- Accuracy: 80%+ for common diseases

**Success Criteria:**
- < 3 second prediction time on mid-range phones
- 85%+ accuracy for top 10 diseases in Tamil Nadu

---

### 4.3 Weather (7-Day Forecast)
**Description:** Display offline weather forecast for next 7 days.

**Functionality:**
- Fetch 7-day forecast from OpenWeatherMap (when online)
- Cache in IndexedDB for offline access
- Display temperature, humidity, rainfall, wind
- Show alerts for extreme weather
- Provide farming advice based on weather (e.g., "Good day to spray pesticides - low wind")
- Auto-refresh daily

**Requirements:**
- Update once per day (morning 6 AM)
- Show 7-day historical accuracy
- Support for farmer's location (GPS or manual)
- Backward compatible with 7-day offline access

**Success Criteria:**
- 95%+ forecast accuracy (compare with IMD)
- Zero failed refreshes in poor connectivity

---

### 4.4 Mandi Price (Market Intelligence)
**Description:** Display real-time agricultural commodity prices.

**Functionality:**
- Fetch daily crop prices for Tamil Nadu mandis
- Show price trends (last 7, 30, 90 days)
- Filter by crop type (rice, sugarcane, cotton, etc.)
- Compare prices across local mandis
- Alert when price crosses user's target
- Offline: Show cached prices from last sync

**Requirements:**
- Source: Government AGMARK API or spot.gov.in scraping
- Cache updates daily (morning 7 AM)
- Support 50+ crop types
- Latency: < 500 ms to load cached data

**Success Criteria:**
- Price accuracy: 99% (vs official mandi board)
- Update frequency: daily at 7 AM

---

### 4.5 Maps (Shop Locator)
**Description:** Locate nearby fertilizer shops, drone services, and govt offices.

**Functionality:**
- Interactive Leaflet.js map (OpenStreetMap)
- Search/filter by type (fertilizer, seeds, drone services, input centers)
- Show shop details (name, address, phone, hours)
- Route navigation (link to Google Maps)
- Offline: Show cached shops last seen within 50 km

**Requirements:**
- Support 3 shop types: fertilizer, seeds, drone services
- Load < 100 shops on initial map (lazy load on scroll)
- Support GPS location + manual location entry
- Handle offline gracefully (show stale data with timestamp)

**Success Criteria:**
- Map loads in < 1 second (even on 3G)
- 95%+ shop data accuracy
- 50+ shops indexed per district

---

### 4.6 Drone Technology (Agri-Tech Info)
**Description:** Educational pages about agricultural drone use cases.

**Functionality:**
- Static pages on drone benefits (pest monitoring, spraying, soil mapping)
- Directory of local drone service providers
- Link to training resources
- Cost-benefit analysis for farmers
- Local success stories

**Requirements:**
- Static HTML (no backend calls)
- 5-10 educational pages
- Mobile-responsive
- Lazy load images

**Success Criteria:**
- Load time < 1 second
- High engagement (>3 min average session)

---

### 4.7 Government Schemes
**Description:** Information about agricultural subsidies and schemes.

**Functionality:**
- List active govt schemes (PMKSY, PM-KISAN, state-specific)
- How-to guides with embedded YouTube videos
- Eligibility checker (simple questionnaire)
- Step-by-step application process
- Contact details for nodal agencies
- Download scheme PDFs

**Requirements:**
- Support 15+ schemes (PMKSY, PM-KISAN, Pradhan Mantri Fasal Bima, etc.)
- Update schemes quarterly
- Video links work offline (cached or embedded)
- PDF download on-demand

**Success Criteria:**
- 90%+ eligibility checker accuracy
- 50+ farmers per week apply via app guidance

---

### 4.8 Multi-Language Support
**Description:** Full app localization in regional languages.

**Languages:**
- Tamil (primary)
- English
- Telugu
- Kannada
- Hindi (future)

**Requirements:**
- Use i18next for translation management
- All UI strings translatable
- Direction support for RTL languages (if needed)
- Language toggle in settings

**Success Criteria:**
- 95%+ UI coverage in all languages
- < 100 ms language switch time

---

## 5. Non-Functional Requirements

### Performance
- Initial load: < 3 seconds (3G)
- Subsequent loads: < 1 second
- Offline functionality: instant
- App size: 15-20 MB total
- JavaScript bundle: < 110 KB (gzipped)

### Reliability
- 99.5% API uptime (OpenWeatherMap, AGMARK)
- Graceful degradation when APIs unavailable
- Sync queue for offline actions

### Security
- No sensitive data stored unencrypted
- HTTPS only for API calls
- User data stored locally (not sent to server)
- Privacy-first design

### Compatibility
- Android 5.0+ (minimum)
- iOS 12+ (future)
- Low-end devices (2 GB RAM)
- Works on 2G/3G/4G connections

### Accessibility
- WCAG 2.1 Level AA compliance
- Large text (16px minimum)
- High contrast ratios
- Touch targets: 48px minimum
- Screen reader support

---

## 6. User Stories

### Story 1: Offline Crop Advisory
**As a** farmer in a remote area  
**I want to** ask questions about crop management when offline  
**So that** I don't lose crops due to delayed advice

**Acceptance Criteria:**
- Can ask questions even without internet
- Get response within 3 seconds
- Response is relevant and actionable

---

### Story 2: Disease Diagnosis
**As a** farmer with a crop disease  
**I want to** upload a photo and get instant disease ID  
**So that** I can treat the disease immediately

**Acceptance Criteria:**
- Upload image in < 10 seconds
- Get diagnosis within 3 seconds
- Diagnosis accuracy > 80%

---

### Story 3: Market Intelligence
**As a** sugarcane farmer  
**I want to** check mandi prices before selling  
**So that** I can time my harvest for best price

**Acceptance Criteria:**
- See prices for all local mandis
- Price data refreshes daily
- Can set price alerts

---

### Story 4: Multi-Language Access
**As a** Tamil-speaking farmer  
**I want to** use the app entirely in Tamil  
**So that** I understand all features clearly

**Acceptance Criteria:**
- All buttons, text, labels in Tamil
- Language switch in < 100 ms
- No mixed languages

---

## 7. Data Requirements

### Data Sources (APIs)
1. **Weather:** OpenWeatherMap API (free tier)
2. **Mandi Prices:** AGMARK API or spot.gov.in scraping
3. **Shop Locator:** Google Places API + manual database
4. **Disease Model:** PlantVillage dataset (open-source)
5. **Govt Schemes:** Web scraping + manual updates

### Data Storage (Client-side)
- **IndexedDB:** Weather (7 days), Mandi prices (7 days), shop locations, chat history
- **LocalStorage:** User preferences (language, location), app settings
- **Service Worker Cache:** Static assets, UI bundle

### Data Refresh Frequency
- Weather: Daily (6 AM)
- Mandi prices: Daily (7 AM)
- Shops: Weekly
- Schemes: Monthly
- Disease model: Quarterly

---

## 8. Technical Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Framework** | React 18 + Vite | Fast builds, small bundle |
| **Styling** | Tailwind CSS + DaisyUI | Farmer-friendly components |
| **State Management** | Zustand | Lightweight, offline-friendly |
| **Maps** | Leaflet.js + OpenStreetMap | Open-source, no API costs |
| **AI Models** | TensorFlow.js (disease), Ollama (chat) | Runs locally, offline-capable |
| **Internationalization** | i18next | Easy translation management |
| **Offline** | Service Worker + IndexedDB | PWA-standard approach |
| **Icons** | Tabler Icons | Lightweight, clear for farmers |

---

## 9. Success Metrics

### Primary KPIs
- **User Adoption:** 5,000+ farmers in first 6 months
- **Daily Active Users:** 1,000+ by month 6
- **Feature Usage:** Ask 60%, Diagnose 30%, Weather 80%, Prices 50%
- **Offline Rate:** 40%+ sessions start offline
- **Retention:** 60%+ 30-day retention

### Secondary Metrics
- **App Performance:** Lighthouse score > 95
- **Error Rate:** < 0.1% API failures
- **User Satisfaction:** NPS > 40
- **Disease Diagnosis Accuracy:** > 85%

---

## 10. Deployment & Rollout

### Phase 1 (Weeks 1-4): MVP
- Ask + Diagnose + Weather
- Basic UI
- Tamil + English
- Deploy to production

### Phase 2 (Weeks 5-8): Features
- Mandi Prices + Maps
- Multi-language expansion
- Government Schemes

### Phase 3 (Weeks 9-12): Polish & Scale
- Performance optimization
- User feedback integration
- Scaling infrastructure

---

## 11. Assumptions & Constraints

### Assumptions
- Farmers have at least 2G connectivity occasionally
- Farmers have Android 5.0+ devices
- Government APIs remain stable
- PlantVillage dataset covers 80% of local diseases

### Constraints
- **Budget:** Free/minimal cost (< $50/month)
- **Team:** CodeNest (4 people, part-time)
- **Timeline:** 12 weeks to MVP
- **Data:** Government data sources may change

---

## 12. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| API downtime (Weather/Prices) | Users can't access current data | Medium | Cache data, graceful fallback |
| Disease model low accuracy | Wrong diagnosis damages crops | High | Use ensemble models, Claude verification |
| Poor offline UX | Users frustrated with cached data | Medium | Clear offline indicators, sync notifications |
| Language translation errors | Users confused | Low | Professional review by native speakers |

---

## 13. Future Roadmap (Post-MVP)

- **Voice input/output** (Web Speech API)
- **Crop planning tool** (seasonal calendar)
- **Soil health testing** integration
- **IoT sensor** integration (soil moisture, temperature)
- **Community features** (farmer groups, peer advice)
- **iOS version**

---

## 14. Appendices

### A. API Specifications
See `2_API_Specification.md`

### B. Database Schema
See `3_System_Design.md`

### C. UI Wireframes
See `4_UI_Wireframes.md`

---

**Document Owner:** CodeNest Team  
**Last Updated:** April 2026  
**Next Review:** July 2026
