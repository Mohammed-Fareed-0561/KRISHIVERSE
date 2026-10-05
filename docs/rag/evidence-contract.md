# Common Evidence Contract (Phase 3C, logical — implementations NOT merged)

Both stacks already produce these fields; the contract names them so future
work (and the joint benchmark) can compare apples to apples.

```json
{
  "id": "dp_tomato_early_blight | (stack-b: absent — see below)",
  "text": "displayable evidence text (method/description/answer snippet)",
  "crop": "tomato | null",
  "disease": "dp_tomato_early_blight | null",
  "topic": "disease | symptom | treatment | prevention | general | ...",
  "language": "en | ta | hi | tanglish (query language, not evidence language)",
  "source": "institution name | null",
  "sourceUrl": "https://… | null",
  "sourceOrganization": "TNAU | ICAR | … | null (canonical; stack B nests this under source.organization)",
  "verified": "boolean, strict: true ONLY with explicit flag (+ source+URL required downstream)",
  "score": "number | null (rank score / similarity / confidence — NOT calibrated, NOT comparable across stacks)"
}
```

## Stack A (frontend) mapping today

`fastSearch` record + `_type/_crop/_sourcePriority/_verified` → id/text/crop
(from `_crop`)/disease (record id)/topic (from `_type`)/language (query lang)/
source/sourceUrl/verified (record fields)/score (rank score). Complete except
`sourceOrganization` (no canonical field — derive from source string only).

## Stack B (Python service) mapping today

`/rag/ask` → answer/confidence/sources_used[{type, similarity}]. Gaps vs the
contract: **no per-evidence ids or text** (sources_used carries only type +
similarity), `source.organization` nested without `reference_url`
(`document_id` also null), `verified:true` self-claimed per item without
traceable references. Under Stack A semantics these items are UNVERIFIED
(flag + source + URL required). The joint benchmark therefore scores B on
entity mentions, not evidence ids.

## Scores are not comparable

A rank scores (hit counts + boosts) and B cosine similarities/confidences live
on different scales with different thresholds (A: none/0.45 usability;
B service 0.5; Node gate 0.6). Never average, rank, or fuse them without a
calibration study (none exists).
