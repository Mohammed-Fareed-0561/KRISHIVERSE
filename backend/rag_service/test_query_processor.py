#!/usr/bin/env python3
"""
Test suite for the RAG query processing pipeline.
Run: python test_query_processor.py  (or via pytest)
"""
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass

sys.path.insert(0, str(Path(__file__).parent))

from query_processor import (
    query_processor,
    QueryProcessor,
    LanguageDetector,
    SpellCorrector,
    QueryExpander,
    IntentDetector,
    EntityExtractor,
    ProcessedQuery,
)


class TestLanguageDetector:
    def setup_method(self):
        self.detector = LanguageDetector()

    def test_english(self):
        assert self.detector.detect("my rice crop has a disease") == 'en'

    def test_hindi(self):
        assert self.detector.detect("मेरे धान में रोग है") == 'hi'

    def test_tamil(self):
        assert self.detector.detect("என் நெல் பயிரில் மஞ்சள் புள்ளிகள்") == 'ta'

    def test_empty_returns_english(self):
        assert self.detector.detect("") == 'en'

    def test_tanglish_mixed(self):
        assert self.detector.detect("என் நெல் பயிரில் pest disease") == 'tanglish'


class TestSpellCorrector:
    def setup_method(self):
        self.corrector = SpellCorrector()

    def test_corrects_misspellings(self):
        assert self.corrector.correct("my rise has desease") == "my rice has disease"

    def test_leaves_known_words(self):
        assert self.corrector.correct("rice is healthy") == "rice is healthy"


class TestQueryExpander:
    def setup_method(self):
        self.expander = QueryExpander()

    def test_expands_with_synonyms(self):
        expansions = self.expander.expand("rice disease")
        assert any("paddy" in e for e in expansions)
        assert expansions[0] == "rice disease"

    def test_limits_expansions(self):
        assert len(self.expander.expand("rice disease")) <= 5


class TestIntentDetector:
    def setup_method(self):
        self.detector = IntentDetector()

    def test_disease_diagnosis(self):
        assert self.detector.detect("my plant has yellow spots") == 'disease_diagnosis'

    def test_pest_identification(self):
        assert self.detector.detect("insect eating my leaves") == 'pest_identification'

    def test_fertilizer_advice(self):
        assert self.detector.detect("how much urea to apply") == 'fertilizer_advice'

    def test_weather_query(self):
        assert self.detector.detect("will it rain this week") == 'weather_query'

    def test_unknown(self):
        assert self.detector.detect("hello world foo bar") == 'unknown'


class TestEntityExtractor:
    def setup_method(self):
        self.extractor = EntityExtractor()

    def test_extracts_crops(self):
        entities = self.extractor.extract("tomato disease")
        assert 'tomato' in entities['crops']

    def test_extracts_diseases(self):
        entities = self.extractor.extract("rice blast")
        assert 'blast' in entities['diseases']

    def test_extracts_symptoms(self):
        entities = self.extractor.extract("yellow wilting leaves")
        assert 'yellow' in entities['symptoms']
        assert 'wilting' in entities['symptoms']


class TestQueryProcessor:
    def setup_method(self):
        self.processor = QueryProcessor()

    def test_process_returns_processed_query(self):
        result = self.processor.process("my rice has yellow spots")
        assert isinstance(result, ProcessedQuery)
        assert result.original == "my rice has yellow spots"

    def test_process_spell_corrects(self):
        result = self.processor.process("my rise has desease")
        assert result.processed == "my rice has disease"

    def test_process_detects_language_and_intent(self):
        result = self.processor.process("how much urea for wheat")
        assert result.language == 'en'
        assert result.intent == 'fertilizer_advice'
        assert 'wheat' in result.entities['crops']

    def test_process_suggests_metadata_filters(self):
        result = self.processor.process("rice disease")
        assert result.metadata_filters.get('type') == 'disease'
        assert result.metadata_filters.get('crop') == 'rice'

    def test_process_confidence(self):
        result = self.processor.process("tomato blight")
        assert result.confidence > 0.5

    def test_process_empty_query(self):
        result = self.processor.process("   ")
        assert result.intent == 'unknown'
        assert result.confidence == 0.0

    def test_process_tamil(self):
        result = self.processor.process("நெல் பயிரில் மஞ்சள் புள்ளிகள்")
        assert result.language == 'ta'

    def test_module_global_instance(self):
        result = query_processor.process("cotton pest problem")
        assert result.entities['crops']
        assert result.intent in ('pest_identification', 'disease_diagnosis')


def main():
    """Run all tests with plain asserts (no pytest dependency)."""
    test_classes = [
        TestLanguageDetector,
        TestSpellCorrector,
        TestQueryExpander,
        TestIntentDetector,
        TestEntityExtractor,
        TestQueryProcessor,
    ]
    passed = 0
    failed = 0
    for cls in test_classes:
        instance = cls()
        for name in dir(cls):
            if not name.startswith('test_'):
                continue
            method = getattr(instance, name)
            try:
                if hasattr(instance, 'setup_method'):
                    instance.setup_method()
                method()
                print(f"  OK  {cls.__name__}.{name}")
                passed += 1
            except AssertionError as e:
                print(f"FAIL  {cls.__name__}.{name}: {e}")
                failed += 1
            except Exception as e:
                print(f"FAIL  {cls.__name__}.{name}: {e!r}")
                failed += 1
    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
