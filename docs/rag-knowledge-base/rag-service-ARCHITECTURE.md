# RAG Service Architecture

## 🏛️ System Overview

The KrishiVerse RAG (Retrieval-Augmented Generation) service is a specialized AI system designed to provide accurate, context-aware agricultural advisory by searching through a curated knowledge base of farming information.

## 🧩 Components

### 1. FastAPI Application (`app.py`)

**Purpose:** HTTP API server for handling RAG requests

**Responsibilities:**
- Accept incoming questions
- Validate requests
- Coordinate RAG pipeline
- Return structured responses
- Handle errors and fallbacks

**Key Endpoints:**
```python
GET  /              # Service info
GET  /health        # Health check
POST /rag/ask       # Main query endpoint
GET  /rag/stats     # Statistics
POST /rag/rebuild   # Rebuild vector store
```

### 2. RAG Engine (`rag_engine.py`)

**Purpose:** Core RAG logic and vector search

**Responsibilities:**
- Load and manage vector store
- Generate embeddings
- Perform similarity search
- Build responses from context

**Key Methods:**
```python
initialize()                    # Setup RAG system
search(query, top_k)           # Vector similarity search
generate_response(query, docs) # Create farmer-friendly answer
_build_vector_store()          # Construct from data sources
```

### 3. Configuration (`config.py`)

**Purpose:** Centralized configuration management

**Settings:**
- Server configuration (host, port)
- Vector store settings (type, path)
- RAG parameters (top_k, threshold)
- Logging configuration
- CORS settings

## 🔄 RAG Pipeline

```
User Question
     ↓
┌─────────────────────┐
│ 1. Embedding        │ → Convert question to vector (384 dimensions)
└─────────────────────┘
     ↓
┌─────────────────────┐
│ 2. Vector Search    │ → Find similar documents using FAISS
└─────────────────────┘
     ↓
┌─────────────────────┐
│ 3. Ranking          │ → Sort by L2 distance, filter by threshold
└─────────────────────┘
     ↓
┌─────────────────────┐
│ 4. Context Building │ → Combine top-k documents
└─────────────────────┘
     ↓
┌─────────────────────┐
│ 5. Response Gen     │ → Format farmer-friendly answer
└─────────────────────┘
     ↓
  Final Answer
```

## 📊 Data Flow

### Knowledge Base Construction

```
Agricultural Data Sources
    ├─ crops.json (100+ varieties)
    ├─ diseases.js (20+ conditions)
    ├─ chatbot_kb.js (30+ topics)
    └─ schemes.json (15+ programs)
         ↓
   Parse and Format
         ↓
   Document List (180+ docs)
         ↓
   Generate Embeddings
   (Sentence Transformers)
         ↓
   Build FAISS Index
   (L2 similarity)
         ↓
   Save to Disk
   models/vector_store/
```

### Query Processing

```
User Query: "How to treat late blight in potato?"
         ↓
Encode Query → [0.234, -0.156, 0.891, ...]  (384-dim vector)
         ↓
FAISS Search → Top 5 similar documents
         ↓
Results:
  1. Potato Late Blight (similarity: 0.92)
  2. Tomato Late Blight (similarity: 0.78)
  3. Fungicide Guide (similarity: 0.71)
  4. Potato Diseases (similarity: 0.68)
  5. IPM Practices (similarity: 0.61)
         ↓
Filter by threshold (0.6) → Keep all 5
         ↓
Build Context:
  "Potato late blight is caused by Phytophthora infestans.
   Symptoms include water-soaked lesions...
   Treatment: Spray Mancozeb (2.5g/L)..."
         ↓
Generate Response:
  "For potato late blight, immediately spray Mancozeb
   at 2.5g per liter of water. This fungal disease
   spreads quickly in cool, wet weather..."
         ↓
Return with confidence: 0.92
```

## 🧠 Embedding Model

**Model:** `sentence-transformers/all-MiniLM-L6-v2`

**Specifications:**
- Architecture: Transformer-based
- Dimensions: 384
- Max sequence length: 256 tokens
- Size: ~90MB
- Performance: ~10-30ms per encoding

**Why this model?**
- ✅ Lightweight and fast
- ✅ Good semantic understanding
- ✅ Multilingual support (English, Hindi, partial Tamil)
- ✅ Works well with agricultural terminology
- ✅ Runs on CPU efficiently

## 🗄️ Vector Store (FAISS)

**Technology:** Facebook AI Similarity Search

**Index Type:** IndexFlatL2 (Flat L2 distance)

**Why FAISS?**
- ✅ Extremely fast similarity search
- ✅ Memory efficient
- ✅ Supports millions of vectors
- ✅ No external dependencies
- ✅ Production-ready

**Storage:**
```
models/vector_store/
├── faiss.index       # Binary vector index
├── documents.pkl     # Original text documents
└── metadata.pkl      # Document metadata
```

## 🎯 Similarity Calculation

### L2 Distance to Similarity Score

```python
# FAISS returns L2 (Euclidean) distance
distance = 0.234  # Lower = more similar

# Convert to similarity score (0-1 range)
similarity = 1 / (1 + distance)

# Examples:
# distance = 0.1  → similarity = 0.909 (very similar)
# distance = 0.5  → similarity = 0.667 (moderately similar)
# distance = 1.0  → similarity = 0.500 (somewhat similar)
# distance = 2.0  → similarity = 0.333 (less similar)
```

### Threshold Logic

```python
SIMILARITY_THRESHOLD = 0.6

if similarity >= 0.8:
    # Excellent match - very confident
    return "high_confidence"
elif similarity >= 0.6:
    # Good match - acceptable confidence
    return "medium_confidence"
else:
    # Poor match - reject
    return "low_confidence"
```

## 📚 Knowledge Base Structure

### Document Format

Each document is a text chunk with metadata:

```python
{
    "content": "Disease: Tomato Early Blight affecting Tomato. Causes: ...",
    "metadata": {
        "type": "disease",
        "crop": "Tomato",
        "disease_name": "Tomato Early Blight"
    }
}
```

### Document Types

1. **Crops** (100 docs)
   ```
   "Crop: Rice (நெல், धान). Category: Cereal. Season: Kharif..."
   ```

2. **Diseases** (20 docs)
   ```
   "Disease: Brown Spot affecting Paddy. Causes: Bipolaris oryzae fungus..."
   ```

3. **Knowledge Base** (30 docs)
   ```
   "Fertilizer dosages depend on crop type. NPK ratio: 120:60:40 for paddy..."
   ```

4. **Schemes** (15 docs)
   ```
   "Scheme: PM-KISAN - Direct income support of ₹6,000/year..."
   ```

## 🔐 Error Handling

### Graceful Degradation

```python
try:
    # 1. Try RAG service
    result = rag_engine.search(query)
    if result.confidence >= 0.6:
        return result
except RAGError:
    pass

try:
    # 2. Fall back to Groq
    return call_groq(query)
except GroqError:
    pass

# 3. Final fallback to Gemini
return call_gemini(query)
```

### Error Types

```python
class RAGError(Exception):
    """Base RAG exception"""

class VectorStoreNotInitialized(RAGError):
    """Vector store not ready"""

class EmbeddingError(RAGError):
    """Embedding generation failed"""

class SearchError(RAGError):
    """Vector search failed"""
```

## 🚀 Performance Optimization

### 1. Caching Strategy

```python
# Cache embeddings for common queries
query_cache = LRUCache(maxsize=1000)

def get_embedding(text):
    if text in query_cache:
        return query_cache[text]
    
    embedding = model.encode(text)
    query_cache[text] = embedding
    return embedding
```

### 2. Batch Processing

```python
# Process multiple queries in batch
queries = ["Q1", "Q2", "Q3"]
embeddings = model.encode(queries, batch_size=32)
```

### 3. Index Optimization

```python
# For larger datasets, use IVF index
if num_documents > 10000:
    index = faiss.IndexIVFFlat(quantizer, dimension, nlist=100)
    index.train(embeddings)
```

## 📈 Scalability

### Current Limits

- Documents: 180 (can handle 100K+)
- Queries/sec: ~20-50 (single worker)
- Memory: ~500MB (with model loaded)
- Disk: ~200MB (models + vectors)

### Scaling Options

**Vertical Scaling:**
```bash
# More workers
uvicorn app:app --workers 4

# GPU acceleration
pip install faiss-gpu
```

**Horizontal Scaling:**
```nginx
# Load balancer config
upstream rag_service {
    server localhost:8000;
    server localhost:8001;
    server localhost:8002;
}
```

## 🔄 Update Workflow

### Adding New Knowledge

1. **Update Data Sources**
   ```bash
   # Edit knowledge files
   vim data/new_crops.json
   ```

2. **Rebuild Vector Store**
   ```bash
   curl -X POST http://localhost:8000/rag/rebuild
   ```

3. **Verify**
   ```bash
   curl http://localhost:8000/rag/stats
   ```

### Zero-Downtime Update

```python
# 1. Build new index in background
new_index = build_vector_store_v2()

# 2. Swap indices atomically
old_index = rag_engine.vector_store
rag_engine.vector_store = new_index

# 3. Clean up old index
del old_index
```

## 🔍 Monitoring & Observability

### Metrics to Track

```python
{
    "queries_per_second": 23.4,
    "avg_response_time_ms": 145,
    "avg_confidence_score": 0.78,
    "cache_hit_rate": 0.42,
    "error_rate": 0.002,
    "top_queries": [
        "late blight potato",
        "brown spot paddy",
        "pm-kisan scheme"
    ]
}
```

### Health Indicators

```python
# Healthy system
{
    "status": "healthy",
    "vector_store_ready": true,
    "documents_loaded": 180,
    "avg_search_time_ms": 15,
    "memory_usage_mb": 487
}
```

## 🛡️ Security Considerations

### Input Validation

```python
@app.post("/rag/ask")
async def ask_question(request: RAGRequest):
    # Length limits
    if len(request.question) > 500:
        raise HTTPException(400, "Question too long")
    
    # Sanitize input
    question = sanitize(request.question)
```

### Rate Limiting

```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/rag/ask")
@limiter.limit("60/minute")
async def ask_question(...):
    ...
```

### CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"]
)
```

## 🧪 Testing Strategy

### Unit Tests

```python
def test_embedding_generation():
    text = "How to grow rice?"
    embedding = rag_engine.embedding_model.encode(text)
    assert embedding.shape == (384,)
    assert isinstance(embedding, np.ndarray)

def test_vector_search():
    results = rag_engine.search("potato disease", top_k=5)
    assert len(results) <= 5
    assert all(r['similarity'] >= 0 for r in results)
```

### Integration Tests

```python
async def test_rag_endpoint():
    response = await client.post("/rag/ask", json={
        "question": "How to treat blight?",
        "language": "en"
    })
    assert response.status_code == 200
    assert "answer" in response.json()
    assert response.json()["confidence"] > 0
```

## 📖 API Contract

### Request Schema

```json
{
  "question": "string (3-500 chars, required)",
  "language": "string (en|ta|hi, optional, default: en)",
  "context": {
    "crop": "string (optional)",
    "district": "string (optional)"
  }
}
```

### Response Schema

```json
{
  "answer": "string (generated response)",
  "confidence": "float (0.0-1.0)",
  "source": "string (rag-vector-search)",
  "model": "string (rag-engine-v1)",
  "sources_used": [
    {
      "type": "string (crop|disease|knowledge|scheme)",
      "similarity": "float (0.0-1.0)"
    }
  ]
}
```

## 🎓 Best Practices

1. **Vector Store Maintenance**
   - Rebuild monthly with updated data
   - Monitor index size and performance
   - Archive old versions before rebuilding

2. **Embedding Quality**
   - Keep documents focused and concise
   - Include multilingual terms
   - Test with real farmer questions

3. **Performance Tuning**
   - Profile search operations
   - Adjust top_k based on use case
   - Monitor memory usage

4. **Error Handling**
   - Always have fallback mechanisms
   - Log errors comprehensively
   - Return graceful error messages

## 🔗 Dependencies

```
fastapi==0.104.1           # Web framework
sentence-transformers==2.2 # Embeddings
faiss-cpu==1.7.4          # Vector search
numpy==1.24.3             # Numerical computing
uvicorn==0.24.0           # ASGI server
pydantic==2.5.0           # Data validation
loguru==0.7.2             # Logging
```

## 📝 Conclusion

The RAG service architecture is designed for:
- **Speed**: 50-200ms responses
- **Accuracy**: High confidence answers from knowledge base
- **Scalability**: Can handle 100K+ documents
- **Reliability**: Graceful error handling and fallbacks
- **Maintainability**: Clear separation of concerns

Perfect for providing fast, accurate agricultural advisory to farmers!
