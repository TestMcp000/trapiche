/**
 * Cleaners Pure Function Tests
 * @see lib/modules/preprocessing/cleaners.ts
 * @see doc/specs/completed/DATA_PREPROCESSING.md §2
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  removeHtmlTags,
  removeMarkdownSyntax,
  removeUrls,
  removeEmails,
  removeNoisePatterns,
  normalizeUnicode,
  normalizeWhitespace,
  cleanContent,
  DEFAULT_CLEANER_CONFIG,
} from '@/lib/modules/preprocessing/cleaners';

// ─────────────────────────────────────────────────────────────────────────────
// HTML Removal Tests
// ─────────────────────────────────────────────────────────────────────────────

test('removeHtmlTags removes basic HTML tags', () => {
  const input = '<p>Hello <strong>world</strong></p>';
  const result = removeHtmlTags(input);
  assert.ok(result.includes('Hello'));
  assert.ok(result.includes('world'));
  assert.ok(!result.includes('<p>'));
  assert.ok(!result.includes('<strong>'));
});

test('removeHtmlTags removes script and style tags with content', () => {
  const input = 'Text<script>alert("xss")</script>More<style>.hide{}</style>End';
  const result = removeHtmlTags(input);
  assert.ok(!result.includes('alert'));
  assert.ok(!result.includes('.hide'));
  assert.ok(result.includes('Text'));
  assert.ok(result.includes('End'));
});

test('removeHtmlTags decodes HTML entities', () => {
  const input = '&nbsp;&amp;&lt;&gt;&quot;&#39;';
  const result = removeHtmlTags(input);
  assert.ok(result.includes('&'));
  assert.ok(result.includes('<'));
  assert.ok(result.includes('>'));
  assert.ok(result.includes('"'));
  assert.ok(result.includes("'"));
});

// ─────────────────────────────────────────────────────────────────────────────
// Markdown Removal Tests
// ─────────────────────────────────────────────────────────────────────────────

test('removeMarkdownSyntax removes markdown formatting', () => {
  const input = '# Header\n**bold** and _italic_\n[link](http://example.com)';
  const result = removeMarkdownSyntax(input, false);
  assert.ok(result.includes('Header'));
  assert.ok(result.includes('bold'));
  assert.ok(result.includes('italic'));
  assert.ok(result.includes('link'));
  assert.ok(!result.includes('**'));
  assert.ok(!result.includes('_'));
  assert.ok(!result.includes('http://'));
});

test('removeMarkdownSyntax preserves headings when requested', () => {
  const input = '# Header\nContent';
  const result = removeMarkdownSyntax(input, true);
  assert.ok(result.includes('#'));
  assert.ok(result.includes('Header'));
});

test('removeMarkdownSyntax removes code blocks', () => {
  const input = 'Before\n```js\nconst x = 1;\n```\nAfter';
  const result = removeMarkdownSyntax(input, false);
  assert.ok(result.includes('Before'));
  assert.ok(result.includes('After'));
  assert.ok(!result.includes('const'));
});

// ─────────────────────────────────────────────────────────────────────────────
// URL and Email Removal Tests
// ─────────────────────────────────────────────────────────────────────────────

test('removeUrls removes HTTP and HTTPS URLs', () => {
  const input = 'Visit http://example.com and https://secure.example.com/path';
  const result = removeUrls(input);
  assert.ok(!result.includes('http://'));
  assert.ok(!result.includes('https://'));
  assert.ok(result.includes('Visit'));
});

test('removeEmails redacts email addresses', () => {
  const input = 'Contact test@example.com or admin@site.org';
  const result = removeEmails(input);
  assert.ok(!result.includes('test@example.com'));
  assert.ok(!result.includes('admin@site.org'));
  assert.ok(result.includes('[EMAIL]'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Noise Pattern Removal Tests
// ─────────────────────────────────────────────────────────────────────────────

test('removeNoisePatterns removes UI prompts in content', () => {
  const input = 'Product description here Read more below';
  const result = removeNoisePatterns(input);
  assert.ok(result.includes('Product'));
  assert.ok(!result.includes('Read more'));
});

test('removeNoisePatterns removes copyright notices', () => {
  const input = 'Content here\n© 2025 Company Name';
  const result = removeNoisePatterns(input);
  assert.ok(result.includes('Content'));
  assert.ok(!result.includes('© 2025'));
});

test('removeNoisePatterns removes UI prompts', () => {
  const input = 'Product description 點此閱讀更多';
  const result = removeNoisePatterns(input);
  assert.ok(result.includes('Product'));
  assert.ok(!result.includes('點此閱讀更多'));
});

test('removeNoisePatterns removes ad markers', () => {
  const input = '[AD] Sponsored content here';
  const result = removeNoisePatterns(input);
  assert.ok(!result.includes('[AD]'));
  assert.ok(!result.includes('Sponsored'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Unicode Normalization Tests
// ─────────────────────────────────────────────────────────────────────────────

test('normalizeUnicode converts full-width numbers to half-width', () => {
  const input = '價格：１２３元';
  const result = normalizeUnicode(input);
  assert.ok(result.includes('123'));
  assert.ok(!result.includes('１２３'));
});

test('normalizeUnicode converts full-width letters to half-width', () => {
  const input = 'ＡＢＣＤＥ and ａｂｃｄｅ';
  const result = normalizeUnicode(input);
  assert.ok(result.includes('ABCDE'));
  assert.ok(result.includes('abcde'));
});

test('normalizeUnicode converts full-width punctuation', () => {
  const input = '你好，世界！';
  const result = normalizeUnicode(input);
  assert.ok(result.includes(','));
  assert.ok(result.includes('!'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Whitespace Normalization Tests
// ─────────────────────────────────────────────────────────────────────────────

test('normalizeWhitespace collapses multiple spaces', () => {
  const input = 'Hello    world   test';
  const result = normalizeWhitespace(input);
  assert.equal(result, 'Hello world test');
});

test('normalizeWhitespace collapses multiple newlines', () => {
  const input = 'Line 1\n\n\n\nLine 2';
  const result = normalizeWhitespace(input);
  assert.equal(result, 'Line 1\n\nLine 2');
});

test('normalizeWhitespace trims leading/trailing whitespace', () => {
  const input = '   Content here   ';
  const result = normalizeWhitespace(input);
  assert.equal(result, 'Content here');
});

// ─────────────────────────────────────────────────────────────────────────────
// Full Pipeline Tests
// ─────────────────────────────────────────────────────────────────────────────

test('cleanContent applies all cleaners with default config', () => {
  const input = '<p>Hello <b>world</b></p>\n\nVisit https://example.com\n\n© 2025';
  const result = cleanContent(input, DEFAULT_CLEANER_CONFIG);

  assert.ok(result.cleaned.includes('Hello'));
  assert.ok(result.cleaned.includes('world'));
  assert.ok(!result.cleaned.includes('<p>'));
  assert.ok(!result.cleaned.includes('https://'));
  assert.ok(result.metadata.cleanersApplied.length > 0);
});

test('cleanContent tracks cleaning metadata', () => {
  const input = '<p>Test content</p>';
  const result = cleanContent(input, DEFAULT_CLEANER_CONFIG);

  assert.ok(result.metadata.originalLength > 0);
  assert.ok(result.metadata.cleanedLength > 0);
  assert.ok(result.metadata.cleaningRatio > 0);
  assert.ok(result.metadata.cleaningRatio <= 1);
});

test('cleanContent respects config options', () => {
  const input = '<p>Content with http://url.com</p>';
  
  // With URL removal enabled
  const withRemoval = cleanContent(input, { ...DEFAULT_CLEANER_CONFIG, removeUrls: true });
  assert.ok(!withRemoval.cleaned.includes('http://'));
  
  // With URL removal disabled
  const withoutRemoval = cleanContent(input, { ...DEFAULT_CLEANER_CONFIG, removeUrls: false });
  assert.ok(withoutRemoval.cleaned.includes('http://'));
});
