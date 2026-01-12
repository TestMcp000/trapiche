import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SITE_URL,
  getAlternateLanguages,
  getCanonicalUrl,
  getMetadataAlternates,
  postHasLocaleContent,
} from '../lib/seo/hreflang';

test('getAlternateLanguages generates en/zh-Hant and x-default', () => {
  const alternates = getAlternateLanguages('/blog');
  assert.equal(alternates.length, 3);
  assert.deepEqual(alternates, [
    { hreflang: 'en', href: `${SITE_URL}/en/blog` },
    { hreflang: 'zh-Hant', href: `${SITE_URL}/zh/blog` },
    { hreflang: 'x-default', href: `${SITE_URL}/en/blog` },
  ]);
});

test('getCanonicalUrl builds canonical URL', () => {
  assert.equal(getCanonicalUrl('en', '/privacy'), `${SITE_URL}/en/privacy`);
  assert.equal(getCanonicalUrl('zh', 'privacy'), `${SITE_URL}/zh/privacy`);
});

test('getMetadataAlternates returns canonical and language map', () => {
  const alternates = getMetadataAlternates('/contact', 'zh');
  assert.equal(alternates.canonical, `${SITE_URL}/zh/contact`);
  assert.deepEqual(alternates.languages, {
    en: `${SITE_URL}/en/contact`,
    'zh-Hant': `${SITE_URL}/zh/contact`,
    'x-default': `${SITE_URL}/en/contact`,
  });
});

test('postHasLocaleContent respects locale availability', () => {
  const post = { content_en: 'hello', content_zh: null };
  assert.equal(postHasLocaleContent(post, 'en'), true);
  assert.equal(postHasLocaleContent(post, 'zh'), false);
});

test('all generated URLs start with SITE_URL', () => {
  // Verify no hardcoded domains leak through
  const alternates = getAlternateLanguages('/test-path');
  for (const alt of alternates) {
    assert.ok(
      alt.href.startsWith(SITE_URL),
      `Expected href to start with ${SITE_URL}, got ${alt.href}`
    );
  }

  const metadata = getMetadataAlternates('/test-path');
  assert.ok(metadata.canonical.startsWith(SITE_URL));
  assert.ok(metadata.languages.en.startsWith(SITE_URL));
  assert.ok(metadata.languages['zh-Hant'].startsWith(SITE_URL));
  assert.ok(metadata.languages['x-default'].startsWith(SITE_URL));
});
