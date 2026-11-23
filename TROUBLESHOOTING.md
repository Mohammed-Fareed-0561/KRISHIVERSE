# Troubleshooting Guide - KrishiVerse RAG Integration

## 🔴 Problem: Messages Not Appearing in Frontend (localhost:5173/ask)

### Symptoms:
- You type a question in the chat box
- Message disappears or doesn't appear
- No response from AI
- Chat feels "broken"

### Root Cause Analysis:

This is usually one of these issues:

#### **Issue 1: Backend Not Running**

**Check:**
```bash
curl http://localhost:3001/api/v1/health
```

**Expected:** `{"status":"ok",...}`

**If fails:**
```bash
cd backend
npm start
```

---

#### **Issue 2: Frontend Can't Connect to Backend (CORS)**

**Check browser console (F12 → Console):**

Look for errors like:
- `Access-Control-Allow-Origin`
- `CORS policy`
- `Failed to fetch`

**Fix:**

1. Check `backend/src/bootstrap.js` line 69:
   ```javascript
   app.use(cors({ origin: FRONTEND_URL, credentials: true }))
   ```

2. Check `backend/.env`:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

3. Restart backend:
   ```bash
   cd backend
   npm start
   ```

---

#### **Issue 3: Wrong API URL in Frontend**

**Check `krishiverse/.env`:**
```env
VITE_API_BASE=http://localhost:3001/api/v1
```

**NOT:**
- ❌ `http://localhost:8000` (that's the RAG service)
- ❌ `http://127.0.0.1:61852` (that's old Streamlit)
- ✅ `http://localhost:3001/api/v1` (correct!)

**After changing .env:**
```bash
# Stop frontend (Ctrl+C)
# Start again
cd krishiverse
npm run dev
```

---

#### **Issue 4: API Request Format Issue**

**Check `krishiverse/src/services/api/apiClient.js`:**

The request should be:
```javascript
POST http://localhost:3001/api/v1/advisory/ask
Content-Type: application/json

{
  "question": "your question here",
  "language": "en",
  "context": {}
}
```

---

## 🔴 Problem: RAG Service Not Connecting

### Symptoms:
- Backend says "RAG service unavailable"
- Falls back to Groq/Gemini every time
- Slow responses

### Solutions:

#### **Check if RAG service is running:**
```bash
curl http://localhost:8000/health
```

**If not running:**
```bash
cd backend/rag_service
venv\Scripts\activate
python app.py
```

#### **Check RAG URL in backend:**

`backend/.env`:
```env
RAG_SERVICE_URL=http://localhost:8000
```

**Restart backend after changing:**
```bash
cd backend
npm start
```

---

## 🔴 Problem: Ports Already in Use

### Error Message:
```
Error: listen EADDRINUSE: address already in use :::3001
```

### Find What's Using the Port:

```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Output example:
# TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    12345
#                                                   ^^^^^ PID
```

### Kill the Process:

```bash
# Replace 12345 with actual PID
taskkill /PID 12345 /F
```

### Common Ports to Check:

| Port | Service | Command |
|------|---------|---------|
| 8000 | RAG Service | `netstat -ano \| findstr :8000` |
| 3001 | Backend API | `netstat -ano \| findstr :3001` |
| 5173 | Frontend | `netstat -ano \| findstr :5173` |
| 61852 | Old Streamlit | `netstat -ano \| findstr :61852` |

---

## 🔴 Problem: Python Dependencies Not Installing

### Error:
```
ERROR: Could not find a version that satisfies the requirement...
```

### Solutions:

#### **1. Upgrade pip:**
```bash
python -m pip install --upgrade pip
```

#### **2. Install with no cache:**
```bash
cd backend/rag_service
pip install -r requirements.txt --no-cache-dir
```

#### **3. Install one by one:**
```bash
pip install fastapi uvicorn sentence-transformers faiss-cpu pydantic python-dotenv requests
```

#### **4. Check Python version:**
```bash
python --version
# Should be Python 3.8 or higher
```

---

## 🔴 Problem: Vector Store Not Building

### Symptoms:
- RAG service starts but gives errors
- "Failed to load vector store"
- Low accuracy responses

### Solutions:

#### **1. Rebuild vector store:**
```bash
curl -X POST http://localhost:8000/rag/rebuild
```

#### **2. Check data files:**
```bash
cd backend/rag_service/data
ls
# Should see: crops.json, diseases.json, etc.
```

#### **3. Check logs:**
```bash
tail -f backend/rag_service/logs/rag_service.log
```

#### **4. Delete and rebuild:**
```bash
cd backend/rag_service
rm -rf models/vector_store
python app.py
# Will rebuild automatically
```

---

## 🔴 Problem: Streamlit App (Port 61852) Still Running

### Why This is a Problem:
The old Streamlit app is separate and doesn't integrate with your frontend. It was just for testing.

### Solution - Stop It:

#### **Find the process:**
```bash
netstat -ano | findstr :61852
# Note the PID (last column)
```

#### **Kill it:**
```bash
taskkill /PID <PID> /F
```

#### **Verify it's stopped:**
```bash
curl http://127.0.0.1:61852
# Should fail/timeout
```

### You Don't Need Streamlit Anymore!

The **FastAPI RAG service (port 8000)** is the proper replacement. It:
- ✅ Integrates with your Node.js backend
- ✅ Works with your React frontend
- ✅ Provides REST API endpoints
- ✅ Production-ready

---

## 🔴 Problem: Questions Work in Streamlit But Not in Frontend

### This is Expected!

The Streamlit app and your frontend are **completely separate systems**.

**Old System (Streamlit - Port 61852):**
```
Browser → Streamlit UI → Streamlit Backend → AI
```

**New System (Integrated - Port 5173):**
```
Browser → React Frontend → Node Backend → RAG Service → AI
          (5173)           (3001)          (8000)
```

### Make Sure You're Testing the Right Place:

❌ **Wrong:** `http://127.0.0.1:61852` (old Streamlit)
✅ **Right:** `http://localhost:5173/ask` (new integrated system)

---

## 🔴 Problem: Low Confidence / Always Using Groq

### Check RAG Performance:

```bash
# Test RAG directly
curl -X POST http://localhost:8000/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"How to control brown spot in rice?"}'
```

**Look at the `confidence` field:**
- **≥ 80%** → Excellent (RAG should be used)
- **60-79%** → Good (RAG should be used)
- **< 60%** → Low (Falls back to Groq/Gemini)

### If Confidence is Always Low:

#### **1. Check knowledge base:**
```bash
curl http://localhost:8000/rag/stats
# Should show 180+ documents
```

#### **2. Add more documents:**

Edit `backend/rag_service/data/*.json` files and add more agricultural content.

#### **3. Rebuild vector store:**
```bash
curl -X POST http://localhost:8000/rag/rebuild
```

---

## 🔴 Problem: CORS Errors in Browser Console

### Error Message:
```
Access to fetch at 'http://localhost:3001/api/v1/advisory/ask' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

### Solution:

#### **1. Check backend CORS config:**

File: `backend/src/bootstrap.js`

```javascript
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
```

#### **2. Check backend .env:**
```env
FRONTEND_URL=http://localhost:5173
```

#### **3. Restart backend:**
```bash
cd backend
npm start
```

#### **4. Clear browser cache:**
- Press Ctrl+Shift+R (hard refresh)
- Or open DevTools → Network → Disable cache

---

## 🔴 Problem: Environment Variables Not Loading

### Check .env Files Exist:

```bash
# Backend
ls backend/.env

# Frontend  
ls krishiverse/.env

# RAG Service
ls backend/rag_service/.env
```

### Create From Examples if Missing:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp krishiverse/.env.example krishiverse/.env
```

### Verify Content:

**backend/.env:**
```env
RAG_SERVICE_URL=http://localhost:8000
GROQ_API_KEY=your_key_here
FRONTEND_URL=http://localhost:5173
PORT=3001
```

**krishiverse/.env:**
```env
VITE_API_BASE=http://localhost:3001/api/v1
# Online AI goes through the backend proxy — do NOT set a Groq key here.
```

### Restart All Services After Changes!

---

## 📋 Quick Diagnostic Checklist

Run this checklist when things aren't working:

### ✅ Service Status:

```bash
# 1. RAG Service
curl http://localhost:8000/health
# Should return: {"status":"healthy",...}

# 2. Backend
curl http://localhost:3001/api/v1/health  
# Should return: {"status":"ok",...}

# 3. Frontend
curl http://localhost:5173
# Should return HTML (starts with <!DOCTYPE html>)
```

### ✅ Integration Test:

```bash
# Test backend → RAG connection
curl -X POST http://localhost:3001/api/v1/advisory/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"test","language":"en"}'

# Should return an answer (from RAG or Groq/Gemini)
```

### ✅ Browser Test:

1. Open `http://localhost:5173`
2. Press F12 → Console tab
3. Should see **NO red errors**
4. Navigate to `/ask`
5. Type a question
6. Should see your message appear
7. Should get a response within 1-3 seconds

---

## 🆘 Emergency Reset

If everything is broken, do a complete reset:

### 1. Stop All Services

Close all terminal windows or press Ctrl+C in each.

### 2. Kill All Processes

```bash
# Kill any lingering processes
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

### 3. Clear Ports

```bash
netstat -ano | findstr "3001 5173 8000 61852"
# Kill each PID shown
taskkill /PID <PID> /F
```

### 4. Reinstall RAG Dependencies

```bash
cd backend/rag_service
rmdir /s /q venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Restart Everything in Order

```bash
# 1. RAG Service
cd backend/rag_service
venv\Scripts\activate
python app.py

# Wait 10 seconds

# 2. Backend (new terminal)
cd backend
npm start

# Wait 5 seconds

# 3. Frontend (new terminal)
cd krishiverse  
npm run dev
```

### 6. Test Again

```bash
test_system.bat
```

---

## 📞 Still Stuck?

### Check These Files for Detailed Errors:

1. **RAG Service:**
   ```
   backend/rag_service/logs/rag_service.log
   ```

2. **Backend:**
   - Terminal output where you ran `npm start`

3. **Frontend:**
   - Browser Console (F12 → Console)
   - Browser Network tab (F12 → Network)

### Common Error Messages and Fixes:

| Error Message | Fix |
|---------------|-----|
| `EADDRINUSE` | Port in use - kill the process |
| `CORS policy` | Check FRONTEND_URL in backend/.env |
| `Cannot find module` | Run `npm install` in that directory |
| `Connection refused` | Service not running - start it |
| `404 Not Found` | Check URL path is correct |
| `500 Internal` | Check service logs for details |

---

## ✅ System is Working When...

You see all of these:

✅ RAG service responds to `http://localhost:8000/health`
✅ Backend responds to `http://localhost:3001/api/v1/health`
✅ Frontend loads at `http://localhost:5173`
✅ No CORS errors in browser console
✅ Questions appear when you type them
✅ AI responses arrive within 1-3 seconds
✅ Responses are agriculture-related and helpful

**Congratulations! Your system is fully operational! 🎉**

---

## 🎯 Prevention Tips

To avoid issues in the future:

1. **Always start services in order:** RAG → Backend → Frontend
2. **Wait 5-10 seconds** between starting each service
3. **Don't change .env files** while services are running
4. **Always restart** services after changing configuration
5. **Check health endpoints** before testing frontend
6. **Keep browser DevTools open** to catch errors early
7. **Use `start_all.bat`** for consistent startup

---

**Need more help? Check the other documentation files:**
- `COMPLETE_STARTUP_GUIDE.md`
- `backend/rag_service/README.md`
- `RAG_INTEGRATION_GUIDE.md`
