#!/usr/bin/env python3
"""
Test suite for the Enhanced RAG Engine (hybrid search, filtering, reranking).
Run: python test_enhanced_rag_engine.py  (or via pytest)
"""
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass

sys.path.insert(0, str(Path(__file__).parent))

from enhanced_rag_engine import EnhancedRAGEngine
from rag_engine import RAGEngine


class TestEnhancedRAGEngine:
    def setup_method(self):
        self.engine = EnhancedRAGEngine()
        if not self.engine.is_initialized:
            self.engine.initialize()

    def test_engine_is_initialized(self):
        assert self.engine.is_initialized is True

    def test_search_requires_initialization(self):
        fresh = EnhancedRAGEngine()
        fresh.is_initialized = False
        try:
            fresh.search_enhanced(query="rice")
            raised = False
        except RuntimeError:
            raised = True
        assert raised, "search_enhanced should raise when not initialized"

    def test_search_returns_result_shape(self):
        response = self.engine.search_enhanced(query="rice disease with yellow spots", top_k=3)
        assert 'results' in response
        assert 'query_info' in response
        assert isinstance(response['results'], list)
        assert response['query_info']['language'] == 'en'
        assert response['query_info']['intent'] in ('disease_diagnosis', 'pest_identification')

    def test_search_results_have_scores_and_metadata(self):
        response = self.engine.search_enhanced(query="rice blast", top_k=3)
        for result in response['results']:
            assert 'rerank_score' in result or 'similarity' in result
            assert 'metadata' in result
            assert 'content' in result

    def test_search_filters_to_crop(self):
        response = self.engine.search_enhanced(
            query="tomato disease",
            top_k=5,
            use_processing=True,
            use_metadata_filters=True,
        )
        assert response['query_info']['filters_applied'].get('crop') == 'tomato'
        tomato = sum(1 for r in response['results'] if 'tomato' in r['content'].lower())
        assert tomato >= 1, "expected at least one tomato-related result"

    def test_search_without_processing(self):
        response = self.engine.search_enhanced(
            query="rice blast",
            top_k=2,
            use_processing=False,
        )
        assert response['processing_steps']['query_processing'] is False
        assert response['query_info']['language'] == 'unknown'

    def test_returns_relevant_result_for_known_disease(self):
        response = self.engine.search_enhanced(
            query="rice bacterial leaf blight symptoms",
            top_k=3,
            use_processing=True,
            use_metadata_filters=True,
        )
        assert response['results'], "expected at least one result"
        assert response['results'][0]['rerank_score'] > 0.3

    def test_inherits_base_engine(self):
        assert isinstance(self.engine, RAGEngine)


def main():
    """Run all tests with plain asserts (no pytest dependency)."""
    instance = TestEnhancedRAGEngine()
    passed = 0
    failed = 0
    for name in dir(TestEnhancedRAGEngine):
        if not name.startswith('test_'):
            continue
        method = getattr(instance, name)
        try:
            instance.setup_method()
            method()
            print(f"  OK  TestEnhancedRAGEngine.{name}")
            passed += 1
        except AssertionError as e:
            print(f"FAIL  TestEnhancedRAGEngine.{name}: {e}")
            failed += 1
        except Exception as e:
            print(f"FAIL  TestEnhancedRAGEngine.{name}: {e!r}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
