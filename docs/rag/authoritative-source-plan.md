# Authoritative Source Plan

## Purpose

Define a controlled ingestion plan for expanding the active KB with authoritative agricultural data. No automatic bulk download.

## Source Classes

### 1. TNAU (Tamil Nadu Agricultural University)

| Attribute | Value |
|-----------|-------|
| **URL** | [agritech.tnau.ac.in](https://agritech.tnau.ac.in) |
| **Content** | Crop cultivation practices, disease management, pest control, fertilizer recommendations |
| **Allowed provenance** | `source: "TNAU"`, `sourceUrl: <specific page URL>` |
| **Ingestion format** | Markdown (structured documents) |
| **Review requirement** | Expert review before `verified: true` |
| **Language** | English, Tamil |
| **Crop/topic coverage** | All major Tamil Nadu crops (rice, cotton, sugarcane, groundnut, etc.) |

### 2. ICAR (Indian Council of Agricultural Research)

| Attribute | Value |
|-----------|-------|
| **URL** | [icar.gov.in](https://icar.gov.in) |
| **Content** | Research-based agricultural practices, variety recommendations, pest/disease management |
| **Allowed provenance** | `source: "ICAR"`, `sourceUrl: <specific publication URL>` |
| **Ingestion format** | Markdown or JSON (structured publications) |
| **Review requirement** | Expert review before `verified: true` |
| **Language** | English, Hindi |
| **Crop/topic coverage** | National coverage, all major crops |

### 3. KVK (Krishi Vigyan Kendra)

| Attribute | Value |
|-----------|-------|
| **URL** | [kvk.icar.gov.in](https://kvk.icar.gov.in) |
| **Content** | District-specific agricultural advisories, soil health, weather-based recommendations |
| **Allowed provenance** | `source: "KVK"`, `sourceUrl: <specific KVK page URL>` |
| **Ingestion format** | Markdown |
| **Review requirement** | Expert review before `verified: true` |
| **Language** | English, Tamil, Telugu, Kannada, Hindi |
| **Crop/topic coverage** | District-specific, localized recommendations |

### 4. Government Agricultural Sources

| Attribute | Value |
|-----------|-------|
| **Examples** | PMKSY, PM-KISAN, Soil Health Card, AGMARK |
| **Content** | Scheme details, subsidy information, market prices, policy updates |
| **Allowed provenance** | `source: "GovtOfIndia"`, `sourceUrl: <specific scheme page URL>` |
| **Ingestion format** | JSON (structured scheme data) |
| **Review requirement** | Policy expert review before `verified: true` |
| **Language** | English, Hindi, Tamil |
| **Crop/topic coverage** | All government agricultural schemes |

## Ingestion Workflow

```
1. Source Identification
   └─> Identify specific authoritative document/page

2. Document Preparation
   └─> Convert to Markdown or JSON with proper structure
   └─> Include source, sourceUrl in front matter or metadata

3. Dry-Run Ingestion
   └─> Run kb-ingest.mjs --dry-run
   └─> Review report for validation errors/warnings

4. Expert Review
   └─> Domain expert reviews all records
   └─> Verify factual accuracy against source
   └─> Approve or reject each record

5. Provenance Assignment
   └─> Set verified: true ONLY for expert-approved records
   └─> Ensure source + sourceUrl are present and valid

6. KB Update
   └─> Merge approved records into KB v2
   └─> Run full test suite
   └─> Update manifest
```

## Review Requirements

- **Who**: Domain expert (agricultural scientist, KVK scientist, or TNAU/ICAR researcher)
- **What**: Verify factual accuracy, check for outdated information, confirm dosages
- **When**: Before any record is marked `verified: true`
- **How**: Document review with sign-off

## Language Priority

1. Tamil (primary — largest user base)
2. English (secondary — widely understood)
3. Telugu, Kannada, Hindi (tertiary — regional coverage)

## Crop Priority

1. Rice (largest cultivated area in Tamil Nadu)
2. Cotton (major cash crop)
3. Sugarcane (major cash crop)
4. Groundnut (major oilseed)
5. All other crops (progressive coverage)

## Constraints

- No automatic bulk download
- No web scraping without explicit permission
- No fabrication of agricultural data
- No fabrication of provenance
- No marking records verified from model confidence
- No mass-ingest of uncontrolled web data
