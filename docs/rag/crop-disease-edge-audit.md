# Crop-Disease Edge Audit

## Summary

Analysis of 1,971 crop-less disease records in `diseasePests.json`.

| Metric | Count |
|--------|-------|
| Total disease/pest records | 3,002 |
| With cropId | 1,031 |
| Without cropId | 1,971 |

## Classification of Crop-less Records

| Category | Description | Count |
|----------|-------------|-------|
| **A** | Authoritative source explicitly identifies crop | **0** |
| **B** | Existing curated relationship establishes crop | **0** |
| **C** | Ambiguous (some info, not definitive) | **0** |
| **D** | Synthetic / Quarantined | **1,971** |

## Key Finding

**All 1,971 crop-less records are Category D (synthetic/quarantined).**

Every crop-less record has:
- `recordKind: "synthetic"`
- `status: "quarantined"`
- `source: null`
- `sourceUrl: null`
- No curated edge to any crop in `edges.json`

The 1,031 records WITH cropId have a perfect 1:1 correspondence with curated edges linking to crops.

## Examples (Category D)

| # | ID | Name | Source | CropId | RecordKind | Status |
|---|-----|------|--------|--------|------------|--------|
| 1 | `disease_0` | Mealybug 0 | null | null | synthetic | quarantined |
| 2 | `disease_2` | Blight 2 | null | null | synthetic | quarantined |
| 3 | `disease_4` | Aphids 4 | null | null | synthetic | quarantined |
| 4 | `disease_5` | Root Rot 5 | null | null | synthetic | quarantined |
| 5 | `disease_6` | Thrips 6 | null | null | synthetic | quarantined |

## Conclusion

The crop-less problem is entirely contained within the synthetic/quarantined dataset. No legitimate curated records are missing cropId. The quarantine mechanism is working as intended — synthetic records are properly isolated from agricultural recommendations.

**No mass-editing is justified.** Any crop assignment for these records would require authoritative evidence that does not currently exist in the KB.
