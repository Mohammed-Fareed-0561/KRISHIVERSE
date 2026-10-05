import { describe, it, expect } from 'vitest';
import {
  CROPS,
  getDiseaseInfo,
  getAllDiseasesForCrop,
  analyzeVisualFeatures,
} from './comprehensiveDiseaseDB';

describe('comprehensiveDiseaseDB', () => {
  describe('getAllDiseasesForCrop', () => {
    it('returns diseases for rice', () => {
      const diseases = getAllDiseasesForCrop(CROPS.RICE);
      expect(diseases.length).toBeGreaterThan(0);
      expect(diseases.map((d) => d.id)).toContain('rice_blast');
    });

    it('returns empty array for unknown crop', () => {
      expect(getAllDiseasesForCrop('dragonfruit')).toEqual([]);
    });
  });

  describe('getDiseaseInfo', () => {
    it('returns a specific disease by id', () => {
      const disease = getDiseaseInfo(CROPS.RICE, 'rice_blast');
      expect(disease).toBeTruthy();
      expect(disease.name).toBe('Rice Blast');
      expect(disease.severity).toBe('high');
      expect(disease.naturalTreatment.length).toBeGreaterThan(0);
      expect(disease.chemicalTreatment.length).toBeGreaterThan(0);
    });

    it('returns null for unknown crop or disease', () => {
      expect(getDiseaseInfo('dragonfruit', 'rice_blast')).toBeNull();
      expect(getDiseaseInfo(CROPS.RICE, 'nope')).toBeUndefined();
    });
  });

  describe('analyzeVisualFeatures', () => {
    it('returns matched color rules', () => {
      const results = analyzeVisualFeatures({ colors: ['yellow_leaves'] });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('color');
      expect(results[0].diseases).toContain('tungro');
      expect(results[0].confidence).toBe(0.75);
    });

    it('combines color, shape, and location rules', () => {
      const results = analyzeVisualFeatures({
        colors: ['yellow_leaves'],
        shapes: ['target_pattern'],
        locations: ['all_leaves'],
      });
      expect(results.map((r) => r.type).sort()).toEqual(['color', 'location', 'shape']);
    });

    it('ignores unknown features', () => {
      const results = analyzeVisualFeatures({ colors: ['magenta_polka'] });
      expect(results).toEqual([]);
    });
  });
});