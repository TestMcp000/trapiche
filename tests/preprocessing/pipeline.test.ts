/**
 * Preprocessing Pipeline Tests
 * @see lib/modules/preprocessing/preprocess-pure.ts
 * @see doc/specs/completed/DATA_PREPROCESSING.md §11
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCleaningConfig,
  getChunkingConfig,
  getQualityConfig,
  getPreprocessingConfig,
  preprocessContent,
  preprocessAndFilter,
} from '@/lib/modules/preprocessing/preprocess-pure';
import type { PreprocessingInput } from '@/lib/modules/preprocessing/types';

// ─────────────────────────────────────────────────────────────────────────────
// Config Getter Tests
// ─────────────────────────────────────────────────────────────────────────────

test('getCleaningConfig returns config for product', () => {
  const config = getCleaningConfig('product');
  assert.ok(config.removeHtml);
  assert.ok(config.removeMarkdown);
});

test('getChunkingConfig returns config for post', () => {
  const config = getChunkingConfig('post');
  assert.ok(config.targetSize > 0);
  assert.ok(config.maxSize > config.targetSize);
});

test('getQualityConfig returns config for comment', () => {
  const config = getQualityConfig('comment');
  assert.ok(config.minLength >= 0);
  assert.ok(config.maxNoiseRatio > 0);
});

test('getPreprocessingConfig returns full config', () => {
  const config = getPreprocessingConfig('gallery_item');
  assert.ok('cleaning' in config);
  assert.ok('chunking' in config);
  assert.ok('quality' in config);
});

// ─────────────────────────────────────────────────────────────────────────────
// Full Pipeline Tests
// ─────────────────────────────────────────────────────────────────────────────

test('preprocessContent processes product content', () => {
  const input: PreprocessingInput = {
    targetType: 'product',
    rawContent: '<p>This is a <b>product description</b> with HTML.</p>\n\nIt has multiple paragraphs.',
  };
  
  const result = preprocessContent(input);
  
  assert.ok(result.chunks.length > 0, 'Should produce chunks');
  assert.ok(result.metadata.cleaning.originalLength > 0);
  assert.ok(result.metadata.chunking.totalChunks > 0);
  assert.ok(result.metadata.quality.total > 0);
});

test('preprocessContent processes post content', () => {
  const input: PreprocessingInput = {
    targetType: 'post',
    rawContent: '# Blog Post Title\n\nFirst paragraph of the blog post.\n\n## Section\n\nSecond paragraph here.',
  };
  
  const result = preprocessContent(input);
  
  assert.ok(result.chunks.length > 0);
  assert.ok(result.metadata.cleaning.cleanersApplied.length > 0);
});

test('preprocessContent processes gallery content', () => {
  const input: PreprocessingInput = {
    targetType: 'gallery_item',
    rawContent: 'Beautiful sunset photograph taken at the beach.',
  };
  
  const result = preprocessContent(input);
  
  assert.ok(result.chunks.length > 0);
  // Gallery items have simpler cleaning
  assert.ok(result.metadata.quality.total > 0);
});

test('preprocessContent processes comment content', () => {
  const input: PreprocessingInput = {
    targetType: 'comment',
    rawContent: 'This is a user comment on the post. Great article!',
  };
  
  const result = preprocessContent(input);
  
  assert.ok(result.chunks.length > 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Metadata Tests
// ─────────────────────────────────────────────────────────────────────────────

test('preprocessContent returns cleaning metadata', () => {
  const input: PreprocessingInput = {
    targetType: 'product',
    rawContent: '<div>Product content here with lots of text to clean.</div>',
  };
  
  const result = preprocessContent(input);
  
  assert.ok(result.metadata.cleaning.originalLength > 0);
  assert.ok(result.metadata.cleaning.cleanedLength > 0);
  assert.ok(result.metadata.cleaning.cleaningRatio > 0);
  assert.ok(result.metadata.cleaning.cleanersApplied.length > 0);
});

test('preprocessContent returns chunking metadata', () => {
  const input: PreprocessingInput = {
    targetType: 'post',
    rawContent: 'Long content.\n\nWith paragraphs.\n\nFor chunking.',
  };
  
  const result = preprocessContent(input);
  
  assert.ok(result.metadata.chunking.totalChunks > 0);
  assert.ok(result.metadata.chunking.strategy);
  assert.ok(result.metadata.chunking.originalLength > 0);
});

test('preprocessContent returns quality metadata', () => {
  const input: PreprocessingInput = {
    targetType: 'product',
    rawContent: 'Product description with enough content to pass quality checks.',
  };
  
  const result = preprocessContent(input);
  
  const quality = result.metadata.quality;
  assert.ok(quality.total > 0);
  assert.equal(quality.total, quality.passed + quality.incomplete + quality.failed);
});

// ─────────────────────────────────────────────────────────────────────────────
// Filter Tests
// ─────────────────────────────────────────────────────────────────────────────

test('preprocessAndFilter excludes failed chunks', () => {
  const input: PreprocessingInput = {
    targetType: 'post',
    rawContent: 'Valid content here.\n\n.\n\nAnother valid paragraph.',
  };
  
  const result = preprocessAndFilter(input);
  
  // All returned chunks should be passed or incomplete
  for (const chunk of result.chunks) {
    assert.notEqual(chunk.qualityStatus, 'failed');
  }
});

test('preprocessAndFilter preserves metadata', () => {
  const input: PreprocessingInput = {
    targetType: 'product',
    rawContent: 'Product content for testing.',
  };
  
  const result = preprocessAndFilter(input);
  
  // Metadata should still reflect original counts
  assert.ok(result.metadata.cleaning.originalLength > 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

test('preprocessContent handles empty content', () => {
  const input: PreprocessingInput = {
    targetType: 'product',
    rawContent: '',
  };
  
  const result = preprocessContent(input);
  
  assert.equal(result.chunks.length, 0);
  assert.equal(result.metadata.quality.total, 0);
});

test('preprocessContent handles HTML-only content', () => {
  const input: PreprocessingInput = {
    targetType: 'post',
    rawContent: '<div class="nav">Menu</div><footer>© 2025</footer>',
  };
  
  const result = preprocessContent(input);
  
  // After cleaning, may have minimal or no content
  assert.ok(result.metadata.cleaning.cleanedLength <= result.metadata.cleaning.originalLength);
});
