import { describe, it, expect } from 'vitest';
import {
  tokenize,
  normalizeCrop,
  normalizeSymptom,
  classifyIntent,
  parseQuery,
  buildInvertedIndex,
  fastSearch,
  SOURCE_PRIORITY,
  getSourcePriority,
  isVerifiedRecord,
} from './AgriculturalNLP';

describe('AgriculturalNLP', () => {
  describe('tokenize', () => {
    it('lowercases and strips punctuation', () => {
      expect(tokenize('My Rice Crop!')).toContain('rice');
      expect(tokenize('My Rice Crop!')).not.toContain('my');
    });

    it('removes stop words', () => {
      const tokens = tokenize('how to control the pest please');
      expect(tokens).not.toContain('how');
      expect(tokens).not.toContain('the');
      expect(tokens).toContain('pest');
    });

    it('keeps Tamil and Devanagari tokens', () => {
      const tokens = tokenize('நெல் பயிரில் நோய்');
      expect(tokens).toContain('நெல்');
      expect(tokens).toContain('நோய்');
    });
  });

  describe('normalizeCrop', () => {
    it('maps English aliases to canonical crop', () => {
      expect(normalizeCrop('rice')).toBe('rice');
      expect(normalizeCrop('paddy')).toBe('rice');
      expect(normalizeCrop('dhan')).toBe('rice');
      expect(normalizeCrop('tamatar')).toBe('tomato');
    });

    it('maps Tamil and Hindi aliases', () => {
      expect(normalizeCrop('நெல்')).toBe('rice');
      expect(normalizeCrop('धान')).toBe('rice');
      expect(normalizeCrop('தக்காளி')).toBe('tomato');
      expect(normalizeCrop('आलू')).toBe('potato');
    });

    it('returns null for unknown tokens', () => {
      expect(normalizeCrop('dragonfruit')).toBeNull();
    });
  });

  describe('normalizeSymptom', () => {
    it('maps aliases to canonical symptom', () => {
      expect(normalizeSymptom('yellow')).toBe('yellowing');
      expect(normalizeSymptom('मञ्जल' === 'x' ? 'x' : 'पीला')).toBe('yellowing');
      expect(normalizeSymptom('wilting')).toBe('wilting');
      expect(normalizeSymptom('spot')).toBe('brown spots');
    });
  });

  describe('classifyIntent', () => {
    it('detects disease intent', () => {
      expect(classifyIntent('my rice has yellow spots and wilting')).toBe('disease');
    });

    it('detects fertilizer intent', () => {
      expect(classifyIntent('how much urea for paddy')).toBe('fertilizer');
    });

    it('detects scheme intent', () => {
      expect(classifyIntent('pm kisan subsidy')).toBe('scheme');
    });

    it('detects weather intent', () => {
      expect(classifyIntent('rain forecast this week')).toBe('weather');
    });

    it('returns unknown for unrelated text', () => {
      expect(classifyIntent('qwerty xyz')).toBe('unknown');
    });

    it('routes help requests to help, never scheme', () => {
      expect(classifyIntent('help')).toBe('help');
      expect(classifyIntent('how can you help me?')).toBe('help');
      expect(classifyIntent('உதவி')).toBe('help');
      expect(classifyIntent('मदद')).toBe('help');
    });

    it('keeps capabilities questions as about', () => {
      expect(classifyIntent('what can you do?')).toBe('about');
    });

    it('detects greetings in English, Tamil and Hindi', () => {
      expect(classifyIntent('hello')).toBe('greeting');
      expect(classifyIntent('வணக்கம்')).toBe('greeting');
      expect(classifyIntent('नमस्ते')).toBe('greeting');
    });

    it('detects what-is questions in English, Tamil, Tanglish and Hindi', () => {
      expect(classifyIntent('What is rice blast?')).toBe('what_is');
      expect(classifyIntent('What is tomato early blight?')).toBe('what_is');
      expect(classifyIntent('What does this disease mean?')).toBe('what_is');
      expect(classifyIntent('நெல் என்ன பயிர்')).toBe('what_is');
      expect(classifyIntent('यूरिया क्या है')).toBe('what_is');
    });

    it('detects treatment intent including prevention', () => {
      expect(classifyIntent('how to treat tomato blight')).toBe('treatment');
      expect(classifyIntent('how to prevent blast')).toBe('treatment');
    });

    it('recognizes Tamil and Hindi disease intent', () => {
      expect(classifyIntent('தக்காளி இலைகளில் புள்ளிகள்')).toBe('disease');
      expect(classifyIntent('टमाटर के पत्ते पीले हो रहे हैं')).toBe('disease');
    });

    it('does not match तना inside कितना (boundary-aware)', () => {
      expect(classifyIntent('धान के लिए खाद कितना')).toBe('fertilizer');
    });
  });

  describe('parseQuery', () => {
    it('extracts crop and symptom from English query', () => {
      const parsed = parseQuery('tomato leaves wilting');
      expect(parsed.crop).toBe('tomato');
      expect(parsed.symptom).toBe('wilting');
      expect(parsed.intent).toBe('disease');
    });

    it('extracts crop and symptom from Tamil query', () => {
      const parsed = parseQuery('நெல் மஞ்சள் புள்ளி');
      expect(parsed.crop).toBe('rice');
      expect(parsed.symptom).toBe('yellowing');
    });

    it('prefers exact crop match over fuzzy false positive', () => {
      const stores = {
        crops: [{ id: 'crop_wheat', name: 'Wheat', crop: 'wheat' }],
        diseases: [],
        symptoms: [],
        treatments: [],
        edges: [],
      };
      buildInvertedIndex(stores);

      const parsed = parseQuery('how to treat tomato late blight');
      expect(parsed.crop).toBe('tomato');
    });

    it('rejects distance-2 fuzzy crops (look must not become potato)', () => {
      const parsed = parseQuery('leaves look bad, what to do?');
      expect(parsed.crop).toBeNull();
    });

    it('still accepts distance-1 crop misspellings', () => {
      const parsed = parseQuery('tomatoo yellow spots');
      expect(parsed.crop).toBe('tomato');
    });
  });

  describe('fastSearch', () => {
    it('returns empty results before index is built', () => {
      const result = fastSearch('rice blast');
      expect(result.records).toEqual([]);
    });

    it('finds matching records after building the index', () => {
      const stores = {
        crops: [{ id: 'c1', name: 'Rice', crop: 'rice', description: 'staple crop' }],
        diseases: [
          { id: 'd1', name: 'Rice Blast', crop: 'rice', symptoms: ['leaf spots'], description: 'fungal' },
          { id: 'd2', name: 'Tomato Wilt', crop: 'tomato', symptoms: ['wilting'], description: 'bacterial' },
        ],
        symptoms: [],
        treatments: [],
        edges: [],
      };
      buildInvertedIndex(stores);

      const result = fastSearch('rice blast');
      expect(result.crop).toBe('rice');
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.records[0].record.id).toBe('d1');

      const filtered = fastSearch('rice blast', { type: 'crop' });
      expect(filtered.records.every((r) => r.record._type === 'crop')).toBe(true);
    });

    it('ranks records of the detected crop above other crops', () => {
      const stores = {
        crops: [],
        diseases: [
          { id: 'w1', name: 'Wheat Late Blight', crop: 'wheat', symptoms: ['leaf spots'], description: 'blight on wheat' },
          { id: 't1', name: 'Tomato Late Blight', crop: 'tomato', symptoms: ['leaf spots'], description: 'blight on tomato' },
        ],
        symptoms: [],
        treatments: [],
        edges: [],
      };
      buildInvertedIndex(stores);

      const result = fastSearch('how to treat tomato blight', { type: 'disease' });
      expect(result.crop).toBe('tomato');
      expect(result.records[0].record.id).toBe('t1');
      expect(result.records[0].score).toBeGreaterThan(
        result.records.find((r) => r.record.id === 'w1').score
      );
    });

    it('resolves cropId links so crop-specific diseases beat generic templates', () => {
      const stores = {
        crops: [
          { id: 'crop_tomato', name: 'Tomato', crop: 'tomato' },
          { id: 'crop_wheat', name: 'Wheat', crop: 'wheat' },
        ],
        diseases: [
          { id: 'd_gen', name: 'Blight 1007', type: 'Fungal', threat_level: 'Safe' },
          { id: 'd_tom', name: 'Early Blight', cropId: 'crop_tomato', type: 'Fungal' },
          { id: 'd_wheat', name: 'Late Blight', cropId: 'crop_wheat', type: 'Fungal' },
        ],
        symptoms: [],
        treatments: [],
        edges: [],
      };
      buildInvertedIndex(stores);

      const result = fastSearch('how to treat tomato late blight', { type: 'disease' });
      expect(result.crop).toBe('tomato');
      expect(result.records[0].record.id).toBe('d_tom');
    });
  });

  describe('source-priority & verified ranking', () => {
    it('declares an ordered institutional priority list', () => {
      expect(SOURCE_PRIORITY[0].id).toBe('tnau');
      expect(SOURCE_PRIORITY[SOURCE_PRIORITY.length - 1].id).toBe('fao');
      const weights = SOURCE_PRIORITY.map((s) => s.weight);
      expect([...weights].sort((a, b) => b - a)).toEqual(weights);
    });

    it('requires explicit provenance (verified flag or source) — id prefixes are NOT proof', () => {
      expect(isVerifiedRecord({ id: 'tr_tomato_blight', name: 'Copper' })).toBe(false);
      expect(isVerifiedRecord({ id: 'dp_rice_blast', name: 'Blast' })).toBe(false);
      expect(isVerifiedRecord({ id: 'crop_tomato', name: 'Tomato' })).toBe(false);
      expect(isVerifiedRecord({ id: 'crop_0', name: 'Rice' })).toBe(false);
      expect(isVerifiedRecord({ id: 'treatment_0', name: 'Copper' })).toBe(false);
      expect(isVerifiedRecord({ id: 'd1', source: 'TNAU' })).toBe(true);
      expect(isVerifiedRecord({ id: 'd1', verified: true })).toBe(true);
      expect(isVerifiedRecord({ id: 'd1' })).toBe(false);
    });

    it('maps institutional sources to a priority weight', () => {
      expect(getSourcePriority({ source: 'TNAU' })).toBe(8);
      expect(getSourcePriority({ sourceUrl: 'https://icar.org.in/tech' })).toBe(7);
      expect(getSourcePriority({ provider: 'Krishi Vigyan Kendra' })).toBe(5);
      expect(getSourcePriority({ source: 'Unknown blog' })).toBe(0);
    });

    it('boosts source-tagged records above identical unsourced records', () => {
      const stores = {
        crops: [],
        diseases: [
          { id: 'd_plain', name: 'Rice Blast', crop: 'rice', description: 'fungal' },
          { id: 'd_tnau', name: 'Rice Blast', crop: 'rice', description: 'fungal', source: 'TNAU' },
        ],
        symptoms: [],
        treatments: [],
        edges: [],
      };
      buildInvertedIndex(stores);

      const result = fastSearch('rice blast', { type: 'disease' });
      expect(result.records[0].record.id).toBe('d_tnau');
      expect(result.records.some((r) => r.record.id === 'd_plain')).toBe(true);
    });

    it('boosts explicitly verified records above identical unverified ones', () => {
      const stores = {
        crops: [],
        diseases: [
          { id: 'd1', name: 'Tomato Blight', crop: 'tomato', description: 'blight' },
          { id: 'd2', name: 'Tomato Blight', crop: 'tomato', description: 'blight', verified: true },
        ],
        symptoms: [],
        treatments: [],
        edges: [],
      };
      buildInvertedIndex(stores);

      const result = fastSearch('tomato blight', { type: 'disease' });
      expect(result.records[0].record.id).toBe('d2');
    });

    it('keeps crop-match dominance over source boost (source is never a hard filter)', () => {
      const stores = {
        crops: [],
        diseases: [
          { id: 'w_verified', name: 'Blight', crop: 'wheat', description: 'wheat blight', source: 'TNAU' },
          { id: 't1', name: 'Tomato Blight', crop: 'tomato', description: 'blight on tomato' },
        ],
        symptoms: [],
        treatments: [],
        edges: [],
      };
      buildInvertedIndex(stores);

      const result = fastSearch('tomato blight', { type: 'disease' });
      expect(result.crop).toBe('tomato');
      expect(result.records[0].record.id).toBe('t1');
    });
  });
});