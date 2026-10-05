"""
Enhanced RAG Engine with Production-Grade Query Processing and Hybrid Search
Extends the base RAG engine with advanced retrieval capabilities.
"""
from typing import List, Dict, Any, Optional
from loguru import logger

from rag_engine import RAGEngine
from query_processor import query_processor, ProcessedQuery
from config import settings


class EnhancedRAGEngine(RAGEngine):
    """
    Enhanced RAG Engine with:
    - Query preprocessing pipeline
    - Hybrid search (vector + keyword + metadata)
    - Reranking
    - Confidence scoring
    """
    
    def __init__(self):
        """Initialize enhanced RAG engine."""
        super().__init__()
        self.use_query_processing = True
        self.use_hybrid_search = True
        self.use_reranking = True
    
    def search_enhanced(
        self,
        query: str,
        top_k: int = None,
        use_processing: bool = True,
        use_metadata_filters: bool = True
    ) -> Dict[str, Any]:
        """
        Enhanced search with query processing and hybrid retrieval.
        
        Args:
            query: User query
            top_k: Number of results to return
            use_processing: Whether to use query processing pipeline
            use_metadata_filters: Whether to apply metadata filtering
            
        Returns:
            Dictionary with results and processing info
        """
        if not self.is_initialized:
            raise RuntimeError("RAG engine not initialized")
        
        top_k = top_k or settings.top_k_results
        
        # Step 1: Process query through pipeline
        processed_query = None
        if use_processing and self.use_query_processing:
            processed_query = query_processor.process(query)
            logger.info(
                f"Query processed: "
                f"intent={processed_query.intent}, "
                f"lang={processed_query.language}, "
                f"confidence={processed_query.confidence:.2f}"
            )
            search_query = processed_query.processed
        else:
            search_query = query
        
        # Step 2: Vector search (use base implementation)
        vector_results = super().search(search_query, top_k * 2)  # Get more for reranking
        
        # Step 3: Apply metadata filtering if available
        filtered_results = vector_results
        if use_metadata_filters and processed_query and processed_query.metadata_filters:
            filtered_results = self._apply_metadata_filters(
                vector_results,
                processed_query.metadata_filters
            )
            logger.debug(f"Filtered {len(vector_results)} → {len(filtered_results)} results")
        
        # Step 4: Query expansion search (if synonyms available)
        expanded_results = []
        if processed_query and len(processed_query.synonyms) > 1:
            for synonym_query in processed_query.synonyms[1:3]:  # Use top 2 synonyms
                synonym_results = super().search(synonym_query, top_k)
                expanded_results.extend(synonym_results)
        
        # Step 5: Combine and deduplicate results
        combined_results = self._combine_results(
            filtered_results,
            expanded_results
        )
        
        # Step 6: Rerank results
        if self.use_reranking and processed_query:
            reranked_results = self._rerank_results(
                combined_results,
                processed_query
            )
        else:
            reranked_results = combined_results
        
        # Step 7: Limit to top_k
        final_results = reranked_results[:top_k]
        
        # Build response
        return {
            'results': final_results,
            'total_found': len(combined_results),
            'query_info': {
                'original': query,
                'processed': search_query if processed_query else query,
                'language': processed_query.language if processed_query else 'unknown',
                'intent': processed_query.intent if processed_query else 'unknown',
                'confidence': processed_query.confidence if processed_query else 0.5,
                'entities': processed_query.entities if processed_query else {},
                'filters_applied': processed_query.metadata_filters if processed_query else {}
            },
            'processing_steps': {
                'query_processing': use_processing,
                'metadata_filtering': use_metadata_filters and bool(processed_query and processed_query.metadata_filters),
                'query_expansion': bool(processed_query and len(processed_query.synonyms) > 1),
                'reranking': self.use_reranking
            }
        }
    
    def _apply_metadata_filters(
        self,
        results: List[Dict[str, Any]],
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Filter results by metadata criteria.
        
        Args:
            results: Search results
            filters: Metadata filters to apply
            
        Returns:
            Filtered results
        """
        if not filters:
            return results
        
        filtered = []
        for result in results:
            metadata = result.get('metadata', {})
            
            # Check each filter
            matches = True
            for key, value in filters.items():
                # Handle different metadata structures
                if key == 'type' and metadata.get('type') != value:
                    matches = False
                    break
                elif key == 'crop':
                    # Check if crop matches (handle nested structure)
                    crop_meta = metadata.get('crop', {})
                    if isinstance(crop_meta, dict):
                        crop_name = crop_meta.get('name', '').lower()
                    else:
                        crop_name = str(crop_meta).lower()
                    if value.lower() not in crop_name:
                        matches = False
                        break
                elif key == 'growth_stage' and metadata.get('growth_stage') != value:
                    matches = False
                    break
            
            if matches:
                filtered.append(result)
        
        return filtered
    
    def _combine_results(
        self,
        primary_results: List[Dict[str, Any]],
        secondary_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Combine and deduplicate results from multiple searches.
        
        Args:
            primary_results: Main search results
            secondary_results: Additional results from query expansion
            
        Returns:
            Combined deduplicated results
        """
        # Use document content as deduplication key
        seen = set()
        combined = []
        
        # Add primary results first (higher priority)
        for result in primary_results:
            content = result.get('content', '')
            if content and content not in seen:
                seen.add(content)
                combined.append(result)
        
        # Add secondary results
        for result in secondary_results:
            content = result.get('content', '')
            if content and content not in seen:
                seen.add(content)
                # Boost similarity score slightly lower for expanded results
                result['similarity'] = result.get('similarity', 0.5) * 0.9
                combined.append(result)
        
        return combined
    
    def _rerank_results(
        self,
        results: List[Dict[str, Any]],
        processed_query: ProcessedQuery
    ) -> List[Dict[str, Any]]:
        """
        Rerank results based on query intent and entity matching.
        
        Args:
            results: Search results
            processed_query: Processed query with extracted info
            
        Returns:
            Reranked results
        """
        if not results:
            return results
        
        # Calculate reranking scores
        for result in results:
            base_score = result.get('similarity', 0.5)
            content = result.get('content', '').lower()
            metadata = result.get('metadata', {})
            
            # Start with base similarity
            rerank_score = base_score
            
            # Boost 1: Entity matching
            entity_boost = 0.0
            for entity_type, entities in processed_query.entities.items():
                for entity in entities:
                    if entity.lower() in content:
                        entity_boost += 0.05
            
            # Boost 2: Keyword matching
            keyword_boost = 0.0
            for keyword in processed_query.keywords:
                if keyword.lower() in content:
                    keyword_boost += 0.03
            
            # Boost 3: Intent-specific boosting
            intent_boost = 0.0
            if processed_query.intent == 'disease_diagnosis':
                if metadata.get('type') == 'disease':
                    intent_boost = 0.1
            elif processed_query.intent == 'pest_identification':
                if metadata.get('type') == 'pest':
                    intent_boost = 0.1
            
            # Boost 4: Source confidence (if available in metadata)
            source_boost = 0.0
            if 'confidence_score' in metadata:
                source_boost = metadata['confidence_score'] * 0.05
            
            # Calculate final rerank score
            rerank_score = base_score + entity_boost + keyword_boost + intent_boost + source_boost
            rerank_score = min(1.0, rerank_score)  # Cap at 1.0
            
            result['rerank_score'] = rerank_score
            result['score_breakdown'] = {
                'base': base_score,
                'entity_boost': entity_boost,
                'keyword_boost': keyword_boost,
                'intent_boost': intent_boost,
                'source_boost': source_boost
            }
        
        # Sort by rerank score
        reranked = sorted(results, key=lambda x: x.get('rerank_score', 0), reverse=True)
        
        logger.debug(f"Reranked {len(results)} results")
        return reranked


# Create global instance
enhanced_rag_engine = EnhancedRAGEngine()
