# 🚨 IMMEDIATE ACTIONS REQUIRED

**Status:** Phase 1 RAG implementation 85% complete  
**Priority:** Complete testing and data migration (4-5 hours remaining)  
**Last Updated:** 2026-07-30

---

## 🔴 ISSUE 1: Backend Weather API Not Loading

**Problem:**  
The Node.js backend is showing repeated errors:
```
error: OPENWEATHER_API_KEY not configured — add it to your .env
```

**Root Cause:**  
The API key exists in `backend/.env` but the running server hasn't reloaded environment variables.

**Solution:**
```bash
# 1. Stop the current backend process (Ctrl+C in the terminal running npm start)

# 2. Navigate to backend directory
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend"

# 3. Verify .env has the key
type .env | findstr OPENWEATHER_API_KEY
# Should show: OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY

# 4. Restart backend
npm start

# 5. Verify no more errors (should start clean without OPENWEATHER errors)
```

**Verification:**
- Backend starts without errors
- Weather endpoints work: http://localhost:3001/api/v1/weather/current?lat=11.0168&lon=76.9558

---

## ✅ ACTION 1: Test Enhanced RAG Service (30 minutes)

**What:** Verify the newly created query processing and enhanced search pipeline works correctly.

**Commands:**

### **Step 1.1: Start RAG Service**
```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend\rag_service"

# Start the service
./venv/Scripts/python.exe app.py

# Expected output:
# ✅ "Enhanced RAG service ready with query processing pipeline"
# ✅ "Vector store loaded with X documents"
```

**Keep this terminal running!** The service must stay active for tests.

---

### **Step 1.2: Run Test Suite (New Terminal)**

Open a **second terminal** and run:

```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend\rag_service"

# Run the comprehensive test
./venv/Scripts/python.exe test_enhanced.py
```

**Expected Results:**
```
✅ TEST 1: Query Processing Pipeline
   - Language detection working (Tamil, English, Tanglish)
   - Spell correction applied ("yelloe" → "yellow")
   - Intent detection accurate (disease_diagnosis, fertilizer_recommendation, etc.)
   - Entity extraction finds crops, diseases, symptoms

✅ TEST 2: Enhanced Search
   - Results returned for test queries
   - Confidence scores calculated
   - Metadata present in results

✅ TEST 3: Metadata Filtering
   - Rice queries return rice-specific results
   - Other crops filtered out appropriately
```

**If tests fail:**
- Check logs: `tail -50 logs/rag_service.log`
- Verify all Python dependencies installed: `pip install -r requirements.txt`
- Check if vector store exists: `ls models/vector_store/`

---

### **Step 1.3: Test via API (PowerShell)**

**Test 1: Basic Query**
```powershell
$body = @{question="my rice crops have yellow spots"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
```

**Expected Response:**
```json
{
  "answer": "Yellow spots on rice indicate...",
  "confidence": 0.85,
  "source": "enhanced-rag (intent: disease_diagnosis)",
  "model": "enhanced-rag-v2",
  "sources_used": [...]
}
```

**Test 2: Spell Correction**
```powershell
$body = @{question="yelloe spots on tamato"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
```

**Expected:**
- Query auto-corrected to "yellow spots on tomato"
- Intent detected as "disease_diagnosis"

**Test 3: Tamil Language**
```powershell
$body = @{question="என் நெல் பயிரில் மஞ்சள் புள்ளிகள்"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
```

**Expected:**
- Language detected: "tamil"
- Response in Tamil (if Tamil data available)

**Test 4: Intent Detection**
```powershell
$body = @{question="what fertilizer for wheat flowering stage"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
```

**Expected:**
- Intent: "fertilizer_recommendation"
- Entity extraction: crops=["wheat"], growth_stages=["flowering"]

---

## ✅ ACTION 2: Migrate Disease Data (2-3 hours)

**What:** Convert existing 10 diseases from old format to new production-grade metadata schema.

**Why:** The new schema enables:
- Better search accuracy (metadata filtering)
- Confidence scoring
- Source attribution
- Multilingual support
- Structured treatments

### **Step 2.1: Run Migration Script**
```bash
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend\rag_service"

# Run the migration
./venv/Scripts/python.exe migrate_disease_data.py
```

**Expected Output:**
```
🔄 Starting migration from all_crop_diseases.json
📚 Found 10 diseases to migrate
  ✅ Migrated: Rice Blast (Blast Disease)
  ✅ Migrated: Bacterial Leaf Blight
  ... (8 more)

✅ Migration complete!
   Saved to: data/all_crop_diseases_v2.json
   Successful: 10/10
   Crops: rice, tomato, wheat, ...
```

**Files Created:**
- `data/all_crop_diseases_v2.json` - Migrated data with full metadata
- `data/migration_stats.json` - Migration statistics
- `data/all_crop_diseases_backup.json` - Backup of original

---

### **Step 2.2: Update RAG Configuration**

Edit `backend/rag_service/config.py`:

**Find this line (around line 35):**
```python
crop_diseases_file: Path = base_dir / "data" / "all_crop_diseases.json"
```

**Change to:**
```python
crop_diseases_file: Path = base_dir / "data" / "all_crop_diseases_v2.json"
```

**Save the file.**

---

### **Step 2.3: Rebuild Vector Store**

**Option A: Via API (Recommended)**
```powershell
# Rebuild the vector store with new metadata-enriched data
Invoke-RestMethod -Uri http://localhost:8000/rag/rebuild -Method POST
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Vector store rebuilt successfully",
  "documents_loaded": 10,
  "index_size": 10
}
```

**Option B: Restart RAG Service**
```bash
# Stop the service (Ctrl+C)
# Restart it
./venv/Scripts/python.exe app.py

# The service will auto-load the new v2 data
```

**Verification:**
```powershell
# Check stats
Invoke-RestMethod -Uri http://localhost:8000/rag/stats

# Expected:
# {
#   "documents": 10,
#   "vectors": 10,
#   "features": {
#     "query_processing": true,
#     "metadata_filtering": true,
#     "reranking": true
#   }
# }
```

---

### **Step 2.4: Verify Metadata Filtering Works**

**Test 1: Crop-Specific Query**
```powershell
$body = @{question="rice bacterial leaf blight symptoms"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
```

**Check:**
- Results should be rice-specific
- Other crops (tomato, wheat) not in top results
- Entity extraction shows: `crops: ["rice"]`

**Test 2: Disease-Specific Query**
```powershell
$body = @{question="how to treat blast disease organically"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
```

**Check:**
- Results prioritize blast disease documents
- Organic remedies highlighted
- Source shows: `intent: disease_diagnosis`

---

## ✅ ACTION 3: Performance Benchmark (1 hour)

**What:** Verify the system meets <2s first response requirement.

### **Step 3.1: Response Time Test**
```powershell
# Test 10 queries and measure time
$queries = @(
    "rice blast disease",
    "tomato late blight",
    "wheat rust symptoms",
    "organic pest control",
    "fertilizer for vegetative stage"
)

foreach ($q in $queries) {
    $start = Get-Date
    $body = @{question=$q} | ConvertTo-Json
    $response = Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
    $elapsed = (Get-Date) - $start
    
    Write-Host "$q : $($elapsed.TotalSeconds) seconds" -ForegroundColor $(if ($elapsed.TotalSeconds -lt 2) {"Green"} else {"Red"})
}
```

**Target:** All queries < 2 seconds

**If slower:**
- Check: Is the RAG service running locally (not cloud)?
- Check: Vector store loaded (not rebuilding)?
- Optimize: Reduce `top_k_results` in config (currently 5)
- Profile: Add timing logs in `enhanced_rag_engine.py`

---

### **Step 3.2: Concurrent Request Test**
```powershell
# Test 3 simultaneous queries
$jobs = @()
1..3 | ForEach-Object {
    $jobs += Start-Job -ScriptBlock {
        $body = @{question="rice disease"} | ConvertTo-Json
        Invoke-RestMethod -Uri http://localhost:8000/rag/ask -Method POST -Body $body -ContentType "application/json"
    }
}

# Wait for all to complete
$jobs | Wait-Job | Receive-Job
```

**Check:**
- All 3 requests succeed
- No timeout errors
- Average time < 3 seconds

---

## 📊 Success Checklist

Mark completed tasks:

### **Testing (Action 1)**
- [ ] RAG service starts without errors
- [ ] `test_enhanced.py` runs successfully
- [ ] Query processing detects language correctly
- [ ] Spell correction works (yelloe → yellow)
- [ ] Intent detection accurate (5/5 test queries)
- [ ] Entity extraction finds crops and diseases
- [ ] API returns `model="enhanced-rag-v2"`

### **Data Migration (Action 2)**
- [ ] `migrate_disease_data.py` runs successfully
- [ ] `all_crop_diseases_v2.json` created (10 diseases)
- [ ] `config.py` updated to use v2 file
- [ ] Vector store rebuilt (10 documents loaded)
- [ ] Metadata filtering works (rice queries return rice results)
- [ ] Confidence scores present in responses

### **Performance (Action 3)**
- [ ] Single query response < 2 seconds
- [ ] Average of 10 queries < 1.5 seconds
- [ ] Concurrent requests handled correctly
- [ ] No memory leaks (service stable after 50+ requests)

---

## 🐛 Troubleshooting

### **Problem: RAG service won't start**
**Symptoms:**
```
ModuleNotFoundError: No module named 'sentence_transformers'
```

**Solution:**
```bash
cd backend/rag_service
./venv/Scripts/pip.exe install -r requirements.txt
```

---

### **Problem: Migration script fails**
**Symptoms:**
```
KeyError: 'symptoms'
```

**Solution:**
Check if `all_crop_diseases.json` has the expected structure. Each disease should have:
- `id`, `name`, `crop`, `symptoms`, `organicTreatment`, `chemicalTreatment`

If missing, the script will use default empty lists.

---

### **Problem: No results from search**
**Symptoms:**
```json
{
  "answer": "I don't have enough information...",
  "confidence": 0.0,
  "source": "fallback"
}
```

**Diagnosis:**
```powershell
# Check if documents loaded
Invoke-RestMethod -Uri http://localhost:8000/rag/stats

# If documents=0, rebuild:
Invoke-RestMethod -Uri http://localhost:8000/rag/rebuild -Method POST
```

---

### **Problem: Metadata filtering not working**
**Symptoms:**
Query "rice disease" returns tomato results.

**Diagnosis:**
1. Check if v2 data loaded: `Invoke-RestMethod http://localhost:8000/rag/stats`
2. Verify entity extraction: Add logging in `query_processor.py`:
   ```python
   logger.info(f"Extracted entities: {entities}")
   ```
3. Check filter logic in `enhanced_rag_engine.py` → `_filter_by_metadata()`

---

## 📈 Expected Timeline

| Task | Estimated Time | Priority |
|------|----------------|----------|
| Fix backend weather API | 5 minutes | 🔴 Critical |
| Test enhanced RAG (1.1-1.3) | 30 minutes | 🔴 Critical |
| Run migration (2.1) | 10 minutes | 🔴 Critical |
| Update config (2.2) | 2 minutes | 🔴 Critical |
| Rebuild vector store (2.3) | 5 minutes | 🔴 Critical |
| Verify metadata filtering (2.4) | 20 minutes | 🟡 High |
| Performance benchmarks (3.1-3.2) | 30 minutes | 🟡 High |
| **TOTAL** | **~2 hours** | |

**After completion:** Update `PHASE1_STATUS.md` to mark Phase 1 as 100% complete.

---

## 🚀 Next Phase (Week 2 - After Actions Complete)

Once all immediate actions are done, proceed to:

1. **Hybrid Search Implementation**
   - Add BM25 keyword search
   - Implement Reciprocal Rank Fusion
   - Combine vector + keyword scores

2. **Tamil Language Enhancement**
   - Add Tamil-specific spell correction
   - Tamil-English translation tables
   - Tamil crop/disease name mapping

3. **Data Expansion**
   - Source from TNAU Agritech Portal
   - Target: 50 diseases by end of Week 2
   - Structure with `create_disease_metadata()` helper

4. **Unit Testing**
   - Write pytest tests for query processor
   - Test enhanced search logic
   - Coverage target: 80%

---

## 📞 Quick Reference Commands

**Start all services:**
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: RAG Service
cd backend/rag_service && ./venv/Scripts/python.exe app.py

# Terminal 3: Frontend
cd krishiverse && npm run dev
```

**Check service health:**
```powershell
# Backend
Invoke-RestMethod http://localhost:3001/api/v1/health

# RAG Service
Invoke-RestMethod http://localhost:8000/health

# Frontend
# Open browser: http://localhost:5173
```

**View logs:**
```bash
# RAG Service logs
tail -f backend/rag_service/logs/rag_service.log

# Backend logs
# (Watch the terminal where npm start is running)
```

---

**Next Steps After Immediate Actions:**
1. Mark all checkboxes above ✅
2. Update `PHASE1_STATUS.md` → "🟢 100% Complete"
3. Review `backend/rag_service/data/migration_stats.json`
4. Plan Week 2 tasks (Hybrid Search)
5. Begin sourcing additional disease data from TNAU

**Questions or Issues?**  
Review:
- `PHASE1_STATUS.md` - Detailed implementation docs
- `backend/rag_service/logs/rag_service.log` - Error logs
- This file - Troubleshooting section

---

**Last Updated:** 2026-07-30  
**Estimated Completion:** 2 hours from now  
**Next Milestone:** Phase 1 Complete → Begin Week 2 (Hybrid Search)
