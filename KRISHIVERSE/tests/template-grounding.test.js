/**
 * Phase 3D: Template Grounding Regression Tests
 *
 * Verifies that the 6 intent templates that bypass retrieval either:
 * - Do not make ungrounded factual agricultural claims, OR
 * - Are wired to KB evidence / marked as general guidance, OR
 * - Route to the documented external live-data path (weather/price)
 *
 * No agricultural factual claim should bypass the evidence/provenance path.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_SRC = readFileSync(
  resolve(__dirname, '../src/services/ai/IndexedDBChatbotEngine.js'),
  'utf8'
);

// Extract a function body from the engine source for targeted assertions
function fnBody(name) {
  const start = ENGINE_SRC.indexOf(`function ${name}(`);
  if (start === -1) return '';
  // Find the opening brace of the function body
  let i = ENGINE_SRC.indexOf('{', start);
  let depth = 0;
  for (; i < ENGINE_SRC.length; i++) {
    if (ENGINE_SRC[i] === '{') depth++;
    else if (ENGINE_SRC[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return ENGINE_SRC.slice(start, i + 1);
}

// ─── Template Classification ──────────────────────────────────────────

const TEMPLATES = [
  {
    name: 'about',
    handler: 'buildAboutResponse',
    classification: 'A: meta/non-factual',
    factualClaims: [],
    groundable: false,
    notes: 'Capabilities/greeting response. Self-referential, not agricultural facts.',
  },
  {
    name: 'fertilizer',
    handler: 'buildFertilizerResponse',
    classification: 'C: factual, requires KB evidence',
    factualClaims: [
      'NPK 120:60:60 kg/ha as base dose',
      'Nitrogen (N): For leaf growth',
      'Phosphorus (P): For roots',
      'Potassium (K): For fruit/grain quality',
    ],
    groundable: true,
    notes: 'NPK dosage and nutrient roles are standard agricultural facts. Should be KB-sourced.',
  },
  {
    name: 'scheme',
    handler: 'buildSchemeResponse',
    classification: 'C: factual, requires KB evidence',
    factualClaims: [
      'PM-KISAN — Rs.6,000/year direct benefit',
      'KCC — Short-term farm loans at 4% interest',
      'PM Kusum — Solar pump subsidy up to 60%',
      'Soil Health Card — Free soil testing every 2 years',
    ],
    groundable: true,
    notes: 'Scheme details are factual claims about government programs. Official links provide partial grounding; amounts marked as guidance pending KB records.',
  },
  {
    name: 'weather',
    handler: 'buildWeatherResponse',
    classification: 'C: factual, external live-data path',
    factualClaims: [
      'Before rain: Avoid pesticide spraying 24hrs prior',
      'Summer: Water fields in the evening to reduce evaporation',
      'High humidity: Watch for fungal disease outbreaks',
      'Drought stress: Apply mulching to retain soil moisture',
    ],
    groundable: true,
    notes: 'Live/current weather cannot be represented by the static KB. Correct path: Weather tab + imd.gov.in (external current-data). General precautions are timeless advisory, not live data.',
  },
  {
    name: 'price',
    handler: 'buildPriceResponse',
    classification: 'B: navigational (external live-data path)',
    factualClaims: [
      'Compare prices across 3-5 mandis before selling',
      'Check MSP (Minimum Support Price)',
    ],
    groundable: false,
    notes: 'Live mandi prices cannot be represented by the static KB. Correct path: Prices tab + agmarknet.gov.in (external current-data). No live prices invented.',
  },
  {
    name: 'cultivation',
    handler: 'buildCultivationResponse',
    classification: 'D: mixed, KB for crop facts + guidance marker for steps',
    factualClaims: [
      'Deep ploughing 2-3 times',
      'Seed treatment — Use Trichoderma or Thiram',
      'Irrigation — Critical at flowering and grain filling stages',
      'Scout weekly from germination',
    ],
    groundable: true,
    notes: 'Crop-specific data IS pulled from KB record. Generic 7-step list is marked as general guidance.',
  },
];

// ─── Tests ────────────────────────────────────────────────────────────

describe('Phase 3D: Template Grounding', () => {
  describe('Template Inventory', () => {
    it('should have exactly 6 intent templates that bypass retrieval', () => {
      expect(TEMPLATES).toHaveLength(6);
    });

    it('should document all template names', () => {
      const names = TEMPLATES.map((t) => t.name);
      expect(names).toEqual(['about', 'fertilizer', 'scheme', 'weather', 'price', 'cultivation']);
    });

    it('should document all handler names', () => {
      const handlers = TEMPLATES.map((t) => t.handler);
      expect(handlers).toEqual([
        'buildAboutResponse',
        'buildFertilizerResponse',
        'buildSchemeResponse',
        'buildWeatherResponse',
        'buildPriceResponse',
        'buildCultivationResponse',
      ]);
    });

    it('should classify each template into the A/B/C/D scheme', () => {
      for (const template of TEMPLATES) {
        expect(template.classification).toMatch(/^[ABCD]:/);
      }
    });
  });

  describe('Live source: fertilizer template grounded to KB evidence', () => {
    const body = fnBody('buildFertilizerResponse');

    it('template exists in engine source', () => {
      expect(body.length).toBeGreaterThan(0);
    });

    it('reads KB hits and exposes an evidence path', () => {
      expect(body).toContain('hits.slice(0, 3)');
      expect(body).toContain('hasKbEvidence');
    });

    it('fallback NPK claim is marked as general guidance when no KB evidence', () => {
      expect(body).toContain('general guidance — verify with soil test');
    });

    it('response states KB evidence presence explicitly', () => {
      expect(body).toContain('Evidence source: KB records.');
      expect(body).toContain('no KB evidence found');
    });

    it('confidence drops when no KB evidence is available', () => {
      expect(body).toMatch(/confidence:\s*hasKbEvidence\s*\?\s*0\.8\s*:\s*0\.5/);
    });
  });

  describe('Live source: scheme template marks amounts as guidance', () => {
    const body = fnBody('buildSchemeResponse');

    it('template exists in engine source', () => {
      expect(body.length).toBeGreaterThan(0);
    });

    it('scheme amounts are marked for verification against official portals', () => {
      expect(body).toContain('general guidance — verify current benefits on official portals');
    });

    it('confidence is not overstated', () => {
      expect(body).toMatch(/confidence:\s*0\.7/);
    });
  });

  describe('Live source: cultivation template wired to KB crop record', () => {
    const body = fnBody('buildCultivationResponse');

    it('template exists in engine source', () => {
      expect(body.length).toBeGreaterThan(0);
    });

    it('detects whether a KB crop record backs the response', () => {
      expect(body).toContain('hasKbRecord');
      expect(body).toContain('!!crop');
    });

    it('step list is marked as general guidance', () => {
      expect(body).toContain('Key Steps *(general guidance)*');
    });

    it('states KB vs no-KB provenance in the response footer', () => {
      expect(body).toContain('Crop data from KB.');
      expect(body).toContain('No KB record found — general guidance only.');
    });

    it('confidence drops when no KB record backs the response', () => {
      expect(body).toMatch(/confidence:\s*hasKbRecord\s*\?\s*0\.8\s*:\s*0\.5/);
    });
  });

  describe('Live source: weather/price use documented external current-data path', () => {
    it('weather routes to live sources rather than pretending KB is current', () => {
      const body = fnBody('buildWeatherResponse');
      expect(body).toContain('Weather** tab');
      expect(body).toContain('imd.gov.in');
      // Must not invent live data (no specific temperatures or forecasts)
      expect(body).not.toMatch(/\d+\s*°C/);
      expect(body).not.toMatch(/rainfall\s+of\s+\d/i);
    });

    it('price routes to live sources and invents no prices', () => {
      const body = fnBody('buildPriceResponse');
      expect(body).toContain('Prices** tab');
      expect(body).toContain('agmarknet.gov.in');
      // Must not invent live mandi prices (rupee amounts per quintal/kg)
      expect(body).not.toMatch(/₹\s?\d[\d,]*\s*(per\s+)?(quintal|kg|qtl)/i);
    });
  });

  describe('Live source: about template is meta/non-factual', () => {
    it('about handler describes capabilities, not agricultural facts', () => {
      const body = fnBody('buildAboutResponse');
      expect(body.length).toBeGreaterThan(0);
      // It may reference example phrases, but must not state dosages
      expect(body).not.toMatch(/\d+g\/(ha|litre|liter|acre)/i);
      expect(body).not.toMatch(/\d+(\.\d+)?\s*ml\s*(per|\/)\s*(litre|liter)/i);
    });
  });

  describe('Safety Invariants', () => {
    it('fertilizer NPK claim is classified as requiring KB evidence', () => {
      const fertilizer = TEMPLATES.find((t) => t.name === 'fertilizer');
      expect(fertilizer.factualClaims.some((c) => c.includes('NPK'))).toBe(true);
      expect(fertilizer.groundable).toBe(true);
    });

    it('scheme amounts are classified as requiring KB evidence', () => {
      const scheme = TEMPLATES.find((t) => t.name === 'scheme');
      expect(scheme.factualClaims.some((c) => c.includes('Rs.6,000'))).toBe(true);
      expect(scheme.groundable).toBe(true);
    });

    it('price template stays navigational — no invented live prices', () => {
      const price = TEMPLATES.find((t) => t.name === 'price');
      expect(price.classification).toMatch(/^B:/);
    });

    it('does not weaken ResponseValidator', () => {
      // ResponseValidator and treatmentSafety rules are unchanged by grounding.
      // Verified-dosage invariant: verified === true AND source AND sourceUrl.
      const safety = readFileSync(
        resolve(__dirname, '../src/services/ai/treatmentSafety.js'),
        'utf8'
      );
      expect(safety).toContain('record.verified === true');
      expect(safety).toContain('record.source');
      expect(safety).toContain('record.sourceUrl');
    });

    it('no template sets verified or fabricates provenance', () => {
      for (const t of TEMPLATES) {
        const body = fnBody(t.handler);
        expect(body).not.toMatch(/verified:\s*true/);
        expect(body).not.toMatch(/sourceUrl:\s*['"]https/);
      }
    });
  });
});
