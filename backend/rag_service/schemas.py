"""
Production-Grade Document Metadata Schema for Agricultural Knowledge
Follows the KrishiVerse specification for comprehensive metadata tracking.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from enum import Enum


class CropCategory(str, Enum):
    """Crop categories."""
    CEREAL = "cereal"
    PULSE = "pulse"
    OILSEED = "oilseed"
    VEGETABLE = "vegetable"
    FRUIT = "fruit"
    PLANTATION = "plantation"
    SPICE = "spice"
    FIBER = "fiber"
    MEDICINAL = "medicinal"
    FLOWER = "flower"
    FODDER = "fodder"


class Season(str, Enum):
    """Agricultural seasons."""
    KHARIF = "kharif"  # June-October (Monsoon)
    RABI = "rabi"  # November-March (Winter)
    ZAID = "zaid"  # March-June (Summer)
    PERENNIAL = "perennial"


class ClimateType(str, Enum):
    """Climate types."""
    TROPICAL = "tropical"
    SUBTROPICAL = "subtropical"
    TEMPERATE = "temperate"
    ARID = "arid"
    SEMI_ARID = "semi-arid"
    HUMID = "humid"


class SoilType(str, Enum):
    """Soil types."""
    CLAY = "clay"
    LOAM = "loam"
    SANDY = "sandy"
    CLAY_LOAM = "clay_loam"
    SANDY_LOAM = "sandy_loam"
    BLACK_SOIL = "black_soil"
    RED_SOIL = "red_soil"
    LATERITE = "laterite"
    ALLUVIAL = "alluvial"


class WaterRequirement(str, Enum):
    """Water requirement levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class GrowthStage(str, Enum):
    """Crop growth stages."""
    SEED_TREATMENT = "seed_treatment"
    GERMINATION = "germination"
    SEEDLING = "seedling"
    VEGETATIVE = "vegetative"
    FLOWERING = "flowering"
    FRUITING = "fruiting"
    MATURITY = "maturity"
    HARVEST = "harvest"


class Severity(str, Enum):
    """Disease/pest severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    CRITICAL = "critical"


class Language(str, Enum):
    """Supported languages."""
    ENGLISH = "en"
    TAMIL = "ta"
    HINDI = "hi"
    MARATHI = "mr"
    TELUGU = "te"
    KANNADA = "kn"


# ═══════════════════════════════════════════════════════════════
# CROP METADATA
# ═══════════════════════════════════════════════════════════════

class CropMetadata(BaseModel):
    """Comprehensive crop metadata."""
    name: str = Field(..., description="Common crop name")
    scientific_name: str = Field(..., description="Scientific name (Latin)")
    tamil_name: Optional[str] = Field(None, description="Tamil name")
    english_name: Optional[str] = Field(None, description="English name")
    hindi_name: Optional[str] = Field(None, description="Hindi name")
    category: CropCategory = Field(..., description="Crop category")
    aliases: List[str] = Field(default_factory=list, description="Alternative names, local names")
    
    class Config:
        use_enum_values = True


# ═══════════════════════════════════════════════════════════════
# LOCATION METADATA
# ═══════════════════════════════════════════════════════════════

class LocationMetadata(BaseModel):
    """Location-specific metadata."""
    district: Optional[str] = Field(None, description="District name")
    state: str = Field(default="Tamil Nadu", description="State name")
    region: Optional[str] = Field(None, description="Agro-ecological region")
    climate: Optional[ClimateType] = Field(None, description="Climate type")
    season: Optional[Season] = Field(None, description="Recommended season")
    
    class Config:
        use_enum_values = True


# ═══════════════════════════════════════════════════════════════
# DISEASE/PEST METADATA
# ═══════════════════════════════════════════════════════════════

class DiseasePestMetadata(BaseModel):
    """Disease or pest metadata."""
    name: str = Field(..., description="Disease/pest name")
    tamil_name: Optional[str] = Field(None, description="Tamil name")
    scientific_name: Optional[str] = Field(None, description="Scientific name")
    type: str = Field(..., description="Type: disease, pest, deficiency, weed")
    pathogen: Optional[str] = Field(None, description="Causal organism")
    severity: Severity = Field(..., description="Severity level")
    symptoms: List[str] = Field(default_factory=list, description="List of symptoms")
    causes: List[str] = Field(default_factory=list, description="Causes")
    affected_stages: List[GrowthStage] = Field(default_factory=list, description="Affected growth stages")
    
    class Config:
        use_enum_values = True


# ═══════════════════════════════════════════════════════════════
# TREATMENT/REMEDY METADATA
# ═══════════════════════════════════════════════════════════════

class TreatmentMetadata(BaseModel):
    """Treatment and remedy metadata."""
    organic_remedies: List[str] = Field(default_factory=list, description="Organic treatment methods")
    chemical_remedies: List[str] = Field(default_factory=list, description="Chemical treatments")
    biological_control: List[str] = Field(default_factory=list, description="Biological control agents")
    ipm_practices: List[str] = Field(default_factory=list, description="Integrated Pest Management")
    immediate_actions: List[str] = Field(default_factory=list, description="Immediate actions to take")
    preventive_measures: List[str] = Field(default_factory=list, description="Prevention methods")
    dosage: Optional[str] = Field(None, description="Dosage information")
    application_timing: Optional[str] = Field(None, description="When to apply")
    safety_precautions: List[str] = Field(default_factory=list, description="Safety warnings")


# ═══════════════════════════════════════════════════════════════
# AGRONOMIC METADATA
# ═══════════════════════════════════════════════════════════════

class AgronomicMetadata(BaseModel):
    """Agronomic practices metadata."""
    soil_type: Optional[SoilType] = Field(None, description="Suitable soil type")
    water_requirement: Optional[WaterRequirement] = Field(None, description="Water needs")
    growth_stage: Optional[GrowthStage] = Field(None, description="Growth stage")
    fertilizer_schedule: List[str] = Field(default_factory=list, description="Fertilizer application schedule")
    irrigation_schedule: List[str] = Field(default_factory=list, description="Irrigation schedule")
    harvest_time: Optional[str] = Field(None, description="Harvest timing")
    yield_estimate: Optional[str] = Field(None, description="Expected yield")
    storage_guidelines: List[str] = Field(default_factory=list, description="Post-harvest storage")
    
    class Config:
        use_enum_values = True


# ═══════════════════════════════════════════════════════════════
# SOURCE/VERIFICATION METADATA
# ═══════════════════════════════════════════════════════════════

class SourceMetadata(BaseModel):
    """Source and verification metadata."""
    organization: str = Field(..., description="Source organization (TNAU, ICAR, KVK, etc.)")
    reference_url: Optional[HttpUrl] = Field(None, description="Reference URL")
    document_id: Optional[str] = Field(None, description="Document ID from source")
    publication_date: Optional[datetime] = Field(None, description="Original publication date")
    last_updated: datetime = Field(default_factory=datetime.now, description="Last updated timestamp")
    last_verified: Optional[datetime] = Field(None, description="Last verification date")
    verified_by: Optional[str] = Field(None, description="Verified by (expert name/role)")
    is_verified: bool = Field(default=False, description="Verification status")
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0, description="Content confidence score")


# ═══════════════════════════════════════════════════════════════
# COMPREHENSIVE AGRICULTURAL DOCUMENT METADATA
# ═══════════════════════════════════════════════════════════════

class AgriculturalDocumentMetadata(BaseModel):
    """
    Production-grade comprehensive metadata for agricultural knowledge documents.
    
    This schema follows the KrishiVerse specification for tracking all relevant
    information about crops, diseases, pests, treatments, and practices.
    """
    
    # Core identifiers
    id: str = Field(..., description="Unique document ID")
    type: str = Field(..., description="Document type: crop_info, disease, pest, practice, scheme, faq")
    language: Language = Field(default=Language.ENGLISH, description="Primary language")
    
    # Crop information
    crop: Optional[CropMetadata] = Field(None, description="Crop details")
    
    # Location/climate specificity
    location: Optional[LocationMetadata] = Field(None, description="Location-specific info")
    
    # Disease/pest information
    disease_pest: Optional[DiseasePestMetadata] = Field(None, description="Disease or pest details")
    
    # Treatment information
    treatment: Optional[TreatmentMetadata] = Field(None, description="Treatment and remedies")
    
    # Agronomic practices
    agronomy: Optional[AgronomicMetadata] = Field(None, description="Agronomic practices")
    
    # Source and verification
    source: SourceMetadata = Field(..., description="Source and verification info")
    
    # Search/retrieval metadata
    tags: List[str] = Field(default_factory=list, description="Searchable tags")
    keywords: List[str] = Field(default_factory=list, description="Keywords for search")
    search_boost: float = Field(default=1.0, ge=0.0, le=10.0, description="Search ranking boost")
    
    # Additional metadata
    related_documents: List[str] = Field(default_factory=list, description="IDs of related documents")
    attachments: List[str] = Field(default_factory=list, description="URLs of images/videos")
    
    class Config:
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "id": "rice_blast_tnau_001",
                "type": "disease",
                "language": "en",
                "crop": {
                    "name": "Rice",
                    "scientific_name": "Oryza sativa",
                    "tamil_name": "நெல்",
                    "english_name": "Rice",
                    "category": "cereal",
                    "aliases": ["paddy", "dhan", "chawal"]
                },
                "location": {
                    "district": "Coimbatore",
                    "state": "Tamil Nadu",
                    "climate": "semi-arid",
                    "season": "kharif"
                },
                "disease_pest": {
                    "name": "Blast Disease",
                    "tamil_name": "வெடிப்பு நோய்",
                    "scientific_name": "Magnaporthe oryzae",
                    "type": "disease",
                    "pathogen": "Fungus",
                    "severity": "very_high",
                    "symptoms": [
                        "Diamond-shaped lesions on leaves",
                        "Gray center with brown margins",
                        "Neck blast causing panicle drop"
                    ],
                    "affected_stages": ["vegetative", "flowering"]
                },
                "treatment": {
                    "organic_remedies": [
                        "Neem oil spray @ 5ml/liter",
                        "Trichoderma seed treatment"
                    ],
                    "chemical_remedies": [
                        "Tricyclazole 75% WP @ 0.6g/liter"
                    ],
                    "ipm_practices": [
                        "Use resistant varieties",
                        "Balanced fertilization"
                    ]
                },
                "source": {
                    "organization": "Tamil Nadu Agricultural University",
                    "reference_url": "https://tnau.ac.in",
                    "is_verified": True,
                    "confidence_score": 0.95
                },
                "tags": ["rice", "disease", "blast", "fungal"],
                "keywords": ["rice blast", "neck blast", "leaf blast", "Magnaporthe"]
            }
        }


# ═══════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def validate_document_metadata(metadata_dict: Dict[str, Any]) -> AgriculturalDocumentMetadata:
    """
    Validate and parse document metadata.
    
    Args:
        metadata_dict: Raw metadata dictionary
        
    Returns:
        Validated AgriculturalDocumentMetadata instance
        
    Raises:
        ValidationError: If metadata is invalid
    """
    return AgriculturalDocumentMetadata(**metadata_dict)


def create_disease_metadata(
    disease_id: str,
    disease_name: str,
    crop_name: str,
    symptoms: List[str],
    organic_remedies: List[str],
    chemical_remedies: List[str],
    source_org: str = "Tamil Nadu Agricultural University",
    **kwargs
) -> AgriculturalDocumentMetadata:
    """
    Helper function to create disease document metadata.
    
    Args:
        disease_id: Unique disease ID
        disease_name: Disease name
        crop_name: Affected crop
        symptoms: List of symptoms
        organic_remedies: Organic treatment methods
        chemical_remedies: Chemical treatments
        source_org: Source organization
        **kwargs: Additional metadata fields
        
    Returns:
        Complete AgriculturalDocumentMetadata instance
    """
    return AgriculturalDocumentMetadata(
        id=disease_id,
        type="disease",
        crop=CropMetadata(
            name=crop_name,
            scientific_name=kwargs.get('scientific_name', ''),
            tamil_name=kwargs.get('tamil_name'),
            category=kwargs.get('category', 'cereal'),
            aliases=kwargs.get('aliases', [])
        ),
        disease_pest=DiseasePestMetadata(
            name=disease_name,
            tamil_name=kwargs.get('disease_tamil_name'),
            type="disease",
            severity=kwargs.get('severity', 'medium'),
            symptoms=symptoms
        ),
        treatment=TreatmentMetadata(
            organic_remedies=organic_remedies,
            chemical_remedies=chemical_remedies,
            ipm_practices=kwargs.get('ipm_practices', []),
            preventive_measures=kwargs.get('prevention', [])
        ),
        source=SourceMetadata(
            organization=source_org,
            is_verified=kwargs.get('verified', False),
            confidence_score=kwargs.get('confidence', 0.9)
        ),
        tags=kwargs.get('tags', []),
        keywords=kwargs.get('keywords', [])
    )
