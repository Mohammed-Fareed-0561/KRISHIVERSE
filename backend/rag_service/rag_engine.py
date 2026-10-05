"""RAG Engine for agricultural advisory using vector similarity search."""
import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from loguru import logger

from sentence_transformers import SentenceTransformer
import faiss

from config import settings


# Paths are resolved relative to this script, not the CWD
BASE_DIR = Path(__file__).resolve().parent                      # backend/rag_service
FRONTEND_DIR = BASE_DIR.parent.parent / "krishiverse"           # <repo>/krishiverse


class RAGEngine:
    """Retrieval-Augmented Generation engine for agricultural knowledge."""
    
    def __init__(self):
        """Initialize the RAG engine with embeddings and vector store."""
        self.embedding_model = None
        self.vector_store = None
        self.documents = []
        self.metadata = []
        self.is_initialized = False
        
    def initialize(self):
        """Load or create the vector store and embedding model."""
        try:
            logger.info("Initializing RAG engine...")
            
            # Load embedding model
            logger.info(f"Loading embedding model: {settings.embedding_model}")
            self.embedding_model = SentenceTransformer(settings.embedding_model)
            
            # Try to load existing vector store
            if self._load_vector_store():
                logger.info("Loaded existing vector store")
            else:
                logger.info("Building new vector store from agricultural data")
                self._build_vector_store()
            
            self.is_initialized = True
            logger.success("RAG engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG engine: {e}")
            raise
    
    def _load_vector_store(self) -> bool:
        """Load existing vector store from disk."""
        try:
            index_path = settings.vector_store_path / "faiss.index"
            docs_path = settings.vector_store_path / "documents.pkl"
            meta_path = settings.vector_store_path / "metadata.pkl"
            
            if not (index_path.exists() and docs_path.exists() and meta_path.exists()):
                return False
            
            # Load FAISS index
            self.vector_store = faiss.read_index(str(index_path))
            
            # Load documents and metadata
            with open(docs_path, 'rb') as f:
                self.documents = pickle.load(f)
            
            with open(meta_path, 'rb') as f:
                self.metadata = pickle.load(f)
            
            logger.info(f"Loaded {len(self.documents)} documents from vector store")
            return True
            
        except Exception as e:
            logger.warning(f"Could not load existing vector store: {e}")
            return False
    
    def _save_vector_store(self):
        """Save vector store to disk."""
        try:
            settings.vector_store_path.mkdir(parents=True, exist_ok=True)
            
            index_path = settings.vector_store_path / "faiss.index"
            docs_path = settings.vector_store_path / "documents.pkl"
            meta_path = settings.vector_store_path / "metadata.pkl"
            
            # Save FAISS index
            faiss.write_index(self.vector_store, str(index_path))
            
            # Save documents and metadata
            with open(docs_path, 'wb') as f:
                pickle.dump(self.documents, f)
            
            with open(meta_path, 'wb') as f:
                pickle.dump(self.metadata, f)
            
            logger.info(f"Saved vector store with {len(self.documents)} documents")
            
        except Exception as e:
            logger.error(f"Failed to save vector store: {e}")
            raise
    
    def _build_vector_store(self):
        """Build vector store from agricultural knowledge base."""
        try:
            # Load agricultural data
            all_docs = []
            all_metadata = []
            
            # Load crops data
            crops_data = self._load_crops_data()
            for doc, meta in crops_data:
                all_docs.append(doc)
                all_metadata.append(meta)
            
            # Load disease data
            disease_data = self._load_disease_data()
            for doc, meta in disease_data:
                all_docs.append(doc)
                all_metadata.append(meta)
            
            # Load irrigation data
            irrigation_data = self._load_irrigation_data()
            for doc, meta in irrigation_data:
                all_docs.append(doc)
                all_metadata.append(meta)
            
            # Load chatbot knowledge base
            kb_data = self._load_kb_data()
            for doc, meta in kb_data:
                all_docs.append(doc)
                all_metadata.append(meta)
            
            # Load schemes data
            schemes_data = self._load_schemes_data()
            for doc, meta in schemes_data:
                all_docs.append(doc)
                all_metadata.append(meta)
            
            logger.info(f"Loaded {len(all_docs)} documents from knowledge base")
            
            # Generate embeddings
            logger.info("Generating embeddings...")
            embeddings = self.embedding_model.encode(
                all_docs,
                show_progress_bar=True,
                convert_to_numpy=True
            )

            # Normalize embeddings and use cosine similarity (IndexFlatIP)
            # This yields similarity scores in [0, 1] that compare well with the threshold
            embeddings = embeddings.astype('float32')
            faiss.normalize_L2(embeddings)

            # Create FAISS index
            dimension = embeddings.shape[1]
            self.vector_store = faiss.IndexFlatIP(dimension)
            self.vector_store.add(embeddings)
            
            self.documents = all_docs
            self.metadata = all_metadata
            
            # Save for future use
            self._save_vector_store()
            
            logger.success(f"Built vector store with {len(all_docs)} documents")
            
        except Exception as e:
            logger.error(f"Failed to build vector store: {e}")
            raise
    
    def _load_crops_data(self) -> List[Tuple[str, Dict]]:
        """Load and format crops data."""
        docs = []
        data_path = FRONTEND_DIR / "src/data/seed/massive_dataset.json"
        
        try:
            if data_path.exists():
                with open(data_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Extract crop information
                for crop in data.get('crops', [])[:100]:  # Limit for now
                    doc = f"Crop: {crop['name']} ({crop.get('name_ta', '')}, {crop.get('name_hi', '')}). "
                    doc += f"Category: {crop.get('category', 'Unknown')}. "
                    doc += f"Season: {crop.get('season', 'Unknown')}. "
                    doc += f"Description: {crop.get('description', '')}."
                    
                    docs.append((doc, {
                        'type': 'crop',
                        'crop_id': crop['id'],
                        'crop_name': crop['name'],
                        'category': crop.get('category'),
                        'season': crop.get('season')
                    }))
        except Exception as e:
            logger.warning(f"Could not load crops data: {e}")
        
        return docs
    
    def _load_disease_data(self) -> List[Tuple[str, Dict]]:
        """Load and format disease data from local dataset files."""
        docs = []
        data_dir = BASE_DIR / "data"

        # 1) Migrated schema dataset (all_crop_diseases_v2.json)
        v2_path = data_dir / "all_crop_diseases_v2.json"
        try:
            if v2_path.exists():
                with open(v2_path, 'r', encoding='utf-8') as f:
                    diseases = json.load(f)
                for disease in diseases:
                    text = disease.get("text") or (
                        f"Disease: {disease.get('disease_name', disease.get('name', 'Unknown'))} "
                        f"affecting {disease.get('crop_name', 'Unknown')}. "
                        f"Symptoms: {', '.join(disease.get('symptoms', []))}. "
                        f"Organic treatment: {', '.join(disease.get('organic_remedies', []))}. "
                        f"Chemical treatment: {', '.join(disease.get('chemical_remedies', []))}."
                    )
                    docs.append((text, {
                        'type': 'disease',
                        'disease_name': disease.get('disease_name', disease.get('name')),
                        'crop': disease.get('crop_name'),
                        'severity': disease.get('severity'),
                        'pathogen': disease.get('pathogen'),
                        'confidence_score': disease.get('confidence', 0.9),
                    }))
                logger.info(f"Loaded {len(diseases)} diseases from {v2_path.name}")
        except Exception as e:
            logger.warning(f"Could not load migrated disease data: {e}")

        # 2) Comprehensive disease dataset
        comp_path = data_dir / "diseases_comprehensive.json"
        try:
            if comp_path.exists():
                with open(comp_path, 'r', encoding='utf-8') as f:
                    diseases = json.load(f)
                for disease in diseases:
                    crops = ', '.join(disease.get('crops', []))
                    name = disease.get('name', 'Unknown')
                    text = f"Disease: {name} affecting {crops}. "
                    text += f"Pathogen: {disease.get('pathogen', 'Unknown')}. "
                    text += f"Symptoms: {', '.join(disease.get('symptoms', []))}. "
                    text += f"Organic treatment: {', '.join(disease.get('organicTreatments', []))}. "
                    text += f"Chemical treatment: {', '.join(disease.get('chemicalTreatments', []))}. "
                    text += f"Prevention: {', '.join(disease.get('prevention', []))}. "
                    text += f"Spread rate: {disease.get('spreadRate', 'Not specified')}. "
                    text += f"Economic impact: {disease.get('economicImpact', 'Not specified')}."
                    docs.append((text, {
                        'type': 'disease',
                        'disease_name': name,
                        'crop': crops,
                        'severity': disease.get('severity'),
                        'pathogen': disease.get('pathogen'),
                        'confidence_score': 0.9,
                    }))
                logger.info(f"Loaded {len(diseases)} diseases from {comp_path.name}")
        except Exception as e:
            logger.warning(f"Could not load comprehensive disease data: {e}")

        return docs

    def _load_irrigation_data(self) -> List[Tuple[str, Dict]]:
        """Load and format irrigation guide data."""
        docs = []
        path = BASE_DIR / "data" / "irrigation_guide.json"
        try:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
                for entry in entries:
                    crop = entry.get('crop', 'unknown')
                    methods = entry.get('methods', {})
                    method_text = '; '.join(
                        f"{name}: {details.get('description', '')} ({details.get('waterUse', '')})"
                        for name, details in methods.items()
                    )
                    text = f"Irrigation guide for {crop}. "
                    text += f"Water requirement: {entry.get('waterRequirement', 'Not specified')}. "
                    text += f"Critical stages: {', '.join(entry.get('criticalStages', []))}. "
                    text += f"Methods: {method_text}. "
                    text += f"Water stress symptoms: {', '.join(entry.get('waterStressSymptoms', []))}. "
                    text += f"Tips: {'; '.join(entry.get('tips', []))}"
                    docs.append((text, {
                        'type': 'practice',
                        'crop': crop,
                        'topic': 'irrigation',
                        'confidence_score': 0.9,
                    }))
                logger.info(f"Loaded {len(entries)} irrigation guides from {path.name}")
        except Exception as e:
            logger.warning(f"Could not load irrigation guide data: {e}")
        return docs
    
    def _load_kb_data(self) -> List[Tuple[str, Dict]]:
        """Load chatbot knowledge base data."""
        docs = []
        
        # Hardcoded knowledge base (from chatbotKB.js)
        kb_items = [
            {
                "intent": "fertilizer_general",
                "answer": "Fertilizer dosages depend on crop type and soil health. A balanced NPK ratio is recommended. Perform soil tests regularly."
            },
            {
                "intent": "urea_dose",
                "answer": "Urea provides Nitrogen for leafy growth. Standard dose: 50-150 kg/acre depending on crop. Apply in split doses."
            },
            {
                "intent": "irrigation",
                "answer": "Efficient irrigation methods like drip or sprinkler save water. Irrigate based on critical growth stages. Avoid water stagnation."
            },
            {
                "intent": "paddy",
                "answer": "For paddy: maintain 2-5cm standing water during vegetative stage. NPK ratio: 120:60:40 kg/ha. Watch for stem borer and blast disease."
            },
            {
                "intent": "wheat",
                "answer": "Wheat requires 4-6 irrigations at CRI, jointing, and flowering. NPK: 120:60:40 kg/ha."
            },
            {
                "intent": "organic_farming",
                "answer": "Use Farm Yard Manure (FYM), vermicompost, green manure. Apply 5-10 tons FYM/acre for better soil structure."
            },
            {
                "intent": "pest_general",
                "answer": "Use Integrated Pest Management (IPM). Neem oil (10000 ppm) at 2ml/L water as preventive spray."
            },
            {
                "intent": "drought",
                "answer": "During drought: mulch fields, use anti-transpirants, apply potassium for drought tolerance."
            }
        ]
        
        for item in kb_items:
            docs.append((item['answer'], {
                'type': 'knowledge',
                'intent': item['intent']
            }))
        
        return docs
    
    def _load_schemes_data(self) -> List[Tuple[str, Dict]]:
        """Load government schemes data."""
        docs = []
        data_path = FRONTEND_DIR / "public/data/schemes.json"
        
        try:
            if data_path.exists():
                with open(data_path, 'r', encoding='utf-8') as f:
                    schemes = json.load(f)
                
                for scheme in schemes:
                    doc = f"Scheme: {scheme['name']} - {scheme['fullName']}. "
                    doc += f"Category: {scheme['category']}. "
                    doc += f"Summary: {scheme['summary']} "
                    doc += f"Benefits: {', '.join(scheme.get('benefits', []))}. "
                    doc += f"Eligibility: {scheme.get('eligibility', '')} "
                    doc += f"How to apply: {scheme.get('howToApply', '')}"
                    
                    docs.append((doc, {
                        'type': 'scheme',
                        'scheme_id': scheme['id'],
                        'scheme_name': scheme['name'],
                        'category': scheme['category']
                    }))
        except Exception as e:
            logger.warning(f"Could not load schemes data: {e}")
        
        return docs
    
    def search(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        """Search for relevant documents using vector similarity."""
        if not self.is_initialized:
            raise RuntimeError("RAG engine not initialized")
        
        top_k = top_k or settings.top_k_results
        
        try:
            # Generate query embedding and normalize for cosine similarity
            query_embedding = self.embedding_model.encode(
                [query],
                convert_to_numpy=True
            ).astype('float32')
            faiss.normalize_L2(query_embedding)
            
            # Search vector store
            similarities, indices = self.vector_store.search(
                query_embedding,
                top_k
            )
            
            # Format results
            results = []
            for i, (sim, idx) in enumerate(zip(similarities[0], indices[0])):
                if idx < len(self.documents):
                    # IndexFlatIP returns cosine similarity directly for normalized vectors
                    similarity = float(sim)
                    
                    if similarity >= settings.similarity_threshold:
                        results.append({
                            'rank': i + 1,
                            'content': self.documents[idx],
                            'metadata': self.metadata[idx],
                            'similarity': similarity,
                            'distance': 1 - similarity
                        })
            
            logger.info(f"Found {len(results)} relevant documents for query: {query[:50]}...")
            return results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise
    
    def generate_response(
        self,
        query: str,
        context_docs: List[Dict[str, Any]],
        language: str = "en"
    ) -> Dict[str, Any]:
        """Generate a response using retrieved context."""
        try:
            # Build context from top documents
            context_parts = []
            sources = []
            
            for doc in context_docs[:3]:  # Use top 3 most relevant
                context_parts.append(doc['content'])
                sources.append({
                    'type': doc['metadata'].get('type', 'unknown'),
                    'similarity': doc['similarity']
                })
            
            context = "\n\n".join(context_parts)
            
            # Truncate context if too long
            if len(context) > settings.max_context_length:
                context = context[:settings.max_context_length] + "..."
            
            # Build farmer-friendly response
            response = self._build_farmer_response(query, context, language)
            
            return {
                'answer': response,
                'confidence': context_docs[0]['similarity'] if context_docs else 0.0,
                'sources': sources,
                'context_used': len(context_docs)
            }
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            raise
    
    def _build_farmer_response(self, query: str, context: str, language: str) -> str:
        """Build a farmer-friendly response from context."""
        # Simple template-based response (can be enhanced with LLM)
        if not context:
            return self._get_fallback_response(language)
        
        # Extract key information from context
        response_parts = []
        
        # Check if it's about a specific crop
        if any(word in query.lower() for word in ['rice', 'paddy', 'wheat', 'tomato', 'potato']):
            response_parts.append("Based on the information available:")
        
        # Add context information
        response_parts.append(context[:500])  # First 500 chars
        
        # Add language-specific closing
        if language == "ta":
            response_parts.append("\n\nஉங்களுக்கு மேலும் உதவி தேவைப்பட்டால், எங்களை தொடர்பு கொள்ளவும்.")
        elif language == "hi":
            response_parts.append("\n\nअधिक सहायता के लिए कृपया हमसे संपर्क करें।")
        else:
            response_parts.append("\n\nFor more specific advice, consult your local agricultural expert.")
        
        return "\n".join(response_parts)
    
    def _get_fallback_response(self, language: str) -> str:
        """Get fallback response when no relevant context is found."""
        if language == "ta":
            return "மன்னிக்கவும், இந்த கேள்விக்கு தகவல் கிடைக்கவில்லை. உங்கள் உள்ளூர் விவசாய நிபுணரை அணுகவும்."
        elif language == "hi":
            return "क्षमा करें, इस प्रश्न के लिए जानकारी उपलब्ध नहीं है। कृपया अपने स्थानीय कृषि विशेषज्ञ से संपर्क करें।"
        else:
            return "I don't have specific information about this question in my knowledge base. Please consult your local agricultural expert or extension officer for personalized advice."


# Global RAG engine instance
rag_engine = RAGEngine()
