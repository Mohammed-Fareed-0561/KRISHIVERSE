import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock offline worker and DB
vi.mock('../src/services/offline/offlineChatbot', () => ({
  initOfflineChatbot: vi.fn(() => Promise.resolve()),
  queryOfflineBot: vi.fn(async () => 'fallback'),
}));
vi.mock('../src/services/db/indexedDb', () => ({
  dbPut: vi.fn(async (store, value) => ({ ...value })),
  dbGetAll: vi.fn(async () => []),
}));

// Mock apiClient to throw offline
vi.mock('../src/services/api/apiClient', () => ({
  apiClient: { post: vi.fn(() => { const err = new Error('offline'); err.isOffline = true; throw err; }) }
}));

// Case A: no matches -> ReasoningEngine returns []
vi.mock('../src/services/ReasoningEngine', () => ({
  ReasoningEngine: vi.fn().mockImplementation(() => ({
    extractSymptomsFromText: vi.fn(async () => []),
    matchSymptoms: vi.fn(async () => []),
  }))
}));

import * as advisoryService from '../src/services/api/advisoryService';

describe('diagnoseCrop offline edge cases', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a friendly message when no matches found', async () => {
    const r = await advisoryService.diagnoseCrop({ symptoms: 'unknownsymptom', cropType: 'Wheat' });
    expect(r).toBeTruthy();
    expect(r.offline).toBe(true);
    expect(r.diagnosis).toMatch(/No clear match found offline/i);
  });
});
