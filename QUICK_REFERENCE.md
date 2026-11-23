# 🚀 KrishiVerse v2.0 - Quick Reference Card

## One-Command Startup
```bash
# Double-click this file in Windows Explorer:
START_EVERYTHING.bat

# Opens 3 terminals:
# 1. Backend (Port 3001)
# 2. RAG Service (Port 8000)
# 3. Frontend (Port 5173)

# Then open: http://localhost:5173
```

## URLs
```
Frontend:     http://localhost:5173
Backend API:  http://localhost:3001/api/v1
RAG Service:  http://localhost:8000
```

## Quick Tests

### Test 1: Introduction
```
URL: http://localhost:5173/ask
Query: "what can you do?"
Expected: Full feature list (not generic advice)
```

### Test 2: Rice Disease
```
Query: "my rice crops have yellow spots"
Expected: Tungro Disease (85% confidence)
```

### Test 3: Weather
```
URL: http://localhost:5173/weather
Expected: Real weather data (not skeleton loading)
```

## Supported Crops (13)
✅ Rice (Paddy)  
✅ Wheat  
✅ Cotton  
✅ Tomato  
✅ Chilli  
✅ Banana  
✅ Sugarcane  
✅ Potato  
✅ Onion  
✅ Maize (Corn)  
✅ Groundnut (Peanut)  
✅ Brinjal (Eggplant)  
✅ Cabbage  

## Disease Coverage (17)

### Rice (4)
- Blast Disease
- Tungro (Yellow Spots)
- Brown Spot
- Sheath Blight

### Tomato (3)
- Early Blight
- Late Blight
- Bacterial Wilt

### Others (10)
- Cotton Wilt
- Chilli Leaf Curl
- Banana Panama Wilt
- Wheat Rust
- Sugarcane Red Rot
- Potato Late Blight
- Onion Purple Blotch
- Maize Turcicum Blight
- Groundnut Tikka
- Brinjal Bacterial Wilt
- Cabbage Black Rot

## Sample Queries

### English
```
"my rice crops have yellow spots"
"tomato leaves have brown spots with rings"
"cotton plant is wilting"
"wheat has orange pustules"
"what fertilizer for paddy?"
"tell me about PM Kisan scheme"
```

### Hindi
```
"धान का पत्ता पीला हो गया"
"टमाटर के पत्ते पर भूरे धब्बे हैं"
"कपास का पौधा मुरझा रहा है"
```

### Tamil
```
"நெல் இலைகள் மஞ்சள் நிறமாக உள்ளது"
"தக்காளி இலைகளில் பழுப்பு புள்ளிகள்"
```

## Troubleshooting

### Weather Not Loading?
```bash
cd krishiverse
# Check .env has VITE_OPENWEATHER_API_KEY
cat .env | findstr OPENWEATHER

# Restart dev server
npm run dev
```

### Disease Detection Not Working?
```
1. Open browser console (F12)
2. Look for errors
3. Clear cache (Ctrl+Shift+R)
4. Try again
```

### RAG Service Down?
```bash
cd backend/rag_service
venv\Scripts\activate
python app.py
```

## API Keys

### Frontend (.env)
```
# Online AI goes through the backend proxy — no Groq key lives in the browser.
VITE_OPENWEATHER_API_KEY=284fb14b95a0636efeee744281b7d5a9
```

### Backend (.env)
```
GROQ_API_KEY=your_groq_api_key_here
OPENWEATHER_API_KEY=284fb14b95a0636efeee744281b7d5a9
```

## Support Resources
```
Kisan Call Centre: 1800-180-1551 (Free, 24/7)
ICAR: icar.org.in
AgMarkNet: agmarknet.gov.in
IMD Weather: imd.gov.in
```

## File Structure
```
krishiverse/
├── src/services/ai/
│   ├── ComprehensiveDiseaseDetector.js  ← 17 diseases
│   ├── IndexedDBChatbotEngine.js        ← Main chat engine
│   └── aiRouter.js                      ← Routes questions
backend/
├── rag_service/
│   ├── data/all_crop_diseases.json      ← 10 diseases (RAG)
│   └── app.py                           ← FastAPI service
```

## Common Commands

### Start Backend
```bash
cd backend
npm start
```

### Start RAG
```bash
cd backend/rag_service
venv\Scripts\activate
python app.py
```

### Start Frontend
```bash
cd krishiverse
npm run dev
```

### Test RAG Health
```bash
curl http://localhost:8000/health
```

### Rebuild RAG Index
```bash
curl -X POST http://localhost:8000/rag/rebuild
```

---

**Everything working?** ✅  
**Need help?** Check `FINAL_FIX_SUMMARY.md` for detailed docs!
