# Quick Start Guide - RAG Service

## ⚡ 5-Minute Setup

### 1. Install Python Dependencies

```bash
cd backend/rag_service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Start the Service

```bash
# Windows
start.bat

# Linux/Mac
chmod +x start.sh && ./start.sh

# Or directly
python app.py
```

### 3. Verify It's Working

Open browser: http://localhost:8000

You should see:
```json
{
  "service": "KrishiVerse RAG Service",
  "version": "1.0.0",
  "status": "running"
}
```

### 4. Test with a Question

```bash
curl -X POST http://localhost:8000/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How to treat brown spot in rice?", "language": "en"}'
```

### 5. Integrate with Backend

Add to `backend/.env`:
```env
RAG_SERVICE_URL=http://localhost:8000
```

Restart backend:
```bash
cd backend
npm start
```

## ✅ That's It!

The RAG service is now running and integrated with your backend.

**Frontend → Backend → RAG Service → Response**

### Test from Frontend

1. Open http://localhost:5173
2. Go to "Ask Expert" page
3. Ask any agricultural question
4. Response will come from RAG if confidence > 60%

### Check Logs

```bash
# RAG Service logs
tail -f logs/rag_service.log

# Backend logs (should show RAG integration)
# In backend terminal, look for:
# [advisory.js] RAG service answered with X% confidence
```

## 🔍 Common Issues

**Port 8000 in use?**
```bash
# Change port in .env
PORT=8001
```

**Slow first start?**
- Normal! First run downloads ~90MB model and builds vector store
- Takes 2-3 minutes
- Subsequent starts are instant

**Import errors?**
```bash
# Ensure virtual environment is active
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

## 📚 Next Steps

- See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed configuration
- See [README.md](README.md) for full documentation
- Run `python test_rag.py` for comprehensive tests
