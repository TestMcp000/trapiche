/**
 * Embedding Pure Functions Tests
 * @see lib/modules/embedding/embedding-pure.ts
 * @see doc/specs/completed/SUPABASE_AI.md §2.2
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripHtml,
  stripMarkdown,
  stripHtmlAndMarkdown,
  normalizeWhitespace,
  estimateTokenCount,
  truncateToTokenLimit,
  hashContent,
  composeProductContent,
  composePostContent,
  composeGalleryItemContent,
  composeCommentContent,
  composeEmbeddingContent,
  prepareContentForEmbedding,
} from '@/lib/modules/embedding/embedding-pure';

// ─────────────────────────────────────────────────────────────────────────────
// Text Processing Tests
// ─────────────────────────────────────────────────────────────────────────────

test('stripHtml removes HTML tags', () => {
  const input = '<p>Hello <strong>world</strong></p>';
  const result = stripHtml(input);
  assert.equal(result, 'Hello world');
});

test('stripHtml removes script and style tags', () => {
  const input = 'Text<script>alert("xss")</script>More<style>.hide{}</style>End';
  const result = stripHtml(input);
  // Script/style content is removed, resulting text is collapsed
  assert.equal(result, 'TextMoreEnd');
});

test('stripHtml decodes HTML entities', () => {
  const input = '&nbsp;&amp;&lt;&gt;&quot;&#39;';
  const result = stripHtml(input);
  // Entities are decoded and whitespace collapsed
  assert.equal(result, '&<>"\'');
});

test('stripMarkdown removes markdown syntax', () => {
  const input = '# Header\n**bold** and _italic_\n[link](http://example.com)';
  const result = stripMarkdown(input);
  assert.equal(result, 'Header bold and italic link');
});

test('stripMarkdown removes code blocks', () => {
  const input = 'Before\n```js\nconst x = 1;\n```\nAfter';
  const result = stripMarkdown(input);
  assert.equal(result, 'Before After');
});

test('stripHtmlAndMarkdown combines both strippers', () => {
  const input = '<p>**bold** and [link](url)</p>';
  const result = stripHtmlAndMarkdown(input);
  assert.equal(result, 'bold and link');
});

test('normalizeWhitespace collapses multiple spaces', () => {
  const input = 'Hello    world\n\n\n\ntest';
  const result = normalizeWhitespace(input);
  assert.equal(result, 'Hello world\n\ntest');
});

// ─────────────────────────────────────────────────────────────────────────────
// Token Estimation Tests
// ─────────────────────────────────────────────────────────────────────────────

test('estimateTokenCount estimates English text', () => {
  // 100 words, roughly 25-30 tokens (0.25 tokens/char average)
  const text = 'This is a test sentence. '.repeat(10);
  const tokens = estimateTokenCount(text);
  assert.ok(tokens > 0 && tokens < 100, `Expected reasonable token count, got ${tokens}`);
});

test('estimateTokenCount estimates Chinese text', () => {
  // Chinese characters are ~1.5 tokens each
  const text = '這是一個測試句子。'; // 9 Chinese characters
  const tokens = estimateTokenCount(text);
  assert.ok(tokens >= 9 && tokens <= 20, `Expected ~13-14 tokens, got ${tokens}`);
});

test('estimateTokenCount handles mixed content', () => {
  const text = 'Hello 世界 Test 測試';
  const tokens = estimateTokenCount(text);
  assert.ok(tokens > 0, `Expected positive token count, got ${tokens}`);
});

test('truncateToTokenLimit returns original if under limit', () => {
  const text = 'Short text';
  const result = truncateToTokenLimit(text, 8000);
  assert.equal(result, text);
});

test('truncateToTokenLimit truncates long text', () => {
  // Create text that exceeds limit
  const text = 'Test sentence. '.repeat(5000);
  const result = truncateToTokenLimit(text, 100);
  assert.ok(result.length < text.length, 'Should be truncated');
  assert.ok(estimateTokenCount(result) <= 100, 'Should be under token limit');
});

// ─────────────────────────────────────────────────────────────────────────────
// Content Hashing Tests
// ─────────────────────────────────────────────────────────────────────────────

test('hashContent produces consistent hash', () => {
  const text = 'Hello world';
  const hash1 = hashContent(text);
  const hash2 = hashContent(text);
  assert.equal(hash1, hash2, 'Same input should produce same hash');
});

test('hashContent produces different hashes for different input', () => {
  const hash1 = hashContent('Hello');
  const hash2 = hashContent('World');
  assert.notEqual(hash1, hash2, 'Different input should produce different hash');
});

test('hashContent produces 64-char hex string', () => {
  const hash = hashContent('test');
  assert.equal(hash.length, 64, 'SHA256 produces 64 hex characters');
  assert.ok(/^[a-f0-9]+$/.test(hash), 'Should be lowercase hex');
});

// ─────────────────────────────────────────────────────────────────────────────
// Content Composition Tests
// ─────────────────────────────────────────────────────────────────────────────

test('composeProductContent combines name and descriptions', () => {
  const result = composeProductContent({
    name: 'Product Name',
    description_en: 'English description',
    description_zh: '中文描述',
    tags: ['tag1', 'tag2'],
  });
  assert.ok(result.includes('Product Name'));
  assert.ok(result.includes('English description'));
  assert.ok(result.includes('中文描述'));
  assert.ok(result.includes('tag1, tag2'));
});

test('composeProductContent handles missing fields', () => {
  const result = composeProductContent({
    name: 'Product Name',
  });
  assert.equal(result, 'Product Name');
});

test('composePostContent combines title and excerpt', () => {
  const result = composePostContent({
    title_en: 'English Title',
    title_zh: '中文標題',
    excerpt_en: 'English excerpt',
    excerpt_zh: '中文摘要',
  });
  assert.ok(result.includes('English Title'));
  assert.ok(result.includes('中文標題'));
  assert.ok(result.includes('English excerpt'));
  assert.ok(result.includes('中文摘要'));
});

test('composeGalleryItemContent combines title and description', () => {
  const result = composeGalleryItemContent({
    title_en: 'Gallery Title',
    description_zh: '作品描述',
  });
  assert.ok(result.includes('Gallery Title'));
  assert.ok(result.includes('作品描述'));
});

test('composeCommentContent strips HTML from content', () => {
  const result = composeCommentContent({
    content: '<p>Comment with <b>HTML</b></p>',
  });
  assert.equal(result, 'Comment with HTML');
});

test('composeEmbeddingContent dispatches to correct function', () => {
  const productResult = composeEmbeddingContent('product', { name: 'Test Product' });
  assert.ok(productResult.includes('Test Product'));

  const postResult = composeEmbeddingContent('post', { title_en: 'Test Post' });
  assert.ok(postResult.includes('Test Post'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Prepare Content Tests
// ─────────────────────────────────────────────────────────────────────────────

test('prepareContentForEmbedding returns content and hash', () => {
  const result = prepareContentForEmbedding('product', {
    name: 'Test Product',
    description_en: 'Description',
  });
  assert.ok(result.content.includes('Test Product'));
  assert.equal(result.contentHash.length, 64);
  assert.equal(result.truncated, false);
});

test('prepareContentForEmbedding detects truncation', () => {
  // Create very long content
  const result = prepareContentForEmbedding('post', {
    title_en: 'Test',
    excerpt_en: 'Word '.repeat(50000), // Very long
  });
  assert.equal(result.truncated, true);
});
