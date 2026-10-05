import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './i18n';

describe('i18n', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('supports en, ta, and hi languages', () => {
    expect(i18n.options.supportedLngs).toContain('en');
    expect(i18n.options.supportedLngs).toContain('ta');
    expect(i18n.options.supportedLngs).toContain('hi');
  });

  it('switches to Tamil', async () => {
    await i18n.changeLanguage('ta');
    expect(i18n.language).toBe('ta');
  });

  it('switches to Hindi', async () => {
    await i18n.changeLanguage('hi');
    expect(i18n.language).toBe('hi');
  });

  it('falls back to English for unsupported languages', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.resolvedLanguage || i18n.language).toBe('en');
  });

  it('persists the chosen language to localStorage', async () => {
    await i18n.changeLanguage('ta');
    expect(localStorage.getItem('i18nextLng')).toBe('ta');
  });
});