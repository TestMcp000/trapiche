/**
 * Chunkers Pure Function Tests
 * @see lib/modules/preprocessing/chunkers.ts
 * @see doc/specs/completed/DATA_PREPROCESSING.md §3
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateTokenCount,
  splitBySentences,
  splitByParagraphs,
  splitByFixedSize,
  splitBySemantic,
  extractHeadings,
  getHeadingContext,
  chunkContent,
  chunkContentForType,
  CHUNKING_CONFIGS,
} from '@/lib/modules/preprocessing/chunkers';

// ─────────────────────────────────────────────────────────────────────────────
// Token Estimation Tests
// ─────────────────────────────────────────────────────────────────────────────

test('estimateTokenCount estimates English text', () => {
  const text = 'This is a test sentence with multiple words.';
  const tokens = estimateTokenCount(text);
  assert.ok(tokens > 0 && tokens < 50, `Expected reasonable token count, got ${tokens}`);
});

test('estimateTokenCount estimates Chinese text', () => {
  const text = '這是一個測試句子。'; // 9 Chinese characters
  const tokens = estimateTokenCount(text);
  assert.ok(tokens >= 9 && tokens <= 20, `Expected ~13-14 tokens, got ${tokens}`);
});

test('estimateTokenCount handles mixed content', () => {
  const text = 'Hello 世界 Test 測試';
  const tokens = estimateTokenCount(text);
  assert.ok(tokens > 0, `Expected positive token count, got ${tokens}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Sentence Splitting Tests
// ─────────────────────────────────────────────────────────────────────────────

test('splitBySentences splits on English punctuation', () => {
  const input = 'First sentence. Second sentence! Third sentence?';
  const result = splitBySentences(input);
  assert.equal(result.length, 3);
  assert.ok(result[0].includes('First'));
  assert.ok(result[1].includes('Second'));
  assert.ok(result[2].includes('Third'));
});

test('splitBySentences splits on Chinese punctuation', () => {
  const input = '第一句。第二句！第三句？';
  const result = splitBySentences(input);
  assert.equal(result.length, 3);
});

test('splitBySentences handles empty input', () => {
  const result = splitBySentences('');
  assert.equal(result.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Paragraph Splitting Tests
// ─────────────────────────────────────────────────────────────────────────────

test('splitByParagraphs splits on double newlines', () => {
  const input = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
  const result = splitByParagraphs(input);
  assert.equal(result.length, 3);
});

test('splitByParagraphs handles multiple newlines', () => {
  const input = 'Para 1\n\n\n\nPara 2';
  const result = splitByParagraphs(input);
  assert.equal(result.length, 2);
});

test('splitByParagraphs trims whitespace', () => {
  const input = '  First  \n\n  Second  ';
  const result = splitByParagraphs(input);
  assert.equal(result[0], 'First');
  assert.equal(result[1], 'Second');
});

// ─────────────────────────────────────────────────────────────────────────────
// Fixed Size Splitting Tests
// ─────────────────────────────────────────────────────────────────────────────

test('splitByFixedSize creates chunks of specified size', () => {
  const input = 'A'.repeat(100);
  const result = splitByFixedSize(input, 30, 5);
  assert.ok(result.length >= 3);
  assert.equal(result[0].length, 30);
});

test('splitByFixedSize applies overlap', () => {
  const input = '0123456789'.repeat(5); // 50 chars
  const result = splitByFixedSize(input, 20, 5);
  // With overlap, we should have overlapping content
  assert.ok(result.length >= 2);
});

test('splitByFixedSize handles short content', () => {
  const input = 'Short';
  const result = splitByFixedSize(input, 100, 10);
  assert.equal(result.length, 1);
  assert.equal(result[0], 'Short');
});

// ─────────────────────────────────────────────────────────────────────────────
// Heading Extraction Tests
// ─────────────────────────────────────────────────────────────────────────────

test('extractHeadings finds markdown headings', () => {
  const input = '# Title\n\nContent\n\n## Section\n\nMore content';
  const headings = extractHeadings(input);
  assert.equal(headings.length, 2);
  assert.equal(headings[0].text, 'Title');
  assert.equal(headings[1].text, 'Section');
});

test('extractHeadings returns positions', () => {
  const input = '# First\n\n## Second';
  const headings = extractHeadings(input);
  assert.ok(headings[0].position >= 0);
  assert.ok(headings[1].position > headings[0].position);
});

test('getHeadingContext finds correct heading', () => {
  const headings = [
    { text: 'Intro', position: 0 },
    { text: 'Details', position: 50 },
  ];
  
  assert.equal(getHeadingContext(headings, 25), 'Intro');
  assert.equal(getHeadingContext(headings, 75), 'Details');
});

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Chunking Tests
// ─────────────────────────────────────────────────────────────────────────────

test('splitBySemantic respects heading boundaries', () => {
  // Create content long enough to exceed maxSize (1000 tokens ≈ 4000 chars)
  const longParagraph = 'This is a long paragraph with lots of content that needs to be very long. '.repeat(100);
  const input = `# Section 1\n\n${longParagraph}\n\n# Section 2\n\n${longParagraph}`;
  const config = { ...CHUNKING_CONFIGS.post, useHeadingsAsBoundary: true };
  const result = splitBySemantic(input, config);
  
  assert.ok(result.length >= 2, `Should split on headings, got ${result.length} chunks`);
});

test('splitBySemantic returns single chunk for short content', () => {
  const input = 'Short content.';
  const config = CHUNKING_CONFIGS.post;
  const result = splitBySemantic(input, config);
  
  assert.equal(result.length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Full Chunking Pipeline Tests
// ─────────────────────────────────────────────────────────────────────────────

test('chunkContent returns chunks with metadata', () => {
  const input = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
  const result = chunkContent(input, CHUNKING_CONFIGS.post);
  
  assert.ok(result.chunks.length > 0);
  assert.ok(result.metadata.totalChunks > 0);
  assert.ok(result.metadata.strategy);
});

test('chunkContent tracks token counts', () => {
  const input = 'Test content for chunking.';
  const result = chunkContent(input, CHUNKING_CONFIGS.comment);
  
  assert.ok(result.chunks[0].tokenCount > 0);
});

test('chunkContent tracks positions', () => {
  const input = 'First.\n\nSecond.\n\nThird.';
  const result = chunkContent(input, { ...CHUNKING_CONFIGS.comment, splitBy: 'paragraph' });
  
  for (const chunk of result.chunks) {
    assert.ok(chunk.charStart >= 0);
    assert.ok(chunk.charEnd > chunk.charStart);
  }
});

test('chunkContentForType uses type-specific config', () => {
  const input = 'Product description content.';
  
  const productResult = chunkContentForType(input, 'product');
  const commentResult = chunkContentForType(input, 'comment');
  
  // Both should work but may have different configs applied
  assert.ok(productResult.chunks.length > 0);
  assert.ok(commentResult.chunks.length > 0);
});

test('chunkContent handles empty input', () => {
  const result = chunkContent('', CHUNKING_CONFIGS.post);
  assert.equal(result.chunks.length, 0);
  assert.equal(result.metadata.totalChunks, 0);
});
