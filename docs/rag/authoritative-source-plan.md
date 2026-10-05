# Authoritative Source Plan (Phase 3C — plan only, no ingestion)

Controlled, review-gated ingestion. No automatic bulk download. Every batch:
dry-run → human review of the ingestion report → explicit approval → import.
`verified:true` is accepted ONLY from these classes with a traceable
reference (URL or document id); everything else enters unverified.

## Source classes

### TNAU (Tamil Nadu Agricultural University)
- Content: crop production guides, pest/disease management, varieties.
- Provenance: source="TNAU", sourceUrl=<agritech.tnau.ac.in page>, verified
  only with agronomist sign-off recorded in verifiedBy/verifiedDate.
- Format: curated JSON (preferred) or headed markdown; crop/disease names as
  in the KB registry. Language: EN + TA where published; record missing
  translations via enrichmentRequired, never machine-fill.
- Coverage: start rice/tomato/chilli (existing curated core), expand by crop.

### ICAR (institutes + KVKs)
- Content: package of practices, pest alerts, variety releases.
- Provenance: source="ICAR <institute>", sourceUrl=<icar.gov.in page>.
  KVK items: source="KVK <name>". Language: EN/HI mostly; TA where available.

### Tamil Nadu agriculture / state sources
- Content: state schemes, season advisories, district alerts.
- Provenance: source="TN Agri Dept", sourceUrl=<tnagrisnet page>. Schemes
  additionally keep application pointers (URLs), never invented amounts —
  amounts require the source page revision/date in notes.

### Government agricultural sources (Centre)
- Content: PM-KISAN/PMFBY/KCC norms, MSP, IMD agro-advisories.
- Provenance: source="Government of India <scheme>", sourceUrl=<official
  .gov.in page>. Dynamic figures (rates, deadlines) carry lastUpdated and a
  re-verify interval; stale figures are removed, not guessed.

## Per-batch review requirement (mandatory)

1. `npm run kb:ingest -- --source <dir> --source-name "<Name>" --dry-run`.
2. Reviewer checks: 0 invalid0304 unexpected; dedup reviewReport empty or
   adjudicated; high-risk list contains ONLY provenance-complete dosages;
   source/sourceUrl present on every record claimed verified.
3. Known pipeline gaps to watch (see `authoritative-ingestion.md`): UPPERCASE
   id warnings, ASCII-only markdown keys, naive CSV commas, single-quote
   interpolation bug in the report line (cosmetic).
4. Approval recorded (who/when/source-revision) before any write path is
   ever built. No write path exists today by design.
