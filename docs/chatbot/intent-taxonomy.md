# Intent Taxonomy (Phase 2)

## Before (8 intents)

`disease` (catch-all default), `fertilizer`, `scheme`, `weather`, `price`,
`cultivation`, `about`, `unknown`. Single flat keyword lists, raw substring
matching, disease-first tie-break. Measured gaps: `help`→scheme, pure
Tamil/Hindi→unknown, `तना`⊂`कितना`, no what-is consistency.

## After (12 canonical intents)

| Intent | Meaning | Handler (answerFreeText) |
|---|---|---|
| `greeting` | hello/vanakkam/namaste | shared capabilities (`buildAboutResponse`) |
| `help` | bare help requests | shared capabilities (`buildAboutResponse`) |
| `about` | capabilities/self questions | `buildAboutResponse` |
| `what_is` | definitions ("what is X") | KB search fall-through (crop/disease/crop-info) |
| `disease` | symptoms/diagnosis/pest reports | disease path |
| `treatment` | how to treat/cure/prevent | disease path (finds disease + treatments) |
| `fertilizer` | nutrients/dosage questions | `buildFertilizerResponse` |
| `scheme` | government schemes/subsidies | `buildSchemeResponse` |
| `weather` | weather/forecast | `buildWeatherResponse` |
| `price` | mandi/market prices | `buildPriceResponse` |
| `cultivation` | growing practices | `buildCultivationResponse` |
| `unknown` | no signal | fallback |

## Requested names → resolution (no naming-only intents)

- SYMPTOM ≡ `disease` + `parsed.symptom` slot (aliases already TA/HI-covered).
- DIAGNOSIS ≡ `disease`.
- PEST ≡ `disease` + pest symptom slot.
- PREVENTION ≡ `treatment` (disease-management advice; responses already carry
  prevention sections).
- GENERAL_AGRICULTURE ≡ `cultivation` (existing handler).
- New intents (`greeting`, `help`, `what_is`, `treatment`) have no equivalent:
  `about` is self-description, not a help request; nothing distinguished
  definitions; nothing distinguished advice-seeking from symptom-reporting.

## Matching rules (all in `AgriculturalNLP.classifyIntent`)

1. Phrases (multi-word/anchored, weight 2) matched with separator boundaries
   (`[^L\N]` both sides, unicode-aware) — never raw substring.
2. Single keywords: Latin (len ≥ 3) legacy substring (plurals: prices→price);
   Latin (len < 3, e.g. `hi`) token-exact; non-Latin token prefix/exact
   (Tamil plurals புள்ளிகள்→புள்ளி; Devanagari exact blocks तना⊂कितना).
3. Tie-break order: greeting, help, about, what_is, treatment, disease,
   fertilizer, scheme, weather, price, cultivation (advice-seeking and
   meta intents win ties; `help` can no longer lose to `scheme`).
4. Stop-word note: `help` is a stop-word for retrieval but NOT for intent
   (intent runs on raw text + phrases first).
5. Fuzzy slots: crop aliases accept edit distance ≤ 1, symptom aliases ≤ 2.
   A false crop misroutes diagnosis and suppresses clarification (observed:
   "look" → "aloo"/potato at distance 2); a wrong symptom only adds context.

## Multilingual coverage (same alias architecture, no second system)

EN + Tamil + Hindi + Tanglish/romanized keywords for greeting/help/what_is/
disease/treatment/fertilizer/scheme/weather/price/cultivation. Telugu/Kannada/
Malayalam remain out of scope (tokenizer limitation, documented in the audit).
