"""Configuration management for RAG service."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    """Application settings."""
    
    # Server
    port: int = 8000
    host: str = "0.0.0.0"
    env: str = "production"
    
    # Vector Store
    vector_store_type: str = "faiss"  # faiss or chromadb
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    vector_store_path: Path = Path("./models/vector_store")
    
    # RAG Settings
    top_k_results: int = 5
    # Cosine-similarity threshold for MiniLM embeddings. 0.6 was too strict
    # (filtered out correct matches like "urea dose for paddy" at 0.59).
    similarity_threshold: float = 0.5
    max_context_length: int = 2000
    
    # LLM Fallback (optional)
    groq_api_key: str = ""
    openai_api_key: str = ""
    
    # Logging
    log_level: str = "INFO"
    log_file: Path = Path("./logs/rag_service.log")
    
    # CORS
    allowed_origins: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3001"
    ]
    
    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse allowed origins from comma-separated string or list."""
        if isinstance(v, str):
            # Split comma-separated string
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Create necessary directories
settings.vector_store_path.parent.mkdir(parents=True, exist_ok=True)
settings.log_file.parent.mkdir(parents=True, exist_ok=True)
