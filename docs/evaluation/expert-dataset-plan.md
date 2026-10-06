# Expert Dataset Plan

## Purpose

Define a plan for creating expert-labelled datasets for evaluation. No fake labels — expert-only ground truth.

## Dataset 1: Chatbot Intent Dataset

### Overview
Evaluate the chatbot's ability to correctly identify user intents and provide accurate agricultural advice.

### Label Format
```json
{
  "id": "intent_001",
  "text": "எந்த மண் நிலையில் பருத்தி பயிர் செய்யலாம்?",
  "language": "ta",
  "intent": "cultivation_advice",
  "crop": "cotton",
  "topic": "soil_requirement",
  "expectedKBIds": ["crop_cotton_001"],
  "annotator": "expert_001",
  "verified": true
}
```

### Annotator Requirements
- Agricultural scientist or KVK scientist
- Fluent in the label language (Tamil, English, Telugu, Kannada, Hindi)
- Minimum 5 years field experience

### Disagreement Handling
- Two annotators label independently
- Third annotator adjudicates disagreements
- Unresolvable cases are excluded

### Split
- Training: 60%
- Validation: 20%
- Test: 20%

### Size Target
- 500 cases per language
- 2,500 total cases

## Dataset 2: Symptom-to-Disease Dataset

### Overview
Evaluate the system's ability to correctly identify diseases from symptom descriptions.

### Label Format
```json
{
  "id": "sym_001",
  "symptoms": ["yellowing of leaves", "brown spots", "stunted growth"],
  "crop": "rice",
  "language": "en",
  "expectedDiseases": ["blast", "bacterial_leaf_blight"],
  "expectedKBIds": ["dp_rice_blast_001", "dp_rice_blb_001"],
  "annotator": "expert_001",
  "verified": true
}
```

### Annotator Requirements
- Plant pathologist or agricultural entomologist
- Disease diagnosis experience
- Fluent in the label language

### Split
- Training: 60%
- Validation: 20%
- Test: 20%

### Size Target
- 300 cases per crop
- 3,000 total cases (10 major crops)

## Dataset 3: Crop Doctor Image Dataset

### Overview
Evaluate the image-based disease detection model.

### Label Format
```json
{
  "id": "img_001",
  "imagePath": "dataset/images/rice_blast_001.jpg",
  "crop": "rice",
  "disease": "blast",
  "severity": "moderate",
  "language": "en",
  "annotator": "expert_001",
  "verified": true
}
```

### Annotator Requirements
- Plant pathologist with image diagnosis experience
- Access to lab confirmation for ambiguous cases

### Privacy
- No personally identifiable information
- Farmer consent required for field images
- Location data anonymized

### Split
- Training: 70%
- Validation: 15%
- Test: 15%

### Size Target
- 500 images per disease
- 5,000 total images (10 major diseases)

## Dataset 4: Laya Decision Dataset

### Overview
Evaluate the Laya decision engine (currently OFF — dataset prepared for future use).

### Label Format
```json
{
  "id": "laya_001",
  "crop": "tomato",
  "growthStage": "flowering",
  "symptoms": ["leaf curl", "yellowing"],
  "weather": "humid",
  "expectedDecision": "monitor",
  "expectedKBIds": ["dp_tomato_lcv_001"],
  "annotator": "expert_001",
  "verified": true
}
```

### Annotator Requirements
- Agricultural scientist with decision support experience
- Understanding of integrated pest management

### Split
- Training: 60%
- Validation: 20%
- Test: 20%

### Size Target
- 200 cases per crop
- 2,000 total cases (10 major crops)

## Provenance

All datasets must include:
- Source of the case (field observation, lab diagnosis, literature)
- Annotator identity (anonymized)
- Date of annotation
- Verification status

## Privacy

- No personally identifiable information
- No exact GPS coordinates (district-level only)
- Farmer consent for field images
- Compliance with data protection regulations

## Timeline

| Phase | Duration | Output |
|-------|----------|--------|
| Dataset 1 (Chatbot) | 4 weeks | 2,500 labelled cases |
| Dataset 2 (Symptom) | 6 weeks | 3,000 labelled cases |
| Dataset 3 (Image) | 8 weeks | 5,000 labelled images |
| Dataset 4 (Laya) | 4 weeks | 2,000 labelled cases |

## Constraints

- No fake labels
- Expert-only ground truth
- No model-generated labels
- No crowd-sourced labels without expert verification
