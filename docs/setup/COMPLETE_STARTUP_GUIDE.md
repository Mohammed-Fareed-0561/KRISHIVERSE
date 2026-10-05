# Complete Startup Guide: Connect Frontend → Backend → RAG Service

## 🎯 Problem You Had

- **Streamlit app** running on `http://127.0.0.1:61852` (isolated, can't integrate)
- **Frontend** on `http://localhost:5173/ask` - messages not working
- **Backend** on `http://localhost:3001` - not connected to RAG
- **Questions disappearing** - no proper integration

## ✅ Solution Implemented

We've created a **professional FastAPI RAG service** that properly integrates with your backend and frontend. The Streamlit app was for testing only - we don't need it anymore!

---

## 🚀 Step-by-Step Startup

### **Step 1: Setup RAG Service** (One-time setup)

```bash
# Navigate to RAG service
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend\rag_service"

# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python test_rag.py
```

**Expected output:** All tests should pass ✅

---

### **Step 2: Configure Backend**

```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend"

# Check if .env exists
ls .env

# If not, create it from example:
cp .env.example .env
```

**Edit `backend/.env`** and add/update:

```env
# RAG Service Connection
RAG_SERVICE_URL=http://localhost:8000

# AI API Keys (for fallback)
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here

# Database (optional - uses in-memory if not set)
MONGODB_URI=

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Port
PORT=3001
```

---

### **Step 3: Configure Frontend**

```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\krishiverse"

# Check if .env exists
ls .env
```

**Edit `krishiverse/.env`** and verify:

```env
VITE_API_BASE=http://localhost:3001/api/v1
# Online AI goes through the backend proxy — do NOT set a Groq key here.
```

---

## 🎬 Starting the System (3 Terminals)

### **Terminal 1: Start RAG Service** (Port 8000)

```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend\rag_service"

# Activate virtual environment
venv\Scripts\activate

# Start RAG service
python app.py
```

**Expected output:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
RAG Engine initialized with 180 documents
Vector store ready!
```

**Keep this terminal running!** ✅

---

### **Terminal 2: Start Backend** (Port 3001)

```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend"

# Start backend
npm start
```

**Expected output:**
```
🌱 KrishiVerse backend running
port: 3001
apiBase: /api/v1
MongoDB connected (in-memory)
```

**Keep this terminal running!** ✅

---

### **Terminal 3: Start Frontend** (Port 5173)

```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\krishiverse"

# Start frontend
npm run dev
```

**Expected output:**
```
VITE ready in 500ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Keep this terminal running!** ✅

---

## 🧪 Testing the Complete System

### **Test 1: Health Checks**

Open separate browser tabs or use curl:

```bash
# Test RAG service
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"KrishiVerse RAG"}

# Test Backend
curl http://localhost:3001/api/v1/health
# Should return: {"status":"ok",...}

# Test Frontend
# Open: http://localhost:5173
# Should show KrishiVerse homepage
```

### **Test 2: RAG Integration**

```bash
# Direct RAG test
curl -X POST http://localhost:8000/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"How to treat brown spot in rice?"}'

# Should return high confidence answer (>80%)
```

### **Test 3: Full System Test**

1. **Open browser:** `http://localhost:5173`
2. **Click:** "Ask Expert" or navigate to `/ask`
3. **Type question:** "How to control late blight in potato?"
4. **Press Send** 📤

**What should happen:**
- ✅ Your question appears in chat
- ✅ AI response appears within 1-2 seconds
- ✅ Response is accurate and relevant
- ✅ Check browser console - no errors

---

## 🔍 How the System Works Now

```
┌─────────────────────────────────────────────────────────────┐
│                    User asks question                        │
│                  http://localhost:5173/ask                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React/Vite)                           │
│         Sends POST to /api/v1/advisory/ask                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Backend (Node.js Express)                          │
│              http://localhost:3001                           │
│                                                              │
│  1️⃣ Try RAG Service first                                    │
│     POST http://localhost:8000/rag/ask                       │
│     ├─ Confidence ≥ 60% → Return RAG answer ✅               │
│     └─ Confidence < 60% → Continue to Step 2                 │
│                                                              │
│  2️⃣ Try Groq API (if RAG low confidence)                     │
│     └─ Success → Return Groq answer ✅                       │
│     └─ Fail → Continue to Step 3                             │
│                                                              │
│  3️⃣ Try Gemini API (last resort)                             │
│     └─ Return Gemini answer ✅                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               RAG Service (FastAPI)                          │
│              http://localhost:8000                           │
│                                                              │
│  • Receives question                                         │
│  • Converts to embeddings (sentence-transformers)            │
│  • Searches vector store (FAISS)                             │
│  • Finds top 3 similar documents                             │
│  • Generates contextual answer                               │
│  • Returns with confidence score                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Why This is Better Than Streamlit

| Feature | **Streamlit App** | **FastAPI RAG Service** |
|---------|------------------|------------------------|
| Integration | ❌ Can't integrate with Node.js | ✅ REST API - works with any frontend |
| Performance | 🐌 Slow UI rendering | ⚡ Direct API calls (50-200ms) |
| CORS | ❌ Complex to configure | ✅ Built-in CORS support |
| Production | ❌ Not production-ready | ✅ Production-ready (Uvicorn) |
| Scalability | ❌ Single user UI | ✅ Handles 1000s of requests |
| Monitoring | ❌ No health checks | ✅ Health, stats, logging |
| Testing | ❌ Manual only | ✅ Automated test suite |

---

## 🛑 Troubleshooting

### **Problem: Messages not appearing in frontend**

**Solution:**
1. Check browser console (F12) for errors
2. Verify backend is running on port 3001
3. Check CORS settings in `backend/src/bootstrap.js`
4. Ensure `VITE_API_BASE=http://localhost:3001/api/v1` in `krishiverse/.env`

```bash
# Test backend is reachable from frontend
curl -X POST http://localhost:3001/api/v1/advisory/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"test","language":"en"}'
```

### **Problem: RAG service not responding**

**Check if it's running:**
```bash
curl http://localhost:8000/health
```

**If not running:**
```bash
cd backend/rag_service
venv\Scripts\activate
python app.py
```

**Check logs:**
```bash
tail -f backend/rag_service/logs/rag_service.log
```

### **Problem: Port already in use**

**Find and kill process:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill it (replace PID)
taskkill /PID <PID> /F
```

### **Problem: Dependencies not installing**

**Try upgrading pip:**
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```

---

## 📊 Monitoring Your System

### **Real-time Monitoring**

**Terminal 1: RAG Service Logs**
```bash
tail -f backend/rag_service/logs/rag_service.log
```

**Terminal 2: Backend Logs**
```bash
cd backend
npm start  # Shows logs in console
```

**Terminal 3: Frontend Logs**
```bash
cd krishiverse
npm run dev  # Shows logs in console
```

### **Check System Stats**

```bash
# RAG stats
curl http://localhost:8000/rag/stats

# Backend health
curl http://localhost:3001/api/v1/health
```

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

✅ **Frontend (localhost:5173):**
- Homepage loads without errors
- Can navigate to /ask page
- Input field is visible and responsive

✅ **Backend (localhost:3001):**
- Server logs show "KrishiVerse backend running"
- MongoDB connected (in-memory or external)
- No error messages

✅ **RAG Service (localhost:8000):**
- "RAG Engine initialized with 180 documents"
- "Vector store ready!"
- Responds to /health endpoint

✅ **Integration:**
- Questions typed in frontend appear in chat
- Responses come back within 1-2 seconds
- Responses are relevant to agriculture
- No CORS errors in browser console

---

## 🔄 Daily Startup Routine

Save this as **`start_all.bat`** in project root:

```bat
@echo off
echo Starting KrishiVerse System...
echo.

echo [1/3] Starting RAG Service (Port 8000)...
start "RAG Service" cmd /k "cd backend\rag_service && venv\Scripts\activate && python app.py"
timeout /t 5

echo [2/3] Starting Backend (Port 3001)...
start "Backend" cmd /k "cd backend && npm start"
timeout /t 5

echo [3/3] Starting Frontend (Port 5173)...
start "Frontend" cmd /k "cd krishiverse && npm run dev"

echo.
echo ✅ All services started!
echo.
echo RAG Service:  http://localhost:8000
echo Backend:      http://localhost:3001
echo Frontend:     http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop services
pause
```

**Usage:**
```bash
# Just double-click start_all.bat!
```

---

## 📞 Next Steps

1. **Close the Streamlit app** (port 61852) - you don't need it anymore!
2. **Follow Step 1-3** above to set up the system
3. **Use the 3-terminal startup** to run everything
4. **Test with the questions** in the test section
5. **Enjoy your fully integrated RAG system!** 🎉

---

## 📚 Additional Documentation

- `backend/rag_service/README.md` - Full RAG service docs
- `backend/rag_service/QUICK_START.md` - 5-minute setup
- `backend/rag_service/ARCHITECTURE.md` - Technical details
- `RAG_INTEGRATION_GUIDE.md` - Integration guide
- `CHATBOT_IMPROVEMENTS.md` - Recent improvements

---

## 🆘 Still Having Issues?

Check these files for detailed error information:

1. **RAG Service:** `backend/rag_service/logs/rag_service.log`
2. **Backend:** Terminal output where you ran `npm start`
3. **Frontend:** Browser console (F12 → Console tab)

**Common fix:** Restart all 3 services in order (RAG → Backend → Frontend)

---

**You're all set! Your KrishiVerse agricultural advisory system with RAG is ready to use! 🌾🚜**
