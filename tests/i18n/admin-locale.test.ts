/**
 * Admin Locale Pure Functions Tests
 *
 * Unit tests for lib/i18n/admin-locale.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAdminLocale,
  inferLocaleFromAcceptLanguage,
  ADMIN_LOCALE_KEY,
  ADMIN_LOCALE_MAX_AGE,
} from '@/lib/i18n/admin-locale';

describe('ADMIN_LOCALE_KEY', () => {
  it('has expected value', () => {
    assert.strictEqual(ADMIN_LOCALE_KEY, 'admin-locale');
  });
});

describe('ADMIN_LOCALE_MAX_AGE', () => {
  it('is 1 year in seconds', () => {
    assert.strictEqual(ADMIN_LOCALE_MAX_AGE, 31536000);
  });
});

describe('normalizeAdminLocale', () => {
  it('returns en for null', () => {
    assert.strictEqual(normalizeAdminLocale(null), 'en');
  });

  it('returns en for undefined', () => {
    assert.strictEqual(normalizeAdminLocale(undefined), 'en');
  });

  it('returns en for empty string', () => {
    assert.strictEqual(normalizeAdminLocale(''), 'en');
  });

  it('normalizes "zh" to zh', () => {
    assert.strictEqual(normalizeAdminLocale('zh'), 'zh');
  });

  it('normalizes "zh-TW" to zh', () => {
    assert.strictEqual(normalizeAdminLocale('zh-TW'), 'zh');
  });

  it('normalizes "zh-Hant" to zh', () => {
    assert.strictEqual(normalizeAdminLocale('zh-Hant'), 'zh');
  });

  it('normalizes "zh-CN" to zh', () => {
    assert.strictEqual(normalizeAdminLocale('zh-CN'), 'zh');
  });

  it('normalizes "en" to en', () => {
    assert.strictEqual(normalizeAdminLocale('en'), 'en');
  });

  it('normalizes "en-US" to en', () => {
    assert.strictEqual(normalizeAdminLocale('en-US'), 'en');
  });

  it('normalizes "en-GB" to en', () => {
    assert.strictEqual(normalizeAdminLocale('en-GB'), 'en');
  });

  it('normalizes uppercase values', () => {
    assert.strictEqual(normalizeAdminLocale('ZH-TW'), 'zh');
    assert.strictEqual(normalizeAdminLocale('EN-US'), 'en');
  });

  it('returns en for invalid locale', () => {
    assert.strictEqual(normalizeAdminLocale('fr'), 'en');
    assert.strictEqual(normalizeAdminLocale('de'), 'en');
    assert.strictEqual(normalizeAdminLocale('ja'), 'en');
  });

  it('trims whitespace', () => {
    assert.strictEqual(normalizeAdminLocale('  zh  '), 'zh');
    assert.strictEqual(normalizeAdminLocale('  en  '), 'en');
  });
});

describe('inferLocaleFromAcceptLanguage', () => {
  it('returns en for null', () => {
    assert.strictEqual(inferLocaleFromAcceptLanguage(null), 'en');
  });

  it('returns en for undefined', () => {
    assert.strictEqual(inferLocaleFromAcceptLanguage(undefined), 'en');
  });

  it('returns en for empty string', () => {
    assert.strictEqual(inferLocaleFromAcceptLanguage(''), 'en');
  });

  it('extracts primary language from simple header', () => {
    assert.strictEqual(inferLocaleFromAcceptLanguage('zh-TW'), 'zh');
    assert.strictEqual(inferLocaleFromAcceptLanguage('en-US'), 'en');
  });

  it('extracts primary language with quality values', () => {
    assert.strictEqual(inferLocaleFromAcceptLanguage('zh-TW,zh;q=0.9,en;q=0.8'), 'zh');
    assert.strictEqual(inferLocaleFromAcceptLanguage('en-US,en;q=0.9,zh;q=0.8'), 'en');
  });

  it('handles complex Accept-Language headers', () => {
    assert.strictEqual(
      inferLocaleFromAcceptLanguage('zh-TW;q=1,zh;q=0.9,en-US;q=0.8,en;q=0.7'),
      'zh'
    );
  });

  it('returns en for unsupported primary language', () => {
    assert.strictEqual(inferLocaleFromAcceptLanguage('ja,en;q=0.9'), 'en');
    assert.strictEqual(inferLocaleFromAcceptLanguage('fr-FR,en;q=0.9'), 'en');
  });
});
