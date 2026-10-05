# KrishiVerse - Offline-First Agricultural Advisory PWA

**Empowering Indian farmers with offline-first agricultural guidance, pest detection, weather forecasts, and market intelligence — in their own language.**

---

## What is KrishiVerse?

KrishiVerse is a Progressive Web App (PWA) designed for small-holder farmers in Tamil Nadu and South India. It provides:

- **Ask** — AI-powered agricultural advice chatbot (works offline via Ollama)
- **Diagnose** — Plant disease detection from leaf photos (TensorFlow.js)
- **Weather** — 7-day forecasts with farming tips
- **Mandi Prices** — Real-time agricultural commodity prices
- **Maps** — Locate nearby fertilizer shops, drone services, govt offices
- **Schemes** — Government subsidy guides with eligibility checkers
- **Multi-Language** — Tamil, English, Telugu, Kannada, Hindi

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, DaisyUI |
| State | Zustand |
| AI/ML | TensorFlow.js, Ollama (local LLM) |
| Maps | Leaflet, React-Leaflet |
| i18n | i18next, react-i18next |
| Charts | Chart.js, Recharts |
| Backend | Node.js, Express |
| Database | IndexedDB (client-side) |
| PWA | vite-plugin-pwa, Workbox |

---

## Project Structure

```
KRISHIVERSE_Project/
├── KRISHIVERSE/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API & database services
│   │   ├── store/            # Zustand state stores
│   │   ├── pages/            # Page components
│   │   ├── i18n/             # Translations (ta, en, te, kn, hi)
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   ├── manifest.json
│   │   └── service-worker.js
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                  # Backend (Node.js + Express)
│   ├── src/
│   ├── rag_service/          # RAG service for AI
│   ├── server.js
│   └── package.json
│
├── models/                   # ML models
├── docs/                     # Documentation
├── plans/                    # Planning documents
├── .env.example              # Environment template
├── .env.backend.example      # Backend env template
└── package.json              # Root package.json
```

---

## Prerequisites

1. **Node.js 16+** — [Download](https://nodejs.org/)
2. **npm 7+** — Comes with Node.js
3. **Git** — For cloning the repo
4. **Ollama (Optional)** — For offline chat — [Download](https://ollama.ai)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Mohammed-Fareed-0561/KRISHIVERSE.git
cd KRISHIVERSE
```

### 2. Install Dependencies

```bash
# Frontend
cd KRISHIVERSE
npm install

# Backend
cd ../backend
npm install
```

### 3. Setup Environment Variables

```bash
# Frontend
cp .env.example .env

# Backend
cp .env.example .env
```

Fill in your API keys in `.env`:
- `VITE_OPENWEATHERMAP_KEY` — [Get from OpenWeatherMap](https://openweathermap.org/api)
- `VITE_GOOGLE_PLACES_KEY` — [Get from Google Cloud](https://cloud.google.com/maps-platform)
- `VITE_OLLAMA_BASE_URL` — `http://localhost:11434` (if running locally)

### 4. Start Development Server

```bash
# Frontend (from KRISHIVERSE/ directory)
npm run dev

# Backend (from backend/ directory)
node server.js
```

The app opens at **http://localhost:5173**

### 5. Install as PWA (Mobile)

1. On your Android phone, open `http://localhost:5173` (or your computer's IP:5173)
2. Look for "Install" button in browser menu
3. App installs like a native app
4. Works offline!

---

## Available Scripts

### Frontend (KRISHIVERSE/)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage |
| `npm run deploy` | Deploy to GitHub Pages |

### Backend (backend/)

| Command | Description |
|---------|-------------|
| `node server.js` | Start backend server |
| `npm test` | Run backend tests |

---

## Configuration

### Environment Variables (.env)

```bash
# API Keys
VITE_OPENWEATHERMAP_KEY=your_key_here
VITE_GOOGLE_PLACES_KEY=your_key_here

# Local AI (offline)
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=mistral

# App config
VITE_DEFAULT_LANGUAGE=ta
VITE_DEFAULT_LAT=11.0168
VITE_DEFAULT_LON=76.9558
```

### Ollama Setup (Offline Chat)

```bash
# Install Ollama from https://ollama.ai
ollama serve

# Download model (one-time)
ollama pull mistral

# Verify
curl http://localhost:11434/api/tags
```

---

## Features

### 1. Ask (Chatbot)
- Ask farming questions in Tamil/English
- Works offline (local Ollama model)
- Chat history saved locally in IndexedDB

### 2. Diagnose (Disease Detection)
- Capture or upload leaf photo
- Instant disease identification with confidence score
- Treatment recommendations
- Offline-first (local TensorFlow.js model)

### 3. Weather
- 7-day forecast with farming advice
- Cached for offline access
- Auto-refreshes daily

### 4. Mandi Prices
- Real-time commodity prices
- Compare across mandis
- Price trend charts (7/30/90 days)

### 5. Maps
- Locate fertilizer shops, seeds dealers, drone services
- Show distance, rating, contact info
- Cached for offline

### 6. Government Schemes
- Active subsidies (PMKSY, PM-KISAN, etc.)
- Eligibility checkers
- How-to guides

---

## Testing

```bash
# Frontend tests
cd KRISHIVERSE
npm run test

# Backend tests
cd backend
npm test
```

---

## Deployment

### GitHub Pages (Frontend)

```bash
cd KRISHIVERSE
npm run build
npm run deploy
```

### Backend

Deploy `backend/` to any Node.js hosting (Railway, Render, etc.)

---

## License

MIT License

---

## Acknowledgments

Built for Indian farmers. Special thanks to:
- [React](https://react.dev) & [Vite](https://vitejs.dev)
- [TensorFlow.js](https://js.tensorflow.org)
- [Leaflet](https://leafletjs.com)
- [Tailwind CSS](https://tailwindcss.com)
- [OpenWeatherMap](https://openweathermap.org)
- [Ollama](https://ollama.ai)
