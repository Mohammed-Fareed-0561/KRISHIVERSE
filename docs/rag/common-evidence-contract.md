# Common Evidence Contract

## Purpose

Define a common evidence result contract that both Stack A (frontend) and Stack B (backend) can produce. This is a logical contract only — Stack A/B implementations are not merged.

Phase 3D revision: added `region` (12th field) and updated both stack mappings now that `sourceOrganization` and `region` exist in the KB/evidence schema.

## Contract Schema (12 fields)

```json
{
  "id": "string — unique record identifier",
  "text": "string — the evidence text content",
  "crop": "string | null — crop identifier (e.g., 'RICE', 'COTTON')",
  "disease": "string | null — disease identifier",
  "topic": "string — topic category (e.g., 'disease', 'treatment', 'fertilizer')",
  "language": "string — language code (e.g., 'en', 'ta', 'hi')",
  "source": "string | null — source name (e.g., 'TNAU', 'ICAR')",
  "sourceUrl": "string | null — source URL",
  "sourceOrganization": "string | null — source organization (e.g., 'Tamil Nadu Agricultural University')",
  "region": "string | null — geographic region of applicability (e.g., 'Tamil Nadu')",
  "verified": "boolean — whether the record is verified",
  "score": "number — relevance score from retrieval"
}
```

## Field Requirements

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Yes | Must match KB record ID |
| `text` | Yes | Must be non-empty |
| `crop` | No | Null if not applicable |
| `disease` | No | Null if not applicable |
| `topic` | Yes | Must be a valid topic category |
| `language` | Yes | Must be a valid language code |
| `source` | No | Null if no provenance |
| `sourceUrl` | No | Null if no provenance |
| `sourceOrganization` | No | Null if not explicitly provided; never inferred |
| `region` | No | Null if not explicitly provided; never inferred |
| `verified` | Yes | Must be boolean |
| `score` | Yes | Must be number >= 0 |

## Stack A (Frontend / offline IndexedDB) Mapping

```javascript
// From IndexedDBChatbotEngine.js fastSearch results
{
  id: record.id,
  text: record.name || record.description || record.action,
  crop: record.cropId,
  disease: record.diseaseId,
  topic: record.recordKind,
  language: record.languages?.en ? 'en' : 'ta',
  source: record.source ?? null,
  sourceUrl: record.sourceUrl ?? null,
  sourceOrganization: record.sourceOrganization ?? null,
  region: record.region ?? null,
  verified: record.verified === true,
  score: hit.score,
}
```

## Stack B (Backend RAG) Mapping

Stack B stores provenance with different key names. The logical mapping:

```python
# From rag_service/rag_engine.py search results (result['metadata'])
{
  "id": meta.get("id"),
  "text": content,
  "crop": meta.get("crop", {}).get("name"),
  "disease": meta.get("disease_pest", {}).get("name"),
  "topic": meta.get("type"),
  "language": meta.get("language", "en"),
  "source": meta.get("source_organization"),
  "sourceUrl": meta.get("source", {}).get("reference_url"),
  "sourceOrganization": meta.get("source_organization") or meta.get("source", {}).get("organization"),
  "region": meta.get("location", {}).get("state"),
  "verified": meta.get("source", {}).get("is_verified") is True,
  "score": hit.get("similarity", 0.0),
}
```

Key-name translations (logical equivalence, no implementation merge):

| Contract field | Stack A key | Stack B key |
|----------------|-------------|-------------|
| `sourceOrganization` | `sourceOrganization` | `source_organization` / `source.organization` |
| `region` | `region` | `location.state` |
| `verified` | `verified` | `source.is_verified` |

## Provenance Rules

1. `verified` must only be `true` when `source` and `sourceUrl` are both present (unchanged from Phase 3C/3D rules)
2. `sourceOrganization` and `region` are optional — null when unknown, never inferred, never a factor in `verified`
3. Quarantined records must not appear in results
4. Chemical dosages without full provenance must be blocked by ResponseValidator

## Status

Phase 3D: contract extended to 12 fields. Both stacks can expose the same logical fields. No Stack A/B implementation merge.
