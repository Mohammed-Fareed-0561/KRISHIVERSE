#!/usr/bin/env python3
"""
Data Migration Script: Convert existing disease data to new metadata schema
Converts all_crop_diseases.json to enhanced format with AgriculturalDocumentMetadata
"""
import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Windows consoles default to cp1252 which can't encode emoji/Devanagari/Tamil
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass

from schemas import (
    create_disease_metadata,
    CropCategory,
    Season,
    ClimateType,
    Severity,
    GrowthStage
)


# Crop to category mapping
CROP_CATEGORIES = {
    "rice": CropCategory.CEREAL,
    "wheat": CropCategory.CEREAL,
    "tomato": CropCategory.VEGETABLE,
    "potato": CropCategory.VEGETABLE,
    "chili": CropCategory.VEGETABLE,
    "chilli": CropCategory.VEGETABLE,
    "cotton": CropCategory.FIBER,
    "sugarcane": CropCategory.PLANTATION,
    "mango": CropCategory.FRUIT,
    "banana": CropCategory.FRUIT,
}

# Crop to season mapping (Tamil Nadu context)
CROP_SEASONS = {
    "rice": [Season.KHARIF, Season.RABI],
    "wheat": [Season.RABI],
    "tomato": [Season.KHARIF, Season.RABI],
    "cotton": [Season.KHARIF],
    "sugarcane": [Season.PERENNIAL],
}

# Severity mapping based on disease impact
DISEASE_SEVERITY = {
    "blast": Severity.HIGH,
    "blight": Severity.HIGH,
    "rust": Severity.MEDIUM,
    "wilt": Severity.HIGH,
    "rot": Severity.MEDIUM,
    "spot": Severity.MEDIUM,
    "mosaic": Severity.HIGH,
    "leaf curl": Severity.MEDIUM,
}


def determine_severity(disease_name: str) -> str:
    """Determine disease severity from name."""
    disease_lower = disease_name.lower()
    
    for keyword, severity in DISEASE_SEVERITY.items():
        if keyword in disease_lower:
            return severity.value
    
    return Severity.MEDIUM.value  # Default


def migrate_disease(disease: Dict[str, Any]) -> Dict[str, Any]:
    """
    Migrate a single disease record to new schema.
    
    Args:
        disease: Old format disease record
        
    Returns:
        New format with AgriculturalDocumentMetadata
    """
    crop_name = disease.get("crop", "unknown")
    disease_name = disease.get("name", "Unknown Disease")
    disease_id = disease.get("id", crop_name + "_disease")
    
    # Extract treatments
    organic_treatments = disease.get("organicTreatment", [])
    chemical_treatments = disease.get("chemicalTreatment", [])
    symptoms = disease.get("symptoms", [])
    prevention_methods = disease.get("prevention", [])
    
    # Build comprehensive text for embedding
    text_content = f"""
Disease: {disease_name}
Tamil Name: {disease.get('nameTamil', 'N/A')}
Hindi Name: {disease.get('nameHindi', 'N/A')}
Crop: {crop_name.title()}
Pathogen: {disease.get('pathogen', 'Unknown')}

Symptoms:
{chr(10).join('• ' + s for s in symptoms)}

Organic Treatment:
{chr(10).join('• ' + t for t in organic_treatments)}

Chemical Treatment:
{chr(10).join('• ' + t for t in chemical_treatments)}

Prevention:
{chr(10).join('• ' + p for p in prevention_methods)}

Favorable Conditions:
{disease.get('favorableConditions', 'Not specified')}

Integrated Pest Management:
{disease.get('ipm', 'Not specified')}
""".strip()
    
    # Create metadata using helper function, then flatten to a plain dict
    metadata_model = create_disease_metadata(
        disease_id=disease_id,
        disease_name=disease_name,
        crop_name=crop_name,
        symptoms=symptoms,
        organic_remedies=organic_treatments,
        chemical_remedies=chemical_treatments,
        source_org="TNAU",  # Tamil Nadu Agricultural University
        verified=True,
        confidence=0.95  # High confidence for TNAU data
    )
    metadata = metadata_model.model_dump()
    
    # Add additional flat fields (kept for downstream consumers)
    metadata.update({
        "text": text_content,
        "disease_name": disease_name,
        "crop_name": crop_name,
        "crop_category": CROP_CATEGORIES.get(crop_name.lower(), CropCategory.CEREAL).value,
        "season": [s.value for s in CROP_SEASONS.get(crop_name.lower(), [Season.PERENNIAL])],
        "climate": [ClimateType.TROPICAL.value, ClimateType.SUBTROPICAL.value],  # Tamil Nadu
        "severity": determine_severity(disease_name),
        "symptoms": symptoms,
        "organic_remedies": organic_treatments,
        "chemical_remedies": chemical_treatments,
        "pathogen": disease.get("pathogen", "Unknown"),
        "favorable_conditions": disease.get("favorableConditions", ""),
        "prevention_methods": prevention_methods,
        "ipm_strategy": disease.get("ipm", ""),
        "name_tamil": disease.get("nameTamil", ""),
        "name_hindi": disease.get("nameHindi", ""),
        "crop_aliases": disease.get("cropAliases", []),
        "source_organization": "TNAU",
        "verified": True,
        "confidence": 0.95,
        "migrated_from": "all_crop_diseases.json",
        "migration_date": datetime.now().isoformat()
    })
    
    return metadata


def json_default(obj):
    """JSON serializer for non-serializable objects (e.g. datetime)."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)


def migrate_all_diseases(
    input_file: Path,
    output_file: Path
) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Migrate all diseases from old format to new.
    
    Args:
        input_file: Path to old format JSON
        output_file: Path to save new format JSON
        
    Returns:
        Tuple of (migrated_data, statistics)
    """
    print(f"🔄 Starting migration from {input_file.name}")
    
    # Load old data
    with open(input_file, 'r', encoding='utf-8') as f:
        old_data = json.load(f)
    
    print(f"📚 Found {len(old_data)} diseases to migrate")
    
    # Migrate each disease
    migrated_data = []
    stats = {
        "total": len(old_data),
        "successful": 0,
        "failed": 0,
        "crops": set(),
        "categories": set(),
        "errors": []
    }
    
    for disease in old_data:
        try:
            migrated = migrate_disease(disease)
            migrated_data.append(migrated)
            stats["successful"] += 1
            stats["crops"].add(migrated["crop_name"])
            stats["categories"].add(migrated["crop_category"])
            
            print(f"  ✅ Migrated: {disease['name']}")
            
        except Exception as e:
            stats["failed"] += 1
            error_msg = f"Failed to migrate {disease.get('name', 'unknown')}: {e}"
            stats["errors"].append(error_msg)
            print(f"  ❌ {error_msg}")
    
    # Convert sets to lists for JSON serialization
    stats["crops"] = sorted(list(stats["crops"]))
    stats["categories"] = sorted(list(stats["categories"]))
    
    # Save migrated data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(migrated_data, f, indent=2, ensure_ascii=False, default=json_default)
    
    print(f"\n✅ Migration complete!")
    print(f"   Saved to: {output_file}")
    print(f"   Successful: {stats['successful']}/{stats['total']}")
    print(f"   Failed: {stats['failed']}")
    print(f"   Crops: {', '.join(stats['crops'])}")
    print(f"   Categories: {', '.join(stats['categories'])}")
    
    # Save statistics
    stats_file = output_file.parent / "migration_stats.json"
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False, default=json_default)
    
    print(f"   Statistics saved to: {stats_file}")
    
    return migrated_data, stats


def main():
    """Run migration."""
    print("\n" + "="*60)
    print("🌾 KRISHIVERSE DISEASE DATA MIGRATION")
    print("="*60)
    print("Converting to Production-Grade Metadata Schema")
    print("="*60 + "\n")
    
    # Define paths
    script_dir = Path(__file__).parent
    data_dir = script_dir / "data"
    
    input_file = data_dir / "all_crop_diseases.json"
    output_file = data_dir / "all_crop_diseases_v2.json"
    
    # Verify input file exists
    if not input_file.exists():
        print(f"❌ Error: Input file not found: {input_file}")
        return 1
    
    # Backup old file
    backup_file = data_dir / "all_crop_diseases_backup.json"
    if not backup_file.exists():
        import shutil
        shutil.copy2(input_file, backup_file)
        print(f"📦 Created backup: {backup_file.name}\n")
    
    try:
        # Run migration
        migrated_data, stats = migrate_all_diseases(input_file, output_file)
        
        # Show sample
        print("\n" + "="*60)
        print("📋 SAMPLE MIGRATED RECORD (first disease)")
        print("="*60)
        if migrated_data:
            sample = migrated_data[0]
            print(f"\nDisease: {sample['disease_name']}")
            print(f"Crop: {sample['crop_name']} ({sample['crop_category']})")
            print(f"Severity: {sample['severity']}")
            print(f"Symptoms: {len(sample['symptoms'])} listed")
            print(f"Organic Remedies: {len(sample['organic_remedies'])} listed")
            print(f"Chemical Remedies: {len(sample['chemical_remedies'])} listed")
            print(f"Source: {sample['source_organization']}")
            print(f"Verified: {sample['verified']}")
            print(f"Confidence: {sample['confidence']}")
        
        print("\n" + "="*60)
        print("🎯 NEXT STEPS")
        print("="*60)
        print("\n1. Review migrated data:")
        print(f"   - Open: {output_file}")
        print(f"   - Check: {data_dir / 'migration_stats.json'}")
        print("\n2. Update RAG engine to use new file:")
        print("   - Edit config.py: crop_diseases_file = 'all_crop_diseases_v2.json'")
        print("\n3. Rebuild vector store:")
        print("   - Start RAG service: python app.py")
        print("   - Call rebuild: POST http://localhost:8000/rag/rebuild")
        print("\n4. Test enhanced search:")
        print("   - Run: python test_enhanced.py")
        print("   - Or use API: POST http://localhost:8000/rag/ask")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
