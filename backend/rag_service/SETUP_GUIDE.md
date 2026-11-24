# RAG Service Setup Guide

Complete step-by-step guide to set up and integrate the RAG service with KrishiVerse.

## 📋 Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Node.js 16+ (for backend)
- 2GB+ free RAM
- 1GB+ free disk space

## 🚀 Installation Steps

### Step 1: Navigate to RAG Service Directory

```bash
cd backend/rag_service
```

### Step 2: Create Virtual Environment

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- FastAPI (web framework)
- sentence-transformers (embeddings)
- faiss-cpu (vector search)
- uvicorn (ASGI server)
- Other required packages

**Note:** First installation may take 5-10 minutes as it downloads ML models.

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file (optional, defaults work fine):
```env
PORT=8000
HOST=0.0.0.0
VECTOR_STORE_TYPE=faiss
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
TOP_K_RESULTS=5
SIMILARITY_THRESHOLD=0.6
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
```

### Step 5: Start RAG Service

**Windows:**
```cmd
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Or manually:**
```bash
python app.py
```

The service will:
1. Load the embedding model (~90MB download on first run)
2. Build the vector store from agricultural data (~1-2 minutes)
3. Start the API server on http://localhost:8000

You should see:
```
INFO: Started server process
INFO: Waiting for application startup.
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000
```

## ✅ Verify Installation

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "vector_store_ready": true,
  "documents_loaded": 150,
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### Test 2: Ask a Question

```bash
curl -X POST http://localhost:8000/rag/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How to treat late blight in potato?",
    "language": "en"
  }'
```

### Test 3: Run Test Suite

```bash
python test_rag.py
```

## 🔌 Backend Integration

### Step 1: Update Backend .env

Add to `backend/.env`:
```env
RAG_SERVICE_URL=http://localhost:8000
```

### Step 2: Restart Backend

```bash
cd backend
npm start
```

### Step 3: Verify Integration

The backend will now:
1. Try RAG service first (if confidence ≥ 60%)
2. Fall back to Groq if RAG confidence is low
3. Fall back to Gemini if Groq fails

Check backend logs for:
```
[advisory.js] Attempting RAG service...
[advisory.js] RAG service answered with 89.2% confidence
```

## 📊 Testing the Full Stack

### 1. Start All Services

**Terminal 1 - RAG Service:**
```bash
cd backend/rag_service
python app.py
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
```

**Terminal 3 - Frontend:**
```bash
cd krishiverse
npm run dev
```

### 2. Test from Frontend

1. Open http://localhost:5173
2. Go to "Ask Expert" (🤖)
3. Ask: "How to control brown spot in paddy?"
4. Check network tab - should see:
   - Request to `/api/v1/advisory/ask`
   - Backend calls RAG service
   - Response includes `source: "rag"`

### 3. Check RAG Service Logs

In RAG service terminal, you should see:
```
2024-01-15 10:30:45 | INFO | rag_engine:search - Found 5 relevant documents
2024-01-15 10:30:45 | INFO | app:ask_question - Received question: How to control brown spot...
```

## 🛠️ Troubleshooting

### Problem: "Module not found" Error

**Solution:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Problem: "Port 8000 already in use"

**Solution:**
```bash
# Find and kill process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8000 | xargs kill -9

# Or use different port in .env
PORT=8001
```

### Problem: Slow first startup

**Cause:** Downloading embedding model and building vector store

**Solution:** 
- Wait 2-3 minutes on first run
- Subsequent starts are instant (uses cached vector store)
- Check logs: `tail -f logs/rag_service.log`

### Problem: Low confidence scores

**Solution:**
```bash
# Adjust threshold in .env
SIMILARITY_THRESHOLD=0.5

# Or rebuild vector store
curl -X POST http://localhost:8000/rag/rebuild
```

### Problem: Out of memory

**Solution:**
```bash
# Use smaller embedding model
EMBEDDING_MODEL=sentence-transformers/paraphrase-MiniLM-L3-v2

# Reduce top_k
TOP_K_RESULTS=3
```

### Problem: CORS errors

**Solution:**
Update `.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001,http://127.0.0.1:5173
```

## 🔍 Monitoring

### Check Service Status

```bash
curl http://localhost:8000/health
```

### Get Statistics

```bash
curl http://localhost:8000/rag/stats
```

Response:
```json
{
  "total_documents": 150,
  "documents_by_type": {
    "crop": 100,
    "disease": 20,
    "knowledge": 15,
    "scheme": 15
  },
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
  "vector_store_type": "faiss",
  "similarity_threshold": 0.6
}
```

### View Logs

```bash
# Real-time logs
tail -f logs/rag_service.log

# Last 50 lines
tail -n 50 logs/rag_service.log

# Search for errors
grep ERROR logs/rag_service.log
```

## 🔄 Updating Knowledge Base

### When to rebuild:
- After adding new agricultural data
- After updating disease database
- After modifying schemes

### How to rebuild:

**Option 1 - API:**
```bash
curl -X POST http://localhost:8000/rag/rebuild
```

**Option 2 - Manual:**
```bash
# Stop service
Ctrl+C

# Delete vector store
rm -rf models/vector_store

# Restart service (will rebuild automatically)
python app.py
```

## 📈 Performance Optimization

### 1. Use Faster Embedding Model

For production with limited resources:
```env
EMBEDDING_MODEL=sentence-transformers/paraphrase-MiniLM-L3-v2
```

### 2. Enable GPU (if available)

```bash
# Uninstall CPU version
pip uninstall faiss-cpu

# Install GPU version
pip install faiss-gpu
```

### 3. Production Deployment

```bash
# Use multiple workers
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4

# Or with gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 4. Caching

Consider adding Redis for caching frequent queries:
```python
# In config.py
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

## 🐳 Docker Deployment

### Build Image

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Run Container

```bash
docker build -t krishiverse-rag .
docker run -p 8000:8000 -v $(pwd)/models:/app/models krishiverse-rag
```

## ☁️ Cloud Deployment

### AWS EC2

```bash
# SSH to instance
ssh ubuntu@your-instance

# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv

# Clone and setup
git clone <repo>
cd backend/rag_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run with systemd
sudo nano /etc/systemd/system/rag-service.service
```

### Service file:
```ini
[Unit]
Description=KrishiVerse RAG Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/krishiverse/backend/rag_service
Environment="PATH=/home/ubuntu/krishiverse/backend/rag_service/venv/bin"
ExecStart=/home/ubuntu/krishiverse/backend/rag_service/venv/bin/python app.py

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable rag-service
sudo systemctl start rag-service
```

## 🎯 Next Steps

1. ✅ Verify RAG service is running
2. ✅ Test with sample questions
3. ✅ Integrate with backend
4. ✅ Test from frontend
5. 📊 Monitor performance
6. 🔄 Add more agricultural data
7. 🌐 Deploy to production

## 📞 Support

- Check logs first: `logs/rag_service.log`
- Run health check: `curl http://localhost:8000/health`
- Test connectivity: `curl http://localhost:8000/`
- Review backend logs for integration issues

## 🔗 Useful Links

- FastAPI Docs: https://fastapi.tiangolo.com
- Sentence Transformers: https://www.sbert.net
- FAISS: https://github.com/facebookresearch/faiss
- LangChain: https://python.langchain.com
