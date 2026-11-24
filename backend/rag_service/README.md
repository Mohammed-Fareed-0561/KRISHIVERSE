# KrishiVerse RAG Service

A Retrieval-Augmented Generation (RAG) service providing intelligent agricultural advisory using vector similarity search and semantic embeddings.

## 🌾 Features

- **Vector-based Knowledge Retrieval**: Uses FAISS for fast similarity search
- **Semantic Understanding**: Powered by sentence-transformers embeddings
- **Multi-lingual Support**: English, Tamil, and Hindi responses
- **Agricultural Knowledge Base**: 
  - Crop information
  - Disease diagnosis
  - Pest management
  - Government schemes
  - Fertilizer recommendations
  - Best practices

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- pip

### Installation

1. **Navigate to the RAG service directory**:
   ```bash
   cd backend/rag_service
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

### Running the Service

**Development mode**:
```bash
python app.py
```

**Production mode**:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

The service will start on `http://localhost:8000`

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "vector_store_ready": true,
  "documents_loaded": 150,
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### Ask Question
```bash
POST /rag/ask
Content-Type: application/json

{
  "question": "How to treat late blight in potato?",
  "language": "en",
  "context": {
    "crop": "potato",
    "district": "Coimbatore"
  }
}
```

Response:
```json
{
  "answer": "For potato late blight, spray Mancozeb (2.5g/L) or Metalaxyl+Mancozeb combination. Practice crop rotation and use NSKE spray as organic alternative.",
  "confidence": 0.89,
  "source": "rag-vector-search",
  "model": "rag-engine-v1",
  "sources_used": [
    {
      "type": "disease",
      "similarity": 0.89
    }
  ]
}
```

### Get Statistics
```bash
GET /rag/stats
```

### Rebuild Vector Store
```bash
POST /rag/rebuild
```

## 🏗️ Architecture

```
rag_service/
├── app.py              # FastAPI application
├── rag_engine.py       # Core RAG engine
├── config.py           # Configuration management
├── requirements.txt    # Python dependencies
├── .env.example        # Environment template
├── data/              # Knowledge base data
├── models/            # Vector store and embeddings
│   └── vector_store/
│       ├── faiss.index
│       ├── documents.pkl
│       └── metadata.pkl
└── logs/              # Application logs
```

## 🔧 Configuration

Edit `.env` file:

```env
# Server
PORT=8000
HOST=0.0.0.0

# Vector Store
VECTOR_STORE_TYPE=faiss
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
TOP_K_RESULTS=5
SIMILARITY_THRESHOLD=0.6

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
```

## 🔌 Integration with Backend

Update `backend/src/routes/advisory.js`:

```javascript
// Add before getAIAnswer function
async function callRAGService(userMessage, language = 'en') {
  try {
    const response = await axios.post('http://localhost:8000/rag/ask', {
      question: userMessage,
      language: language,
      context: {}
    }, {
      timeout: 10000
    })
    
    if (response.data && response.data.confidence >= 0.6) {
      return {
        answer: response.data.answer,
        model: response.data.model,
        source: 'rag'
      }
    }
    return null
  } catch (err) {
    console.warn('[RAG] Service unavailable, falling back:', err.message)
    return null
  }
}

// Modify getAIAnswer function
async function getAIAnswer(userMessage, temperature = 0.5) {
  // Try RAG service first
  const ragResult = await callRAGService(userMessage, 'en')
  if (ragResult) {
    return ragResult
  }
  
  // Fall back to Groq
  try {
    return await callGroq(userMessage, temperature)
  } catch (groqErr) {
    // ... existing Gemini fallback
  }
}
```

## 📊 Performance

- **Query Response Time**: ~50-200ms
- **Embedding Generation**: ~10-30ms per query
- **Vector Search**: ~5-20ms
- **Memory Usage**: ~500MB (with embeddings loaded)

## 🔄 Updating Knowledge Base

To rebuild the vector store after updating agricultural data:

1. **Via API**:
   ```bash
   curl -X POST http://localhost:8000/rag/rebuild
   ```

2. **Manually**:
   - Delete `models/vector_store/` directory
   - Restart the service (will rebuild automatically)

## 🐛 Troubleshooting

### Service won't start
- Check Python version: `python --version` (must be 3.9+)
- Verify all dependencies: `pip list`
- Check logs in `logs/rag_service.log`

### Low confidence scores
- Adjust `SIMILARITY_THRESHOLD` in `.env`
- Check if agricultural data is properly loaded
- Rebuild vector store: `POST /rag/rebuild`

### Out of memory
- Reduce `TOP_K_RESULTS` in configuration
- Use smaller embedding model
- Enable pagination for large datasets

## 📝 Development

### Adding New Knowledge

1. Edit `rag_engine.py`
2. Add new data loaders in `_build_vector_store()`
3. Rebuild vector store

### Testing

```bash
# Install dev dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t krishiverse-rag .
docker run -p 8000:8000 krishiverse-rag
```

## 📚 Knowledge Sources

- **Crops**: 100+ crop varieties with multi-lingual names
- **Diseases**: 20+ common diseases with symptoms and treatments
- **Schemes**: 15+ government schemes with eligibility details
- **Best Practices**: Irrigation, fertilization, pest management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- Create an issue on GitHub
- Contact: support@krishiverse.com
- Documentation: https://docs.krishiverse.com

## 🔮 Roadmap

- [ ] Add more language support (Kannada, Telugu)
- [ ] Implement caching for frequent queries
- [ ] Add support for image-based questions
- [ ] Integrate with weather data for contextual advice
- [ ] Real-time updates from agricultural APIs
- [ ] Multi-modal embeddings (text + images)
