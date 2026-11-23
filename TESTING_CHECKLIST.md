# ✅ KrishiVerse v2.0 - Complete Testing Checklist

**Before you begin:** Make sure all services are running!

```bash
# Quick start (recommended):
START_EVERYTHING.bat

# Or manual:
# Terminal 1: cd backend && npm start
# Terminal 2: cd backend/rag_service && venv\Scripts\activate && python app.py
# Terminal 3: cd krishiverse && npm run dev
```

---

## 🔍 Pre-Flight Checks

### 1. Services Running
- [ ] Backend running on http://localhost:3001
- [ ] RAG Service running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173

### 2. Health Checks
```bash
# Test backend
curl http://localhost:3001/api/v1/health

# Test RAG service
curl http://localhost:8000/health

# Should both return 200 OK
```

### 3. Environment Variables
- [ ] `krishiverse/.env` has `VITE_OPENWEATHER_API_KEY`
- [ ] `backend/.env` has `OPENWEATHER_API_KEY`
- [ ] Both have `GROQ_API_KEY`

---

## 🧪 Functional Testing

### Test Suite 1: Chatbot Introduction

#### Test 1.1: English Introduction
```
URL: http://localhost:5173/ask
Input: "what can you do?"
Expected:
✅ Shows feature list (Disease Diagnosis, Fertilizer, etc.)
✅ Mentions 4 languages (EN/HI/TA/MR)
✅ Provides example queries
❌ NOT generic advice or "contact expert"
```

#### Test 1.2: Alternative Phrasings
```
Input: "tell me about yourself"
Expected: Same comprehensive introduction

Input: "what is this app?"
Expected: Similar introduction

Input: "help"
Expected: Feature list or suggestions
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 2: Rice Disease Detection

#### Test 2.1: Yellow Spots (Tungro)
```
Input: "my rice crops have yellow spots"
Expected:
✅ Detected: Tungro Disease
✅ Confidence: 80-90%
✅ Shows matched symptoms (3-5 items)
✅ Organic treatment (4+ methods)
✅ Chemical treatment (2+ methods)
✅ Prevention tips (3+ items)
✅ Kisan helpline number visible
```

#### Test 2.2: Diamond Spots (Blast)
```
Input: "rice leaves have diamond shaped spots with gray center"
Expected:
✅ Detected: Rice Blast
✅ Confidence: 75-85%
✅ Mentions "Tricyclazole" or "Carbendazim"
```

#### Test 2.3: Brown Spots
```
Input: "brown circular spots on paddy leaves"
Expected:
✅ Detected: Brown Spot
✅ Confidence: 70-80%
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 3: Multi-Crop Disease Detection

#### Test 3.1: Tomato Early Blight
```
Input: "tomato leaves have brown spots with concentric rings"
Expected:
✅ Detected: Early Blight
✅ Mentions "target board pattern"
✅ Mancozeb or Chlorothalonil recommended
```

#### Test 3.2: Cotton Wilt
```
Input: "cotton plant is wilting and yellowing"
Expected:
✅ Detected: Cotton Wilt
✅ Mentions Fusarium
✅ Trichoderma or Carbendazim treatment
```

#### Test 3.3: Wheat Rust
```
Input: "wheat leaves have orange brown pustules"
Expected:
✅ Detected: Wheat Rust
✅ Mentions resistant varieties (HD-2967, PBW-343)
```

#### Test 3.4: Potato Late Blight
```
Input: "potato leaves have water soaked lesions"
Expected:
✅ Detected: Late Blight
✅ Mentions Bordeaux mixture or Mancozeb
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 4: Multi-Language Support

#### Test 4.1: Hindi Query
```
Input: "धान का पत्ता पीला हो गया"
Expected:
✅ Detects rice disease
✅ Response mentions rice/धान
✅ Provides treatment
```

#### Test 4.2: Tamil Query
```
Input: "நெல் இலைகள் மஞ்சள் நிறமாக உள்ளது"
Expected:
✅ Detects rice disease
✅ Appropriate response
```

#### Test 4.3: Mixed Language
```
Input: "मेरे rice crops में yellow spots हैं"
Expected:
✅ Still detects disease correctly
✅ Provides treatment
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 5: Weather Component

#### Test 5.1: Weather Page Load
```
URL: http://localhost:5173/weather
Wait: 5 seconds
Expected:
✅ Current temperature displayed
✅ Weather icon shown
✅ 7-day forecast visible
❌ NOT stuck on skeleton loading
❌ NO error messages in console
```

#### Test 5.2: Weather Data Accuracy
```
Check console (F12):
Expected:
✅ API call to openweathermap.org succeeds
✅ Latitude/longitude detected
✅ No "API key missing" errors
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 6: Edge Cases

#### Test 6.1: Unknown Crop
```
Input: "my unknown plant has spots"
Expected:
✅ Either: Asks for crop type
✅ Or: Provides general disease advice
❌ NOT: Error or blank response
```

#### Test 6.2: Vague Query
```
Input: "help my crops"
Expected:
✅ Asks clarifying questions
✅ Or: Provides general suggestions
```

#### Test 6.3: Non-Agricultural Query
```
Input: "what is the capital of India?"
Expected:
✅ Politely redirects to agricultural topics
✅ Or: Provides fallback message
```

#### Test 6.4: Very Long Query
```
Input: "my rice crops planted 45 days ago in black soil with drip irrigation have started showing yellow spots on the upper leaves and some plants are stunted what should I do immediately"
Expected:
✅ Still detects "yellow spots" + "rice"
✅ Returns Tungro diagnosis
✅ Handles long text gracefully
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 7: Offline Mode

#### Test 7.1: Disconnect Internet
```
1. Disable internet connection
2. Input: "my rice crops have yellow spots"
Expected:
✅ Disease still detected (offline)
✅ Response appears in <1 second
✅ Shows treatments
✅ May show "offline" badge/indicator
```

#### Test 7.2: Weather Offline
```
URL: http://localhost:5173/weather (with internet off)
Expected:
✅ Shows "Offline" message
✅ Or: Shows cached/last known weather
❌ NOT: Infinite loading
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 8: RAG Service Integration

#### Test 8.1: RAG Health
```
curl http://localhost:8000/health
Expected JSON:
{
  "status": "healthy",
  "vector_store_ready": true,
  "documents_loaded": 13,
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

#### Test 8.2: RAG Query
```
curl -X POST http://localhost:8000/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"How to treat rice blast?"}'

Expected:
✅ Returns treatment advice
✅ Status 200
✅ Response in <3 seconds
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 9: Performance

#### Test 9.1: Response Time (Offline)
```
Input: "rice yellow spots"
Measure time from Enter to response visible
Expected: <1 second
Actual: _____ seconds
```

#### Test 9.2: Response Time (Online)
```
Input: Same query with internet on
Measure time with Groq enhancement
Expected: <3 seconds
Actual: _____ seconds
```

#### Test 9.3: Cold Start
```
1. Close all tabs
2. Restart frontend
3. First query: "what can you do?"
Expected: <2 seconds
Actual: _____ seconds
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Suite 10: UI/UX

#### Test 10.1: Responsive Design
```
Test on:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

All components visible and functional?
```

#### Test 10.2: Accessibility
```
- [ ] Can navigate with keyboard (Tab key)
- [ ] Screen reader announces messages
- [ ] Color contrast sufficient
- [ ] Font size readable
```

**Status:** [ ] PASS [ ] FAIL

---

## 📊 Test Results Summary

### Critical Tests (Must Pass)
- [ ] Test 1.1: Introduction shows features
- [ ] Test 2.1: Rice yellow spots → Tungro (80%+)
- [ ] Test 3.1: Tomato spots detected
- [ ] Test 5.1: Weather loads (not skeleton)
- [ ] Test 7.1: Offline disease detection works

### Important Tests (Should Pass)
- [ ] Test 2.2: Rice blast detected
- [ ] Test 3.2-3.4: Multi-crop detection
- [ ] Test 4.1-4.2: Hindi/Tamil support
- [ ] Test 6.1-6.4: Edge cases handled
- [ ] Test 9.1: Response time <1s offline

### Nice to Have (Can Fix Later)
- [ ] Test 4.3: Mixed language
- [ ] Test 8.1-8.2: RAG integration
- [ ] Test 9.3: Cold start performance
- [ ] Test 10.1-10.2: UI/UX polish

---

## 🐛 Issue Tracker

### Issues Found During Testing

**Issue #1:**
- Test Failed: _________________
- Expected: _________________
- Actual: _________________
- Screenshot/Error: _________________
- Priority: [ ] Critical [ ] High [ ] Medium [ ] Low

**Issue #2:**
- Test Failed: _________________
- Expected: _________________
- Actual: _________________
- Screenshot/Error: _________________
- Priority: [ ] Critical [ ] High [ ] Medium [ ] Low

**Issue #3:**
- Test Failed: _________________
- Expected: _________________
- Actual: _________________
- Screenshot/Error: _________________
- Priority: [ ] Critical [ ] High [ ] Medium [ ] Low

---

## ✅ Sign-Off

**Testing Date:** _________________

**Tester Name:** _________________

**Overall Result:**
- [ ] ✅ All Critical Tests PASS - Ready for Production
- [ ] ⚠️ Most Tests PASS - Minor fixes needed
- [ ] ❌ Multiple Failures - Requires debugging

**Notes:**
```
_____________________________________________________
_____________________________________________________
_____________________________________________________
```

---

## 🎯 Next Steps Based on Results

### If All Tests Pass ✅
1. ✅ Mark system as production-ready
2. 📚 Create user documentation
3. 🚀 Deploy to production server
4. 📊 Set up monitoring/analytics
5. 👥 Train farmers on usage

### If Some Tests Fail ⚠️
1. 🐛 Fix critical issues first
2. 🔄 Re-run failed tests
3. 📝 Update documentation
4. ✅ Get approval before production

### If Many Tests Fail ❌
1. 🔍 Review error logs
2. 💬 Contact support/developer
3. 🔄 Follow troubleshooting guide
4. 🛠️ Apply fixes from COMPREHENSIVE_FIXES_APPLIED.md

---

**Remember:** Disease detection accuracy >80% is EXCELLENT for agricultural AI!
