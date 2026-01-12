import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickLocaleContent, pickLocale } from '@/lib/i18n/pick-locale';
import type { SiteContent } from '@/lib/types/content';

describe('pickLocaleContent', () => {
  const mockContent: SiteContent = {
    id: 'test-id',
    section_key: 'nav',
    content_en: { title: 'English Title', description: 'English Desc' },
    content_zh: { title: '中文標題', description: '中文描述' },
    is_published: true,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: null,
  };

  it('returns content_en for locale "en"', () => {
    const result = pickLocaleContent<{ title: string }>(mockContent, 'en');
    assert.deepEqual(result, { title: 'English Title', description: 'English Desc' });
  });

  it('returns content_zh for locale "zh"', () => {
    const result = pickLocaleContent<{ title: string }>(mockContent, 'zh');
    assert.deepEqual(result, { title: '中文標題', description: '中文描述' });
  });

  it('returns content_en for unknown locale (fallback)', () => {
    const result = pickLocaleContent<{ title: string }>(mockContent, 'de');
    assert.deepEqual(result, { title: 'English Title', description: 'English Desc' });
  });

  it('returns null for undefined content', () => {
    const result = pickLocaleContent<{ title: string }>(undefined, 'en');
    assert.equal(result, null);
  });
});

describe('pickLocale', () => {
  it('returns en value for locale "en"', () => {
    const result = pickLocale({ en: 'Hello', zh: '你好' }, 'en');
    assert.equal(result, 'Hello');
  });

  it('returns zh value for locale "zh"', () => {
    const result = pickLocale({ en: 'Hello', zh: '你好' }, 'zh');
    assert.equal(result, '你好');
  });

  it('returns en value for unknown locale (fallback)', () => {
    const result = pickLocale({ en: 'Hello', zh: '你好' }, 'fr');
    assert.equal(result, 'Hello');
  });

  it('works with object values', () => {
    const values = {
      en: { greeting: 'Hello', farewell: 'Goodbye' },
      zh: { greeting: '你好', farewell: '再見' },
    };
    const result = pickLocale(values, 'zh');
    assert.deepEqual(result, { greeting: '你好', farewell: '再見' });
  });
});
