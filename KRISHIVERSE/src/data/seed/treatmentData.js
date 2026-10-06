export const TREATMENTS = [
  {
    id: "tr_tomato_blight_organic",
    diseaseId: "dp_tomato_early_blight",
    type: "natural",
    method: "Spray 10% Neem leaf extract.",
    method_ta: "10% வேப்பிலை சாற்றைத் தெளிக்கவும்.",
    method_hi: "10% नीम के पत्तों के अर्क का छिड़काव करें।"
  },
  {
    id: "tr_tomato_blight_chem",
    diseaseId: "dp_tomato_early_blight",
    type: "chemical",
    method: "Copper Oxychloride (3g/L) spray.",
    method_ta: "காப்பர் ஆக்ஸிகுளோரைடு (3கி/லி) தெளிக்கவும்.",
    method_hi: "कॉपर ऑक्सीक्लोराइड (3 ग्राम / लीटर) स्प्रे करें।"
  },
  {
    id: "tr_chilli_curl_control",
    diseaseId: "dp_chilli_leaf_curl",
    type: "preventive",
    method: "Remove and burn infected plants. Control whiteflies.",
    method_ta: "பாதிக்கப்பட்ட செடிகளை அகற்றி எரிக்கவும். வெள்ளை ஈக்களைக் கட்டுப்படுத்தவும்.",
    method_hi: "संक्रमित पौधों को हटा दें और जला दें। सफेद मक्खियों को नियंत्रित करें।"
  },
  {
    // Phase 3E.2 — first verified dose-bearing activation. Content mirrors
    // knowledge/tnau-pilot/rice-blast-treatment.md after a claim-by-claim
    // adjudication against the official TNAU Agritech blast page and the TNAU
    // CPPS crop-protection publication (see pilot config `verification.claimAudit`).
    // Neem oil and Trichoderma were dropped as unsupported for blast; the staged
    // 0.6 g/L headline dose was corrected to the source's 1 g/L.
    // No region (never inferred), no translations (enrichment flags them),
    // no dangerLevel/source dataset location (source does not assign one).
    id: "tnau_rice_blast_treatment",
    name: "Tricyclazole 75% WP @ 1g/liter for rice blast",
    diseaseId: "tnau_rice_blast",
    cropId: "crop_rice",
    type: "chemical",
    method: "Tricyclazole 75% WP @1g/liter water or Carbendazim 50% WP @1g/liter water; 3 to 4 sprays at nursery, tillering, booting (panicle initiation) and flowering stages. Pseudomonas fluorescens talc formulation dry seed treatment @10g/kg of seed; foliar spray @0.5% from 45 days after transplanting at 10 day intervals, three times. Remove collateral weed hosts from bunds and channels; burn straw and stubbles after harvest.",
    chemicalControl: "Tricyclazole 75% WP @1g/liter water; Carbendazim 50% WP @1g/liter water; spray at tillering, booting and flowering stages",
    organicRemedy: "Pseudomonas fluorescens talc formulation — dry seed treatment @10g/kg of seed; foliar spray @0.5% from 45 days after transplanting at 10 day intervals, three times",
    immediateAction: "Remove collateral weed hosts from bunds and channels",
    source: "TNAU",
    sourceOrganization: "TNAU",
    sourceUrl: "https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html",
    region: null,
    verified: true,
    verifiedDate: "2026-10-06"
  }
];
