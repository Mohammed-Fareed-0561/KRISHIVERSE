#!/usr/bin/env python3
"""Test script for RAG service."""
import requests
import json
import time


def test_health():
    """Test health endpoint."""
    print("Testing /health endpoint...")
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


def test_ask(question, language="en"):
    """Test ask endpoint."""
    print(f"\n{'='*60}")
    print(f"Question: {question}")
    print(f"Language: {language}")
    print(f"{'='*60}")
    
    try:
        start_time = time.time()
        response = requests.post(
            "http://localhost:8000/rag/ask",
            json={
                "question": question,
                "language": language,
                "context": {}
            },
            timeout=30
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Answer (took {elapsed:.2f}s):")
            print(f"   {data['answer']}")
            print(f"\n   Confidence: {data['confidence']:.2%}")
            print(f"   Source: {data['source']}")
            print(f"   Model: {data['model']}")
            if data.get('sources_used'):
                print(f"   Sources: {len(data['sources_used'])} documents")
            return True
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def test_stats():
    """Test stats endpoint."""
    print("\nTesting /rag/stats endpoint...")
    try:
        response = requests.get("http://localhost:8000/rag/stats")
        if response.status_code == 200:
            print(f"Stats: {json.dumps(response.json(), indent=2)}")
            return True
        else:
            print(f"❌ Stats failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Stats request failed: {e}")
        return False


def main():
    """Run all tests."""
    print("\n🌾 KrishiVerse RAG Service Test Suite\n")
    
    # Test health
    if not test_health():
        print("\n❌ Service is not running. Please start it first:")
        print("   python app.py")
        return
    
    print("\n✅ Service is healthy!\n")
    time.sleep(1)
    
    # Test questions
    test_questions = [
        ("How to treat late blight in potato?", "en"),
        ("What is the best NPK ratio for paddy?", "en"),
        ("Tell me about PM-KISAN scheme", "en"),
        ("What are the symptoms of tomato early blight?", "en"),
        ("How much urea should I use for wheat?", "en"),
        ("What causes brown spot in paddy?", "en"),
    ]
    
    success_count = 0
    for question, lang in test_questions:
        if test_ask(question, lang):
            success_count += 1
        time.sleep(1)
    
    # Test stats
    print("\n" + "="*60)
    test_stats()
    
    # Summary
    print("\n" + "="*60)
    print(f"Test Results: {success_count}/{len(test_questions)} passed")
    print("="*60)


if __name__ == "__main__":
    main()
