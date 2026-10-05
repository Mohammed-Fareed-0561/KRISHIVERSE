import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock offline chatbot worker to avoid Worker creation during test import
vi.mock('../src/services/offline/offlineChatbot', () => ({
  initOfflineChatbot: vi.fn((cb) => { if (cb) cb('mocked'); return Promise.resolve(); }),
  queryOfflineBot: vi.fn(async (q) => 'offline-fallback-response'),
}));

vi.mock('../src/services/db/indexedDb', () => ({
  dbPut: vi.fn(async (store, value) => ({ ...value })),
  dbGetAll: vi.fn(async () => []),
  dbClear: vi.fn(async () => true),
}));

// Mock apiClient to throw offline error
vi.mock('../src/services/api/apiClient', () => ({
  apiClient: {
    post: vi.fn(() => { const err = new Error('offline'); err.isOffline = true; throw err; })
  }
}));

// Spy on ReasoningEngine methods
const mockMatches = [
  {
    disease: { id: 'd1', name: 'Mocked Blight', severity: 'moderate', prevention: ['Keep field dry'], cause: 'Fungal' },
    confidence: 78,
    treatments: [
      { id: 't1', name: 'Apply Neem Oil', type: 'natural', action: 'Spray neem oil 2% every 7 days' },
      { id: 't2', name: 'Fungicide X', type: 'chemical', action: 'Apply Fungicide X as per label' },
    ],
  },
];

vi.mock('../src/services/ReasoningEngine', () => {
  return {
    ReasoningEngine: vi.fn().mockImplementation(() => ({
      extractSymptomsFromText: vi.fn(async (text) => ['s1', 's2']),
      matchSymptoms: vi.fn(async (ids) => mockMatches),
    })),
  };
});

import * as advisoryService from '../src/services/api/advisoryService';

describe('diagnoseCrop offline path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save a UI-friendly diagnosis record when offline', async () => {
    const payload = { symptoms: 'yellow spots and curling', cropType: 'Rice', language: 'en' };
    const record = await advisoryService.diagnoseCrop(payload);

    // record should have expected fields
    expect(record).toBeTruthy();
    expect(record.offline).toBe(true);
    expect(record.model).toBe('local-reasoning-engine');
    expect(record.diagnosis).toMatch(/Mocked Blight|Offline Diagnosis/);
    expect(record.name).toMatch(/Mocked Blight|Offline Diagnosis/);
    expect(record.confidence).toBe('78%');
    expect(Array.isArray(record.treatments)).toBe(true);
    expect(record.naturalIndianTreatment).toContain('Spray neem oil 2% every 7 days');
    expect(record.chemicalTreatment).toContain('Apply Fungicide X as per label');
    expect(Array.isArray(record.prevention)).toBe(true);
  });
});
