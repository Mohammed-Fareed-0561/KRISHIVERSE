"""FastAPI application for RAG-based agricultural advisory service."""
import sys
from pathlib import Path
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger

from config import settings
from rag_engine import rag_engine
from enhanced_rag_engine import enhanced_rag_engine


# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    level=settings.log_level,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>"
)
logger.add(
    settings.log_file,
    rotation="10 MB",
    retention="7 days",
    level=settings.log_level
)


# Request/Response Models
class RAGRequest(BaseModel):
    """Request model for RAG endpoint."""
    question: str = Field(..., min_length=3, max_length=500, description="User's question")
    language: Optional[str] = Field("en", description="Response language: en, ta, hi")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")


class RAGResponse(BaseModel):
    """Response model for RAG endpoint."""
    answer: str = Field(..., description="Generated answer")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    source: str = Field(..., description="Source of information")
    model: str = Field(..., description="Model used")
    sources_used: Optional[list] = Field(default_factory=list, description="List of sources consulted")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    vector_store_ready: bool
    documents_loaded: int
    embedding_model: str


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup
    logger.info("Starting RAG service...")
    try:
        # Initialize both engines (enhanced extends base)
        enhanced_rag_engine.initialize()
        logger.success("Enhanced RAG service ready with query processing pipeline")
    except Exception as e:
        logger.error(f"Failed to initialize RAG service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down RAG service...")


# Create FastAPI app
app = FastAPI(
    title="KrishiVerse RAG Service",
    description="Retrieval-Augmented Generation service for agricultural advisory",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc)}
    )


# Routes
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint."""
    return {
        "service": "KrishiVerse RAG Service",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy" if enhanced_rag_engine.is_initialized else "initializing",
        vector_store_ready=enhanced_rag_engine.is_initialized,
        documents_loaded=len(enhanced_rag_engine.documents),
        embedding_model=settings.embedding_model
    )


@app.post("/rag/ask", response_model=RAGResponse)
async def ask_question(request: RAGRequest):
    """
    Ask a question and get RAG-based answer with enhanced processing.
    
    This endpoint uses the production-grade pipeline:
    1. Language detection
    2. Spell correction
    3. Query expansion
    4. Intent detection
    5. Entity extraction
    6. Hybrid search (vector + metadata + keywords)
    7. Reranking
    8. Response generation
    """
    try:
        logger.info(f"Received question: {request.question[:100]}...")
        
        # Validate RAG engine is ready
        if not enhanced_rag_engine.is_initialized:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG engine is still initializing"
            )
        
        # Enhanced search with query processing
        search_response = enhanced_rag_engine.search_enhanced(
            query=request.question,
            top_k=settings.top_k_results,
            use_processing=True,
            use_metadata_filters=True
        )
        
        search_results = search_response['results']
        query_info = search_response['query_info']
        
        if not search_results:
            # No relevant documents found
            logger.warning(f"No relevant documents found for: {request.question}")
            fallback_answer = enhanced_rag_engine._get_fallback_response(request.language)
            
            return RAGResponse(
                answer=fallback_answer,
                confidence=0.0,
                source="fallback",
                model="enhanced-rag-v2",
                sources_used=[]
            )
        
        # Generate response from context
        response_data = enhanced_rag_engine.generate_response(
            query=request.question,
            context_docs=search_results,
            language=request.language
        )
        
        # Build enhanced response
        return RAGResponse(
            answer=response_data['answer'],
            confidence=query_info['confidence'] * response_data['confidence'],  # Combined confidence
            source=f"enhanced-rag (intent: {query_info['intent']})",
            model="enhanced-rag-v2",
            sources_used=response_data['sources']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process question: {str(e)}"
        )


@app.get("/rag/stats")
async def get_stats():
    """Get RAG engine statistics."""
    if not enhanced_rag_engine.is_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG engine not initialized"
        )
    
    # Count documents by type
    type_counts = {}
    for meta in enhanced_rag_engine.metadata:
        doc_type = meta.get('type', 'unknown')
        type_counts[doc_type] = type_counts.get(doc_type, 0) + 1
    
    return {
        "total_documents": len(enhanced_rag_engine.documents),
        "documents_by_type": type_counts,
        "embedding_model": settings.embedding_model,
        "vector_store_type": settings.vector_store_type,
        "similarity_threshold": settings.similarity_threshold,
        "features": {
            "query_processing": enhanced_rag_engine.use_query_processing,
            "hybrid_search": enhanced_rag_engine.use_hybrid_search,
            "reranking": enhanced_rag_engine.use_reranking
        }
    }


@app.post("/rag/rebuild")
async def rebuild_vector_store():
    """
    Rebuild the vector store from scratch.
    Use this when agricultural data is updated.
    """
    try:
        logger.info("Rebuilding vector store...")
        rag_engine._build_vector_store()
        logger.success("Vector store rebuilt successfully")
        
        return {
            "status": "success",
            "message": "Vector store rebuilt",
            "documents_loaded": len(rag_engine.documents)
        }
    except Exception as e:
        logger.error(f"Failed to rebuild vector store: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rebuild failed: {str(e)}"
        )


# Run with: uvicorn app:app --host 0.0.0.0 --port 8000 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        reload=(settings.env == "development"),
        log_level=settings.log_level.lower()
    )
