# Advanced Offline Architecture Design: Krishiverse 2.0

This document outlines the blueprint for transitioning Krishiverse from a "cloud-first with caching" app to a "truly offline-first" rural platform.

## 1. IndexedDB Architecture

| Question | Recommendation |
| :--- | :--- |
| **1. Best Schema** | **Object Stores**: `crops`, `pests`, `schemes`, `weather_history`, `market_history`, `reports_sync_queue`. |
| **2. Best Libraries** | **Dexie.js**. It provides a clean, promise-based API and the best React hook integration via `dexie-react-hooks`. |
| **3. Large Datasets** | Use **Streaming Imports**. Chunk your JSON data and insert using `bulkAdd` in Dexie to avoid UI blocking. |
| **4. Offline Embeddings** | Store as `Float32Array` in a dedicated `embeddings` store, indexed by the ID of the related record (e.g., `cropId`). |
| **5. Weather Caching** | Store hourly forecasts for the next 48h in a `weather` store. Use a `last_updated` index to purge old data. |
| **6. Govt Schemes** | Store full MD text in IndexedDB. Partial updates from server via `version` timestamp. |
| **7. Disease Images** | Store as **Blobs** or **Encoded strings** in a `media` store. IndexedDB handles binary data much better than localStorage. |
| **8. Compression** | Use **Lz-string** for text or **Brotli** (if API supports) before storing. For images, resize to max 800px on browser before storage. |
| **9. Sync Strategy** | **Last-Write-Wins** for settings; **Append-Only** for reports. Use Background Sync API to push `reports_sync_queue` when online. |
| **10. Migration** | On first load of v2.0, read `localStorage`, write to IndexedDB, then `localStorage.clear()` for those keys. |
| **11. Est. Storage** | **~50MB - 200MB**. Well within the browser limits (usually % of disk, often 2GB+). |
| **12. Perf Optimization** | Use `read-only` transactions for lookups. Batch all writes into single `read-write` transactions. |
| **13. Indexing Strategy** | Primary Keys (IDs), then secondary indexes on `name`, `category`, and `search_keywords` (multi-entry). |
| **14. Query Opt.** | Avoid `filter()`. Use `where('key').equals(val)` to leverage indices. Use `limit()` for pagination. |
| **15. Dexie.js?** | **YES.** Essential for Krishiverse. It simplifies schemas and handles connection management/upgrades robustly. |

## 2. Offline Semantic Search System (Chatbot)

| Question | Recommendation |
| :--- | :--- |
| **1. Lightweight Models** | **Xenova/all-MiniLM-L6-v2**. Robust, small (~23MB), and highly accurate for sentence-level similarity. |
| **2. Transformers.js?** | **YES.** Use the ONNX Runtime-powered `transformers.js` for in-browser inference. |
| **3. MiniLM?** | **Yes.** It strikes the best balance between embedding quality and browser performance/RAM. |
| **4. Vector DB** | **Voy** (WASM-based) or **Orama**. Both are purpose-built for client-side vector search. |
| **5. Best DB Choice** | **Voy**. It is extremely lightweight and integrates seamlessly with any JS engine. |
| **6. Architecture** | **Embed-Once-Client-Side**: Download model -> Embed local KB -> Store embeddings in IndexedDB -> Query local Vector DB. |
| **7. Est. Size (10k)** | **~15MB - 25MB** for 10,000 vectors (depending on dimension size, usually 384 for MiniLM). |
| **8. RAM Usage** | **~100MB - 150MB** peak during model loading/search. Suitable for 4GB+ RAM phones. |
| **9. Mobile Perf** | Search latency: **<100ms** after index is built. Initial embedding of 10k records may take **3-5 minutes** (run in Worker). |
| **10. Opt. Techniques** | Use **Quantized models** (uint8/int8) to reduce RAM. Use **Web Workers** to keep UI at 60fps. |
| **11. Fully Offline?** | **YES.** Once the model is cached by Service Worker, search is 100% locally resident. |
| **12. Retrieval Pipe** | **Hybrid**: 1. Exact Match (Keyword) -> 2. Semantic Search (Vector) -> 3. Fallback (Static Help). |
| **13. Accuracy** | Use **Domain-Specific Fine-tuning** (Agri-vocabulary) in the prompt construction for the model if possible. |
| **14. Hallucinations** | **RAG Strategy**: Only allow the chatbot to answer using retrieved local context. Disallow "creative" generation. |
| **15. Hybrid Strategy** | **BM25 + Semantic**. Combine traditional keyword weighting with vector similarity for best results. |

## 3. Offline Crop Disease Diagnosis

| Question | Recommendation |
| :--- | :--- |
| **1. Lightweight Model** | **MobileNetV3-Small** or **MobileNetV2**. Native support in TFJS and excellent for classifying plants. |
| **2. MobileNetV3?** | **Yes.** Highly recommended as it was designed specifically for mobile CPU/GPU power. |
| **3. EfficientNet Lite?** | **Excellent alternative.** Often more accurate but slightly larger (~10-15MB). |
| **4. TFJS Architecture** | **Layered**: Camera Hook -> Image Preprocessing (Crop/Resize) -> Model Prediction -> Confidence Score -> UI. |
| **5. Model Size** | **~5MB to 8MB** (Quantized). Extremely portable for rural 3G. |
| **6. Inference Speed** | **50ms - 200ms** on most modern Android devices using WebGL/WebGPU. |
| **7. Accuracy** | Target **85% - 92%** for top-3 predictions. High enough for actionable early warnings. |
| **8. Datasets** | **PlantVillage** (classic) or **Agri-Dataset** (HuggingFace). Need custom pruning for Indian crops. |
| **9. Preprocessing** | Resize to 224x224, Normalize pixels [0, 1] or [-1, 1], and Center Crop. Done via `tf.browser.fromPixels`. |
| **10. Quantization** | **Int8 Quantization**. Reduces size by 4x with <1% accuracy loss. |
| **11. WebGPU/WASM?** | **Use WASM as fallback, WebGL as default.** WebGPU for ultra-modern flagships if available. |
| **12. Fallback** | If low-end, **Upload-Later Strategy**: Capture photo, save to IndexedDB, upload when 4G is detected. |
| **13. Battery Opt.** | Dispose of all Tensors immediately using `tf.tidy()`. Shut down camera stream when not in use. |
| **14. Confidence Score** | Show diagnostic only if `confidence > 0.7`. Otherwise, suggest "Retake photo" or "Consult Expert". |
| **15. Hybrid Arch** | **Offline Classifier** (MobileNet) identifies the crop part. **Online Vision** (Gemini) does the deep forensic audit. |
