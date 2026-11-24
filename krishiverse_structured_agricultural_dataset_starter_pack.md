# Krishiverse: Structured Agricultural Dataset Starter Pack

This starter pack contains the JSON structure and implementation boilerplate for all 20 requirements.

## 1. Requirement-Driven JSON Schemas (Req 1-13)

```json
{
  "req1_crops": {
    "id": "rice_01",
    "name": "Rice",
    "growth_stages": ["nursery", "vegetative", "ripening"]
  },
  "req2_symptoms": {
    "id": "sym_01",
    "name": "Blast Lesions",
    "part": "Leaf",
    "description": "Diamond shaped spots"
  },
  "req3_diseases": {
    "id": "dis_01",
    "name": "Leaf Blast",
    "causal_agent": "Magnaporthe oryzae",
    "symptom_ids": ["sym_01"]
  },
  "req4_treatments": {
    "id": "tr_01",
    "target": "dis_01",
    "bio": "Pseudomonas fluorescens",
    "chem": "Tricyclazole"
  },
  "req5_weather_risk": {
    "disease_id": "dis_01",
    "triggers": { "humidity": ">90%", "temp": "25-28C" }
  },
  "req6_market": {
    "crop_id": "rice_01",
    "indicators": { "demand": "High", "supply": "Low" }
  },
  "req7_schemes": {
    "id": "tn_agri_01",
    "name": "Crop Insurance",
    "state": "Tamil Nadu"
  },
  "req8_tamil": {
    "scientific_id": "rice_01",
    "common": "நெல்",
    "variants": ["சம்பா", "குறுவை"]
  },
  "req9_safety": {
    "chemical": "Monocrotophos",
    "status": "BANNED",
    "hazard": "Very High"
  },
  "req10_growth": {
    "crop_id": "rice_01",
    "stage": "Flowering",
    "needs": ["Water", "Potash"]
  },
  "req11_soil": {
    "pref": "Heavy Clay/Loam",
    "ph": "5.5 - 6.5"
  },
  "req12_irrigation": {
    "method": "Flooding/Alternate Wetting Drying",
    "interval": "3-5 days"
  },
  "req13_timeline": {
    "farm_id": "plot_72",
    "logs": [ { "date": "2026-05-11", "action": "Sowing" } ]
  }
}
```

## 2. Sync & Intelligence Boilerplate (Req 14-20)

### Req 15: Embedding Pipeline (Client-Side)
```javascript
async function generateAgriculturalContext(row) {
  // Requirement 16: Normalization (Denormalized context)
  return `Crop: ${row.crop_name}. Symptom: ${row.symptom_desc}. Stage: ${row.stage}. Treatment: ${row.treatment}`;
}
```

### Req 18 & 19: Versioning & Sync Logic
```javascript
const CURRENT_MANIFEST = {
  version: "2.1.0",
  datasets: {
    crops: "v1.2",
    diseases: "v3.4"
  }
};

async function syncDataset(datasetName) {
  const localVersion = await db.meta.get(datasetName);
  const diff = await fetch(`/api/sync/${datasetName}?from=${localVersion}`);
  // Apply JSON Patch (Req 19)
  return applyPatch(localData, diff);
}
```

### Req 20: Storage Estimates
Initial app load includes:
- **Core Library**: `crops.json` (0.5MB), `safety.json` (0.2MB), `tamil_map.json` (0.3MB).
- **Total Bundle**: **~1MB** for primary interactions.
- **Secondary Download**: Extended `disease_vectors.bin` (20MB+).
