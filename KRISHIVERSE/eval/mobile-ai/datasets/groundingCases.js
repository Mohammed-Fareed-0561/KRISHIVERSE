/**
 * eval/mobile-ai/datasets/groundingCases.js — AgriculturalGroundingGuard cases.
 *
 * Covers the required categories (spec §12): normal facts, unsupported facts,
 * contradictory facts, wrong-crop evidence, unsupported dosage, unsupported
 * treatment, confident hallucination, partially correct answers, and
 * insufficient evidence.
 *
 * Evidence records are synthetic but shaped like real curated records; the
 * rice blast facts mirror the committed TNAU pilot records. Origin is
 * "synthetic-screening" — these measure guard behaviour, not agronomy.
 */

const TREATMENT_EVIDENCE = {
  id: "tnau_rice_blast_treatment",
  cropId: "crop_rice",
  diseaseId: "tnau_rice_blast",
  verified: true,
  source: "TNAU",
  sourceUrl: "https://agritech.tnau.ac.in",
  text: "Tricyclazole 75% WP @ 1g/liter for rice blast. Apply as foliar spray at first symptom, repeat after 15 days.",
};

const DISEASE_EVIDENCE = {
  id: "tnau_rice_blast",
  cropId: "crop_rice",
  verified: true,
  source: "TNAU",
  sourceUrl: "https://agritech.tnau.ac.in",
  text: "Rice blast is caused by the fungus Magnaporthe oryzae. Diamond shaped spots with gray center appear on leaves. Cool humid weather favors blast.",
};

const UNVERIFIED_EVIDENCE = {
  id: "community_rice_note",
  cropId: "crop_rice",
  verified: false,
  text: "farmers note that rice blast spreads after rain in some villages",
};

const WRONG_CROP_EVIDENCE = {
  id: "tnau_tomato_late_blight",
  cropId: "tomato",
  verified: true,
  source: "TNAU",
  sourceUrl: "https://agritech.tnau.ac.in",
  text: "Mancozeb 75% WP at 2 g per liter controls late blight in tomato. Spray at first symptom.",
};

const _CASES = [
  { id: "grd-normal-fact", origin: "synthetic-screening", category: "normal-fact", language: "en",
    context: { crop: "rice", disease: "rice blast" }, evidence: [DISEASE_EVIDENCE],
    answer: "Rice blast is caused by the fungus Magnaporthe oryzae and diamond shaped spots with gray center appear on leaves. Please verify with your local KVK before acting.",
    expected: { overall: "SUPPORTED" } },

  { id: "grd-unsupported-fact", origin: "synthetic-screening", category: "unsupported-fact", language: "en",
    context: { crop: "rice" }, evidence: [DISEASE_EVIDENCE],
    answer: "Rice blast yields drop by 40 percent in every affected field.",
    expected: { overall: "UNSUPPORTED" } },

  { id: "grd-contradicted-dose", origin: "synthetic-screening", category: "contradictory", language: "en",
    context: { crop: "rice", disease: "rice blast" }, evidence: [TREATMENT_EVIDENCE],
    answer: "Apply Tricyclazole 75% WP at 5g per liter of water for rice blast.",
    expected: { overall: "CONTRADICTED" },
    notes: "evidence says 1g/liter; claim says 5g/liter — same unit, different number" },

  { id: "grd-wrong-crop-dose", origin: "synthetic-screening", category: "wrong-crop-evidence", language: "en",
    context: { crop: "rice" }, evidence: [WRONG_CROP_EVIDENCE],
    answer: "Spray Mancozeb 75% WP at 2 g per liter on the rice crop.",
    expected: { overall: "HIGH_RISK_UNSUPPORTED" },
    notes: "only applicable-looking evidence is a tomato record — must not back a rice dose" },

  { id: "grd-wrong-crop-general", origin: "synthetic-screening", category: "wrong-crop-evidence", language: "en",
    context: { crop: "rice" }, evidence: [WRONG_CROP_EVIDENCE],
    answer: "Late blight causes brown lesions on the crop leaves.",
    expected: { overall: "UNSUPPORTED" } },

  { id: "grd-unsupported-dose", origin: "synthetic-screening", category: "unsupported-dosage", language: "en",
    context: { crop: "rice" }, evidence: [DISEASE_EVIDENCE],
    answer: "Spray 3 ml of any pesticide per liter of water on the rice.",
    expected: { overall: "HIGH_RISK_UNSUPPORTED" } },

  { id: "grd-unverified-dose", origin: "synthetic-screening", category: "unsupported-dosage", language: "en",
    context: { crop: "rice" }, evidence: [UNVERIFIED_EVIDENCE],
    answer: "Apply 1g per liter of Tricyclazole for rice blast.",
    expected: { overall: "HIGH_RISK_UNSUPPORTED" },
    notes: "dose string exists only in an unverified record — no provenance" },

  { id: "grd-unsupported-treatment", origin: "synthetic-screening", category: "unsupported-treatment", language: "en",
    context: { crop: "rice" }, evidence: [DISEASE_EVIDENCE],
    answer: "Drench the soil with neem oil emulsion to control the leaf spots.",
    expected: { overall: "HIGH_RISK_UNSUPPORTED" } },

  { id: "grd-confident-hallucination", origin: "synthetic-screening", category: "confident-hallucination", language: "en",
    context: { crop: "rice" }, evidence: [DISEASE_EVIDENCE],
    answer: "Rice blast was fully eradicated from Tamil Nadu in 2019 after a nationwide spraying campaign.",
    expected: { overall: "UNSUPPORTED" } },

  { id: "grd-partial-answer", origin: "synthetic-screening", category: "partially-correct", language: "en",
    context: { crop: "rice", disease: "rice blast" }, evidence: [DISEASE_EVIDENCE],
    answer: "Rice blast is caused by the fungus Magnaporthe oryzae. Farmers should apply 5 ml of copper oxychloride weekly.",
    expected: { overall: "HIGH_RISK_UNSUPPORTED" },
    notes: "first claim supported, second claim is an unsourced dose — worst-of rollup" },

  { id: "grd-insufficient-evidence", origin: "synthetic-screening", category: "insufficient-evidence", language: "en",
    context: { crop: "rice" }, evidence: [],
    answer: "Rice blast spreads through air borne spores during humid nights.",
    expected: { overall: "INSUFFICIENT_EVIDENCE" } },

  { id: "grd-tamil-supported", origin: "synthetic-screening", category: "normal-fact", language: "ta",
    context: { crop: "rice", disease: "rice blast" }, evidence: [DISEASE_EVIDENCE],
    answer: "நெல் புள்ளி நோய் Magnaporthe oryzae என்ற பூஞ்சால் மூலம் ஏற்படுகிறது.",
    expected: { overall: "SUPPORTED" },
    notes: "Tamil sentence grounded on Latin scientific name present in evidence" },

  { id: "grd-tamil-dose-unsupported", origin: "synthetic-screening", category: "unsupported-dosage", language: "ta",
    context: { crop: "rice" }, evidence: [DISEASE_EVIDENCE],
    answer: "நெல்லுக்கு 10 மில்லி மருந்து ஒரு லிட்டர் தண்ணீரில் கலந்து தெளிக்கவும்.",
    expected: { overall: "HIGH_RISK_UNSUPPORTED" } },

  { id: "grd-tanglish-unsupported", origin: "synthetic-screening", category: "unsupported-fact", language: "tanglish",
    context: { crop: "rice" }, evidence: [DISEASE_EVIDENCE],
    answer: "rice blast ku weekly two times spray pannum nu FDA solrathu.",
    expected: { overall: "HIGH_RISK_UNSUPPORTED" } },

  { id: "grd-boilerplate-ignored", origin: "synthetic-screening", category: "normal-fact", language: "en",
    context: { crop: "rice", disease: "rice blast" }, evidence: [DISEASE_EVIDENCE],
    answer: "Rice blast is caused by the fungus Magnaporthe oryzae. Please verify with your local KVK before acting.",
    expected: { overall: "SUPPORTED" },
    notes: "safety boilerplate must be excluded from claim scoring" },

  { id: "grd-no-evidence-dose", origin: "synthetic-screening", category: "insufficient-evidence", language: "en",
    context: { crop: "rice" }, evidence: [],
    answer: "Spray 2 ml per liter for rice blast control.",
    expected: { overall: "INSUFFICIENT_EVIDENCE" },
    notes: "empty evidence dominates: status reports missing evidence rather than guessing support" },
];

for (const c of _CASES) {
  if (!c.expected?.overall) throw new Error(`grounding case ${c.id} missing expected.overall`);
}
const ids = new Set(_CASES.map((c) => c.id));
if (ids.size !== _CASES.length) throw new Error("duplicate grounding case id");

export const GROUNDING_CASES = _CASES;

export const GROUNDING_DATASET_SUMMARY = {
  total: _CASES.length,
  groundTruth: 0,
  origin: "synthetic-screening (0 expert-labelled)",
  note: "synthetic-screening guard behaviour set — not agronomic ground truth",
};
