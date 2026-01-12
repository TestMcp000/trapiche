import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSlug } from '../lib/utils/slug';

describe('slug', () => {
  it('lowercases and replaces whitespace with hyphens', () => {
    assert.equal(generateSlug('Hello World'), 'hello-world');
    assert.equal(generateSlug('  Hello   World  '), 'hello-world');
  });

  it('collapses and trims hyphens', () => {
    assert.equal(generateSlug('Hello---World'), 'hello-world');
    assert.equal(generateSlug(' - Hello - '), 'hello');
    assert.equal(generateSlug('---'), '');
  });

  it('keeps Chinese and other Unicode letters', () => {
    assert.equal(generateSlug('中文 測試'), '中文-測試');
    assert.equal(generateSlug('中文 & English'), '中文-english');
    assert.equal(generateSlug('ÄÖÜ'), 'äöü');
    assert.equal(generateSlug('Hello世界'), 'hello世界');
  });

  it('keeps underscores for compatibility', () => {
    assert.equal(generateSlug('foo_bar'), 'foo_bar');
  });

  it('returns empty string when no slug can be produced', () => {
    assert.equal(generateSlug('!!!'), '');
  });
});
