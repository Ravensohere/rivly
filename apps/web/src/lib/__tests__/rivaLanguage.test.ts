/**
 * rivaLanguage.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for Riva language responses and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  getRivaResponse,
  getLanguageCode,
  getAvailableLanguages,
  detectLanguage,
  RIVA_RESPONSES,
} from '../rivaLanguage';

describe('rivaLanguage', () => {
  describe('getRivaResponse', () => {
    it('returns English response for english language', () => {
      const response = getRivaResponse('greeting', 'english');
      expect(response).toBe('Hello! How can I help you today?');
    });

    it('returns Hindi response for hindi language', () => {
      const response = getRivaResponse('greeting', 'hindi');
      expect(response).toContain('Namaste');
    });

    it('returns Hinglish response for hinglish language', () => {
      const response = getRivaResponse('greeting', 'hinglish');
      expect(response).toContain('Hello');
      expect(response).toContain('aapki');
    });

    it('returns English as default for unknown key', () => {
      // Deliberately passing a key that is not in the map.
      const response = getRivaResponse('unknownKey' as any, 'hindi');
      expect(response).toBe((RIVA_RESPONSES.english as any).unknownKey);
    });

    it('returns taskAdded response correctly', () => {
      expect(getRivaResponse('taskAdded', 'english')).toBe('Got it! Task added.');
      expect(getRivaResponse('taskAdded', 'hindi')).toBe('Bilkul! Task add kar diya.');
      expect(getRivaResponse('taskAdded', 'hinglish')).toBe('Done! Task add ho gaya.');
    });

    it('returns planCreated response correctly', () => {
      expect(getRivaResponse('planCreated', 'english')).toContain('plan is ready');
      expect(getRivaResponse('planCreated', 'hindi')).toContain('plan taiyaar hai');
      expect(getRivaResponse('planCreated', 'hinglish')).toContain('plan ready hai');
    });
  });

  describe('getLanguageCode', () => {
    it('returns en-IN for english', () => {
      expect(getLanguageCode('english')).toBe('en-IN');
    });

    it('returns hi-IN for hindi', () => {
      expect(getLanguageCode('hindi')).toBe('hi-IN');
    });

    it('returns hi-IN for hinglish', () => {
      expect(getLanguageCode('hinglish')).toBe('hi-IN');
    });
  });

  describe('getAvailableLanguages', () => {
    it('returns array of 3 languages', () => {
      const languages = getAvailableLanguages();
      expect(languages).toHaveLength(3);
    });

    it('includes English with en-IN code', () => {
      const languages = getAvailableLanguages();
      const english = languages.find(l => l.id === 'english');
      expect(english).toBeDefined();
      expect(english?.code).toBe('en-IN');
    });

    it('includes Hindi with hi-IN code', () => {
      const languages = getAvailableLanguages();
      const hindi = languages.find(l => l.id === 'hindi');
      expect(hindi).toBeDefined();
      expect(hindi?.code).toBe('hi-IN');
    });

    it('includes Hinglish with hi-IN code', () => {
      const languages = getAvailableLanguages();
      const hinglish = languages.find(l => l.id === 'hinglish');
      expect(hinglish).toBeDefined();
      expect(hinglish?.code).toBe('hi-IN');
    });
  });

  describe('detectLanguage', () => {
    it('detects Hindi script as hindi', () => {
      expect(detectLanguage('नमस्ते! आप कैसे हैं?')).toBe('hindi');
      expect(detectLanguage('मैं ठीक हूँ')).toBe('hindi');
    });

    it('detects Hinglish keywords as hinglish', () => {
      expect(detectLanguage('Aaj kaise ho bhai')).toBe('hinglish');
      expect(detectLanguage('Kya kar rahe ho')).toBe('hinglish');
      expect(detectLanguage('Mera task complete ho gaya')).toBe('hinglish');
    });

    it('defaults to english for pure English text', () => {
      expect(detectLanguage('Hello! How are you?')).toBe('english');
      expect(detectLanguage('I need to finish my tasks')).toBe('english');
    });

    it('handles mixed Hinglish with multiple keywords', () => {
      expect(detectLanguage('Haan main kar lunga, dont worry')).toBe('hinglish');
      expect(detectLanguage('Kal meeting hai, please prepare kar lena')).toBe('hinglish');
    });
  });

  describe('RIVA_RESPONSES structure', () => {
    it('has all required response keys for english', () => {
      const keys = Object.keys(RIVA_RESPONSES.english);
      expect(keys).toContain('greeting');
      expect(keys).toContain('taskAdded');
      expect(keys).toContain('planCreated');
      expect(keys).toContain('focusStarted');
      expect(keys).toContain('wellDone');
    });

    it('has same keys across all languages', () => {
      const englishKeys = Object.keys(RIVA_RESPONSES.english);
      const hindiKeys = Object.keys(RIVA_RESPONSES.hindi);
      const hinglishKeys = Object.keys(RIVA_RESPONSES.hinglish);

      expect(hindiKeys).toEqual(englishKeys);
      expect(hinglishKeys).toEqual(englishKeys);
    });

    it('has non-empty responses for all keys', () => {
      Object.values(RIVA_RESPONSES.english).forEach(response => {
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
      });
    });
  });
});
