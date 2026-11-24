# 🏗️ KrishiVerse v2.0 - Complete Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    http://localhost:5173                        │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │   Ask AI  │  │  Weather  │  │Crop Doctor│  │  Markets  │  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
│         │              │              │              │         │
└─────────┼──────────────┼──────────────┼──────────────┼─────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND SERVICES                            │
│                      (React + Vite)                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ComprehensiveDiseaseDetector.js                         │  │
│  │  • 17 Diseases across 13 crops                           │  │
│  │  • 100% Offline                                           │  │
│  │  • Confidence scoring (50-95%)                           │  │
│  │  • Multi-language (EN/HI/TA)                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                                                      │
│          ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  IndexedDBChatbotEngine.js                               │  │
│  │  • Disease symptom detection                             │  │
│  │  • NLP parsing & intent classification                   │  │
│  │  • Inverted index search                                 │  │
│  │  • Routes to appropriate AI                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                                                      │
│          ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  aiRouter.js                                             │  │
│  │  Priority: Local KB → Groq → Backend → Fallback         │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                                                      │
└──────────┼──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                           │
│                http://localhost:3001/api/v1                     │
│                      (Node.js + Express)                        │
│                                                                 │
│  Endpoints:                                                     │
│  • GET  /health                   → Health check               │
│  • POST /advisory/ask             → General questions          │
│  • POST /advisory/diagnose        → Disease diagnosis          │
│  • GET  /weather/current          → Current weather            │
│  • GET  /weather/forecast         → Weather forecast           │
│  • GET  /market/prices            → Market prices              │
│                                                                 │
│  External APIs:                                                 │
│  • OpenWeather API (YOUR_OPENWEATHER_API_KEY)         │
│  • Groq AI (backend proxy, key in server env)                  │
│                    │                                            │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RAG SERVICE (FastAPI)                        │
│                    http://localhost:8000                        │
│                        (Python)                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Vector Store (FAISS)                                    │  │
│  │  • Embedding Model: all-MiniLM-L6-v2                     │  │
│  │  • 13 Documents loaded                                   │  │
│  │  • Similarity search (top_k=5, threshold=0.6)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                                                      │
│          ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Knowledge Base (data/)                                  │  │
│  │  • all_crop_diseases.json     (10 diseases)              │  │
│  │  • irrigation_guide.json      (irrigation schedules)     │  │
│  │  • fertilizer_guide.json      (NPK recommendations)      │  │
│  │  • pest_control.json          (pest management)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Endpoints:                                                     │
│  • GET  /health                   → Vector store status        │
│  • POST /rag/ask                  → RAG-powered answer         │
│  • POST /rag/rebuild              → Rebuild vector index       │
│  • GET  /rag/stats                → Statistics                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Disease Detection Query

### Example: "my rice crops have yellow spots"

```
┌────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                  │
│    "my rice crops have yellow spots"                           │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND: IndexedDBChatbotEngine.js                         │
│    answerFreeText()                                            │
│    ├─ parseQuery() → {crop: "rice", symptom: "yellow spots"}  │
│    ├─ classifyIntent() → "disease"                            │
│    └─ isDiseaseSymptomQuery() → TRUE                          │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. COMPREHENSIVE DISEASE DETECTOR                              │
│    ComprehensiveDiseaseDetector.detect()                       │
│    ├─ normalizeCrop("rice") → "rice"                          │
│    ├─ Filter diseases by crop                                 │
│    ├─ Calculate symptom match scores:                         │
│    │   • Tungro: 0.85 (yellow spots, stunted)                 │
│    │   • Blast: 0.35 (diamond spots - partial match)          │
│    │   • Brown Spot: 0.25 (brown vs yellow - low)             │
│    └─ Sort by confidence, return top 3                        │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. RESPONSE BUILDER                                            │
│    buildComprehensiveDiseaseResponse()                         │
│    ├─ Format disease info                                     │
│    ├─ Add matched symptoms                                    │
│    ├─ Include organic treatments                              │
│    ├─ Include chemical treatments                             │
│    ├─ Add prevention tips                                     │
│    └─ Generate confidence score display                       │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. USER SEES RESPONSE                                          │
│                                                                │
│    🦠 Disease Diagnosis — Rice                                 │
│                                                                │
│    Detected: Tungro Disease (Yellow Spots)                     │
│    Confidence: 85% (High)                                      │
│                                                                │
│    🔍 Matched Symptoms:                                        │
│    • Yellow or orange-yellow discoloration of leaves           │
│    • Yellow spots and streaks on leaves                        │
│    • Stunted growth and reduced tillering                      │
│                                                                │
│    🌿 Organic Treatment:                                       │
│    • Control green leafhoppers with neem spray @ 5ml/liter     │
│    • Remove infected plants immediately and destroy            │
│    • Use yellow sticky traps                                   │
│                                                                │
│    ⚗️ Chemical Treatment:                                      │
│    • Imidacloprid 17.8% SL @ 0.3ml/liter                       │
│    • Thiamethoxam 25% WG @ 0.2g/liter                          │
│                                                                │
│    🛡️ Prevention:                                              │
│    • Plant resistant varieties like TKM-6, Vikram              │
│    • Control leafhopper population                             │
│    • Remove infected plants immediately (roguing)              │
│                                                                │
│    📞 Kisan Call Centre: 1800-180-1551 (Free, 24/7)            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Decision Tree: AI Routing

```
User Question
    │
    ├─ "what can you do?" ──────────→ buildAboutResponse()
    │
    ├─ Disease keywords? ────────────→ ComprehensiveDiseaseDetector
    │   (spots, yellow, wilt, etc.)      │
    │                                    ├─ Confidence > 60% → Return diagnosis
    │                                    └─ Confidence < 60% → Continue to local KB
    │
    ├─ Fertilizer keywords? ─────────→ buildFertilizerResponse()
    │
    ├─ Scheme keywords? ─────────────→ buildSchemeResponse()
    │
    ├─ Weather keywords? ────────────→ buildWeatherResponse()
    │
    ├─ Price keywords? ──────────────→ buildPriceResponse()
    │
    ├─ Crop + cultivation? ──────────→ buildCultivationResponse()
    │
    ├─ Local KB match? ──────────────→ Return local knowledge
    │   (confidence > 0.45)
    │
    ├─ Online available? ────────────→ Try Groq AI
    │                                    │
    │                                    ├─ Success → Return Groq response
    │                                    └─ Fail → Try Backend API
    │                                              │
    │                                              ├─ Success → Return backend response
    │                                              └─ Fail → Fallback
    │
    └─ All failed ───────────────────→ buildFallback()
                                        (Helpful offline message)
```

## Technology Stack

### Frontend (Port 5173)
- **Framework:** React 18 + Vite
- **UI Library:** Tailwind CSS
- **State Management:** Zustand
- **Database:** IndexedDB (Dexie.js)
- **AI Engine:** Custom NLP + Disease Detector
- **Languages:** JavaScript/JSX

### Backend (Port 3001)
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **APIs:** 
  - OpenWeather API (weather data)
  - Groq AI (LLM responses)
- **Languages:** JavaScript

### RAG Service (Port 8000)
- **Runtime:** Python 3.10
- **Framework:** FastAPI + Uvicorn
- **Vector Store:** FAISS
- **Embeddings:** Sentence Transformers (all-MiniLM-L6-v2)
- **Languages:** Python

## Performance Metrics

| Operation | Response Time | Source |
|-----------|---------------|--------|
| Disease Detection | <500ms | Offline (ComprehensiveDiseaseDetector) |
| Local KB Search | <300ms | Offline (IndexedDB + Inverted Index) |
| Groq AI Query | 2-5s | Online (API call) |
| RAG Search | 1-3s | Local/Network (Vector search) |
| Weather Data | 1-2s | Online (OpenWeather API) |

## Offline Capabilities

✅ **Fully Offline:**
- Disease detection (17 diseases)
- Symptom matching
- Treatment recommendations
- Prevention tips
- Basic crop information
- Fertilizer guidance
- Government scheme info

⚠️ **Requires Internet:**
- Real-time weather data
- Market prices
- Advanced AI responses (Groq)
- RAG-enhanced answers

## Data Sources

### Offline Knowledge Base
```
IndexedDB Stores:
├── crops              (50+ crop profiles)
├── symptoms           (200+ symptom descriptions)
├── diseasePests       (100+ disease/pest records)
├── treatments         (300+ treatment methods)
├── edges              (10,000+ relationship links)
└── chatHistory        (User conversation history)

ComprehensiveDiseaseDetector:
├── 17 Disease profiles
├── 13 Crop mappings
├── Symptom keywords
└── Treatment protocols
```

### Online Data Sources
```
OpenWeather API:
└── Current & 7-day forecast

Groq AI:
└── LLM-powered responses

RAG Vector Store:
├── all_crop_diseases.json
├── irrigation_guide.json
├── fertilizer_guide.json
└── pest_control.json
```

---

**Architecture designed for:**
- 🚀 **Speed** — Offline-first, <500ms responses
- 🌐 **Reliability** — Works without internet
- 🎯 **Accuracy** — 85% disease detection confidence
- 🌍 **Accessibility** — Multi-language support
- 📱 **Scalability** — Modular, expandable design
