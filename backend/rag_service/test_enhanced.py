#!/usr/bin/env python3
"""
Test suite for Enhanced RAG Engine.
Run this to verify query processing and enhanced search work correctly.
"""
import sys
import json
from pathlib import Path

# Windows consoles default to cp1252 which can't encode emoji/Devanagari/Tamil
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from query_processor import query_processor
from enhanced_rag_engine import enhanced_rag_engine


def test_query_processor():
    """Test query processing pipeline."""
    print("\n" + "=" * 60)
    print("TEST 1: Query Processing Pipeline")
    print("=" * 60)

    test_queries = [
        "my rice crops have yellow spots",
        "yelloe spots on tamato",
        "என் நெல் பயிரில் மஞ்சள் புள்ளிகள்",
        "what fertilizer for wheat flowering",
        "market price of tomato today",
    ]

    for query in test_queries:
        print(f"\n? Query: {query}")
        processed = query_processor.process(query)

        print(f"   Language: {processed.language}")
        print(f"   Corrected: {processed.processed}")
        print(f"   Intent: {processed.intent}")
        print(f"   Entities: {json.dumps(processed.entities, indent=6)}")
        print(f"   Expanded Queries: {processed.synonyms[:2]}")  # First 2
        print(f"   Confidence: {processed.confidence:.2f}")


def test_enhanced_search():
    """Test enhanced search with real data."""
    print("\n" + "=" * 60)
    print("TEST 2: Enhanced Search")
    print("=" * 60)

    if not enhanced_rag_engine.is_initialized:
        print("?  RAG engine not initialized. Starting initialization...")
        try:
            enhanced_rag_engine.initialize()
            print("? Initialization complete")
        except Exception as e:
            print(f"? Initialization failed: {e}")
            return

    test_queries = [
        "rice bacterial leaf blight symptoms",
        "organic remedy for tomato disease",
    ]

    for query in test_queries:
        print(f"\n? Query: {query}")

        try:
            response = enhanced_rag_engine.search_enhanced(
                query=query,
                top_k=3,
                use_processing=True,
                use_metadata_filters=True,
            )

            print(f"\n   ? Query Info:")
            print(f"      Language: {response['query_info']['language']}")
            print(f"      Intent: {response['query_info']['intent']}")
            print(f"      Entities: {response['query_info']['entities']}")
            print(f"      Confidence: {response['query_info']['confidence']:.2f}")

            print(f"\n   ? Results ({len(response['results'])} documents):")
            for i, result in enumerate(response['results'][:3], 1):
                print(f"\n      [{i}] Score: {result.get('rerank_score', result.get('similarity', 0)):.4f}")
                print(f"          Name: {result['metadata'].get('disease_name') or result['metadata'].get('crop') or result['metadata'].get('type')}")
                content = result['content'][:100].replace('\n', ' ')
                print(f"          Content: {content}...")

        except Exception as e:
            print(f"   ? Search failed: {e}")
            import traceback
            traceback.print_exc()


def test_metadata_filtering():
    """Test metadata filtering capability."""
    print("\n" + "=" * 60)
    print("TEST 3: Metadata Filtering")
    print("=" * 60)

    if not enhanced_rag_engine.is_initialized:
        print("?  RAG engine not initialized. Skipping test.")
        return

    # Query specifically about rice
    query = "rice disease with yellow spots"

    print(f"? Query: {query}")
    print("   Testing if results are filtered to rice-related documents...")

    try:
        response = enhanced_rag_engine.search_enhanced(
            query=query,
            top_k=5,
            use_processing=True,
            use_metadata_filters=True,
        )

        # Check if 'rice' appears in results
        rice_count = sum(
            1 for r in response['results']
            if 'rice' in r['content'].lower()
        )

        print(f"\n   ? Found {rice_count}/{len(response['results'])} rice-related results")

        if response['query_info']['entities'].get('crops'):
            print(f"   ? Detected crops: {response['query_info']['entities']['crops']}")

    except Exception as e:
        print(f"   ? Test failed: {e}")


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("? KRISHIVERSE ENHANCED RAG - TEST SUITE")
    print("=" * 60)

    try:
        test_query_processor()
        test_enhanced_search()
        test_metadata_filtering()

        print("\n" + "=" * 60)
        print("? ALL TESTS COMPLETED")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Start the RAG service: python app.py")
        print("2. Test via API: POST http://localhost:8000/rag/ask")
        print("3. Rebuild vector store: POST http://localhost:8000/rag/rebuild")

    except Exception as e:
        print(f"\n? Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
