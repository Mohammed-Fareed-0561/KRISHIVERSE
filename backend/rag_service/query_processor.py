"""
Production-Grade Query Processing Pipeline for Agricultural RAG
Implements: Language Detection, Spell Correction, Query Expansion, Intent Detection, Entity Extraction
"""
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import re
from loguru import logger


# ═══════════════════════════════════════════════════════════════
# QUERY PROCESSING DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════

@dataclass
class ProcessedQuery:
    """Processed query with all extracted information."""
    original: str  # Original user query
    processed: str  # Cleaned and expanded query
    language: str  # Detected language (en, ta, hi, tanglish)
    intent: str  # Detected intent (disease, pest, fertilizer, weather, etc.)
    entities: Dict[str, List[str]]  # Extracted entities {crop: [...], disease: [...], etc.}
    keywords: List[str]  # Extracted keywords
    synonyms: List[str]  # Query expansions/synonyms
    confidence: float  # Processing confidence (0-1)
    metadata_filters: Dict[str, Any]  # Suggested metadata filters for retrieval


# ═══════════════════════════════════════════════════════════════
# LANGUAGE DETECTION
# ═══════════════════════════════════════════════════════════════

class LanguageDetector:
    """Detect language from query text."""
    
    # Character ranges for language detection
    TAMIL_RANGE = range(0x0B80, 0x0BFF + 1)
    DEVANAGARI_RANGE = range(0x0900, 0x097F + 1)
    
    # Common words in each language
    TAMIL_WORDS = {
        'என்ன', 'எப்படி', 'எங்கே', 'யார்', 'எது', 'எப்போது',
        'நெல்', 'பருத்தி', 'தக்காளி', 'நோய்', 'பூச்சி'
    }
    
    HINDI_WORDS = {
        'क्या', 'कैसे', 'कहाँ', 'कौन', 'कब', 'क्यों',
        'धान', 'कपास', 'टमाटर', 'रोग', 'कीट'
    }
    
    ENGLISH_AGRICULTURAL_WORDS = {
        'crop', 'disease', 'pest', 'fertilizer', 'seed', 'harvest',
        'rice', 'wheat', 'cotton', 'tomato', 'plant', 'leaf'
    }
    
    def detect(self, text: str) -> str:
        """
        Detect language from text.
        
        Args:
            text: Input text
            
        Returns:
            Language code: 'ta', 'hi', 'en', 'tanglish'
        """
        if not text:
            return 'en'
        
        text_lower = text.lower()
        
        # Check for Tamil characters
        tamil_chars = sum(1 for char in text if ord(char) in self.TAMIL_RANGE)
        
        # Check for Devanagari (Hindi) characters
        hindi_chars = sum(1 for char in text if ord(char) in self.DEVANAGARI_RANGE)
        
        # Check for Tamil words
        tamil_word_count = sum(1 for word in self.TAMIL_WORDS if word in text)
        
        # Check for Hindi words
        hindi_word_count = sum(1 for word in self.HINDI_WORDS if word in text_lower)
        
        # Check for English agricultural words
        english_word_count = sum(1 for word in self.ENGLISH_AGRICULTURAL_WORDS if word in text_lower)
        
        total_chars = len(text)
        
        # Decision logic
        if tamil_chars > 5 or tamil_word_count > 0:
            # Check if mixed with English (Tanglish)
            if english_word_count > 0 or (tamil_chars / total_chars) < 0.7:
                return 'tanglish'
            return 'ta'
        
        if hindi_chars > 5 or hindi_word_count > 0:
            return 'hi'
        
        return 'en'


# ═══════════════════════════════════════════════════════════════
# SPELL CORRECTION
# ═══════════════════════════════════════════════════════════════

class SpellCorrector:
    """Correct spelling mistakes in agricultural queries."""
    
    # Common misspellings and corrections
    CORRECTIONS = {
        # Crops
        'rise': 'rice',
        'paddie': 'paddy',
        'tomatoe': 'tomato',
        'wheet': 'wheat',
        'coton': 'cotton',
        
        # Diseases
        'desease': 'disease',
        'dissease': 'disease',
        'blight': 'blight',
        
        # General
        'fertlizer': 'fertilizer',
        'pesticide': 'pesticide',
        'irigation': 'irrigation',
        'harvist': 'harvest'
    }
    
    def correct(self, text: str) -> str:
        """
        Correct common spelling mistakes.
        
        Args:
            text: Input text
            
        Returns:
            Corrected text
        """
        words = text.lower().split()
        corrected = []
        
        for word in words:
            # Check if word needs correction
            if word in self.CORRECTIONS:
                corrected.append(self.CORRECTIONS[word])
                logger.debug(f"Corrected '{word}' → '{self.CORRECTIONS[word]}'")
            else:
                corrected.append(word)
        
        return ' '.join(corrected)


# ═══════════════════════════════════════════════════════════════
# QUERY EXPANSION
# ═══════════════════════════════════════════════════════════════

class QueryExpander:
    """Expand queries with synonyms and related terms."""
    
    # Synonym mappings
    SYNONYMS = {
        # Crops
        'rice': ['paddy', 'dhan', 'chawal', 'நெல்'],
        'wheat': ['gehun', 'கோதுமை'],
        'tomato': ['tamatar', 'தக்காளி'],
        'cotton': ['kapas', 'பருத்தி'],
        'chilli': ['chili', 'mirchi', 'மிளகாய்'],
        
        # Diseases
        'disease': ['problem', 'infection', 'illness', 'நோய்', 'रोग'],
        'pest': ['insect', 'bug', 'பூச்சி', 'कीट'],
        'blight': ['rot', 'decay'],
        
        # Symptoms
        'yellow': ['yellowing', 'yellowish'],
        'spots': ['spot', 'marks', 'patches'],
        'wilt': ['wilting', 'drooping'],
        
        # Actions
        'treatment': ['remedy', 'cure', 'control', 'solution'],
        'prevention': ['prevent', 'avoid', 'protection']
    }
    
    def expand(self, text: str) -> List[str]:
        """
        Expand query with synonyms.
        
        Args:
            text: Input query
            
        Returns:
            List of expanded terms including original
        """
        text_lower = text.lower()
        expansions = [text]  # Always include original
        
        # Find matching synonyms
        for word, synonyms in self.SYNONYMS.items():
            if word in text_lower:
                # Add synonyms as separate search terms
                for syn in synonyms[:3]:  # Limit to top 3 synonyms
                    expansion = text_lower.replace(word, syn)
                    if expansion != text_lower:
                        expansions.append(expansion)
        
        logger.debug(f"Query expanded: {text} → {len(expansions)} variations")
        return expansions[:5]  # Limit total expansions


# ═══════════════════════════════════════════════════════════════
# INTENT DETECTION
# ═══════════════════════════════════════════════════════════════

class IntentDetector:
    """Detect user intent from query."""
    
    # Intent patterns
    PATTERNS = {
        'disease_diagnosis': [
            r'\b(disease|infection|problem|issue|sick|dying)\b',
            r'\b(spots?|patches?|lesions?|marks?)\b',
            r'\b(yellow|brown|white|black)\s+(leaves?|stems?|fruits?)\b',
            r'\b(wilting|drooping|curling|rotting)\b'
        ],
        'pest_identification': [
            r'\b(pest|insect|bug|worm|caterpillar)\b',
            r'\b(eating|chewing|sucking|boring)\b',
            r'\b(holes?|damage)\s+(in|on)\s+(leaves?|fruits?)\b'
        ],
        'fertilizer_advice': [
            r'\b(fertilizer|manure|nutrient|feeding)\b',
            r'\b(NPK|urea|nitrogen|phosphorus|potassium)\b',
            r'\b(deficiency|lack|shortage)\b'
        ],
        'weather_query': [
            r'\b(weather|rain|temperature|climate)\b',
            r'\b(monsoon|season|forecast)\b'
        ],
        'irrigation': [
            r'\b(irrigation|watering|water)\b',
            r'\b(drip|sprinkler|flood)\b'
        ],
        'harvest': [
            r'\b(harvest|yield|output|production)\b',
            r'\b(when|timing|time)\s+to\s+harvest\b'
        ],
        'scheme_query': [
            r'\b(scheme|subsidy|loan|support|yojana)\b',
            r'\b(PM.?KISAN|PMFBY|KCC)\b'
        ],
        'general_cultivation': [
            r'\b(grow|cultivate|plant|sow)\b',
            r'\b(variety|seed|planting)\b'
        ]
    }
    
    def detect(self, text: str) -> str:
        """
        Detect intent from query text.
        
        Args:
            text: Input query
            
        Returns:
            Intent name or 'unknown'
        """
        text_lower = text.lower()
        
        # Check each intent pattern
        for intent, patterns in self.PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    logger.debug(f"Detected intent: {intent}")
                    return intent
        
        return 'unknown'


# ═══════════════════════════════════════════════════════════════
# ENTITY EXTRACTION
# ═══════════════════════════════════════════════════════════════

class EntityExtractor:
    """Extract agricultural entities from query."""
    
    # Entity dictionaries
    CROPS = {
        'rice', 'paddy', 'dhan', 'chawal', 'wheat', 'gehun',
        'tomato', 'tamatar', 'cotton', 'kapas', 'chilli', 'mirchi',
        'potato', 'aloo', 'onion', 'pyaz', 'banana', 'kela',
        'sugarcane', 'ganna', 'maize', 'corn', 'groundnut'
    }
    
    DISEASES = {
        'blast', 'blight', 'wilt', 'rot', 'rust', 'smut',
        'mosaic', 'curl', 'mildew', 'scab', 'canker'
    }
    
    GROWTH_STAGES = {
        'seedling', 'vegetative', 'flowering', 'fruiting',
        'maturity', 'harvest', 'germination'
    }
    
    def extract(self, text: str) -> Dict[str, List[str]]:
        """
        Extract entities from query.
        
        Args:
            text: Input query
            
        Returns:
            Dictionary of entities by type
        """
        text_lower = text.lower()
        
        entities = {
            'crops': [],
            'diseases': [],
            'growth_stages': [],
            'symptoms': []
        }
        
        # Extract crops
        for crop in self.CROPS:
            if crop in text_lower:
                entities['crops'].append(crop)
        
        # Extract diseases
        for disease in self.DISEASES:
            if disease in text_lower:
                entities['diseases'].append(disease)
        
        # Extract growth stages
        for stage in self.GROWTH_STAGES:
            if stage in text_lower:
                entities['growth_stages'].append(stage)
        
        # Extract symptom keywords
        symptom_keywords = ['yellow', 'brown', 'black', 'white', 'spots', 'patches', 'wilting', 'drooping']
        entities['symptoms'] = [kw for kw in symptom_keywords if kw in text_lower]
        
        logger.debug(f"Extracted entities: {entities}")
        return entities


# ═══════════════════════════════════════════════════════════════
# MAIN QUERY PROCESSOR
# ═══════════════════════════════════════════════════════════════

class QueryProcessor:
    """
    Production-grade query processing pipeline.
    
    Pipeline:
    1. Language Detection
    2. Spell Correction
    3. Query Expansion
    4. Intent Detection
    5. Entity Extraction
    6. Metadata Filter Suggestion
    """
    
    def __init__(self):
        """Initialize all processing components."""
        self.language_detector = LanguageDetector()
        self.spell_corrector = SpellCorrector()
        self.query_expander = QueryExpander()
        self.intent_detector = IntentDetector()
        self.entity_extractor = EntityExtractor()
    
    def process(self, query: str) -> ProcessedQuery:
        """
        Process query through full pipeline.
        
        Args:
            query: Raw user query
            
        Returns:
            ProcessedQuery with all extracted information
        """
        if not query or not query.strip():
            return ProcessedQuery(
                original=query,
                processed=query,
                language='en',
                intent='unknown',
                entities={},
                keywords=[],
                synonyms=[],
                confidence=0.0,
                metadata_filters={}
            )
        
        logger.info(f"Processing query: {query[:100]}...")
        
        # Step 1: Detect language
        language = self.language_detector.detect(query)
        logger.debug(f"Language: {language}")
        
        # Step 2: Spell correction (English only for now)
        corrected = query
        if language in ['en', 'tanglish']:
            corrected = self.spell_corrector.correct(query)
        
        # Step 3: Query expansion
        expansions = self.query_expander.expand(corrected)
        
        # Step 4: Intent detection
        intent = self.intent_detector.detect(corrected)
        
        # Step 5: Entity extraction
        entities = self.entity_extractor.extract(corrected)
        
        # Step 6: Extract keywords (simple word tokenization)
        keywords = self._extract_keywords(corrected)
        
        # Step 7: Suggest metadata filters
        metadata_filters = self._suggest_filters(intent, entities)
        
        # Calculate confidence based on entity extraction
        confidence = self._calculate_confidence(entities, intent)
        
        result = ProcessedQuery(
            original=query,
            processed=corrected,
            language=language,
            intent=intent,
            entities=entities,
            keywords=keywords,
            synonyms=expansions,
            confidence=confidence,
            metadata_filters=metadata_filters
        )
        
        logger.success(f"Query processed: intent={intent}, lang={language}, confidence={confidence:.2f}")
        return result
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text."""
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'is', 'are', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or'}
        words = text.lower().split()
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        return keywords[:10]  # Limit to top 10
    
    def _suggest_filters(self, intent: str, entities: Dict[str, List[str]]) -> Dict[str, Any]:
        """Suggest metadata filters based on intent and entities."""
        filters = {}
        
        # Filter by document type based on intent
        if intent == 'disease_diagnosis':
            filters['type'] = 'disease'
        elif intent == 'pest_identification':
            filters['type'] = 'pest'
        elif intent == 'fertilizer_advice':
            filters['type'] = 'practice'
        elif intent == 'scheme_query':
            filters['type'] = 'scheme'
        
        # Filter by crop if detected
        if entities.get('crops'):
            filters['crop'] = entities['crops'][0]  # Use first detected crop
        
        # Filter by growth stage if detected
        if entities.get('growth_stages'):
            filters['growth_stage'] = entities['growth_stages'][0]
        
        return filters
    
    def _calculate_confidence(self, entities: Dict[str, List[str]], intent: str) -> float:
        """Calculate processing confidence score."""
        # Base confidence
        confidence = 0.5
        
        # Boost if intent is detected
        if intent != 'unknown':
            confidence += 0.2
        
        # Boost based on entity extraction
        total_entities = sum(len(v) for v in entities.values())
        if total_entities > 0:
            confidence += min(0.3, total_entities * 0.1)
        
        return min(1.0, confidence)


# ═══════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTION
# ═══════════════════════════════════════════════════════════════

# Global instance for easy import
query_processor = QueryProcessor()


def process_query(query: str) -> ProcessedQuery:
    """
    Convenience function to process a query.
    
    Args:
        query: Raw user query
        
    Returns:
        ProcessedQuery object
    """
    return query_processor.process(query)
