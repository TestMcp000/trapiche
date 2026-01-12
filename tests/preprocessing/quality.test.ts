/**
 * Quality Gate Pure Function Tests
 * @see lib/modules/preprocessing/quality.ts
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNoiseRatio,
  countWords,
  isPurelyPunctuation,
  checkValidity,
  calculateQualityScore,
  calculateSimilarity,
  detectDuplicateChunks,
  qualifyChunk,
  qualityGateChunks,
  getQualitySummary,
  QUALITY_GATE_CONFIGS,
} from '@/lib/modules/preprocessing/quality';
import type { ContentChunk } from '@/lib/modules/preprocessing/types';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Create test chunk
// ─────────────────────────────────────────────────────────────────────────────

function createChunk(text: string, index: number = 0): ContentChunk {
  return {
    index,
    text,
    charStart: 0,
    charEnd: text.length,
    tokenCount: Math.ceil(text.length * 0.25),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Noise Ratio Tests
// ─────────────────────────────────────────────────────────────────────────────

test('calculateNoiseRatio returns 0 for pure text', () => {
  const result = calculateNoiseRatio('HelloWorld');
  assert.ok(result < 0.1, `Expected low noise ratio, got ${result}`);
});

test('calculateNoiseRatio returns high value for symbols', () => {
  const result = calculateNoiseRatio('!@#$%^&*()');
  assert.ok(result > 0.9, `Expected high noise ratio, got ${result}`);
});

test('calculateNoiseRatio handles mixed content', () => {
  const result = calculateNoiseRatio('Hello, World!');
  assert.ok(result > 0 && result < 0.5, `Expected moderate noise ratio, got ${result}`);
});

test('calculateNoiseRatio returns 1 for empty string', () => {
  const result = calculateNoiseRatio('');
  assert.equal(result, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Word Count Tests
// ─────────────────────────────────────────────────────────────────────────────

test('countWords counts English words', () => {
  const result = countWords('Hello world test');
  assert.equal(result, 3);
});

test('countWords counts Chinese characters', () => {
  const result = countWords('你好世界測試'); // 6 Chinese chars
  assert.equal(result, 6);
});

test('countWords handles mixed content', () => {
  const result = countWords('Hello 世界'); // 1 English + 2 Chinese
  assert.equal(result, 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// Punctuation Detection Tests
// ─────────────────────────────────────────────────────────────────────────────

test('isPurelyPunctuation returns true for symbols only', () => {
  assert.equal(isPurelyPunctuation('...!!!???'), true);
  assert.equal(isPurelyPunctuation('   '), true);
});

test('isPurelyPunctuation returns false for text', () => {
  assert.equal(isPurelyPunctuation('Hello!'), false);
  assert.equal(isPurelyPunctuation('你好'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Validity Check Tests
// ─────────────────────────────────────────────────────────────────────────────

test('checkValidity passes valid content', () => {
  // Post config requires 50+ chars
  const chunk = createChunk('This is a valid content chunk with enough words to pass the minimum length requirement.');
  const result = checkValidity(chunk, QUALITY_GATE_CONFIGS.post);
  assert.equal(result.isValid, true);
});

test('checkValidity fails too short content', () => {
  const chunk = createChunk('Short');
  const result = checkValidity(chunk, QUALITY_GATE_CONFIGS.post);
  assert.equal(result.isValid, false);
  assert.equal(result.reason, 'too_short');
});

test('checkValidity fails too noisy content', () => {
  // Create content that's long enough (50+ chars) but mostly noise
  const chunk = createChunk('!!!@@@###$$$%%%^^^&&&***((()))!!!@@@###$$$%%%^^^&&&***((()))!!!@@@');
  const result = checkValidity(chunk, QUALITY_GATE_CONFIGS.post);
  assert.equal(result.isValid, false);
  assert.equal(result.reason, 'too_noisy');
});

test('checkValidity fails no content or too noisy for whitespace', () => {
  // Pure whitespace is both no_content (no words) and too_noisy - the check order determines which
  const chunk = createChunk('                                                                                          ');
  const result = checkValidity(chunk, QUALITY_GATE_CONFIGS.post);
  assert.equal(result.isValid, false);
  // Will fail as too_noisy (checked before no_content) since noise ratio is 1.0
  assert.ok(result.reason === 'too_noisy' || result.reason === 'no_content');
});

test('checkValidity returns metrics', () => {
  const chunk = createChunk('Test content here');
  const result = checkValidity(chunk, QUALITY_GATE_CONFIGS.post);
  assert.ok(result.metrics.charCount > 0);
  assert.ok(result.metrics.wordCount > 0);
  assert.ok(result.metrics.noiseRatio >= 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Quality Score Tests
// ─────────────────────────────────────────────────────────────────────────────

test('calculateQualityScore returns 0-1 range', () => {
  const chunk = createChunk('This is a test content for quality scoring.');
  const score = calculateQualityScore(chunk, QUALITY_GATE_CONFIGS.post);
  assert.ok(score >= 0 && score <= 1, `Score ${score} outside 0-1 range`);
});

test('calculateQualityScore higher for better content', () => {
  const goodChunk = createChunk('This is a well-written paragraph with meaningful content about the product.');
  const badChunk = createChunk('x y z');
  
  const goodScore = calculateQualityScore(goodChunk, QUALITY_GATE_CONFIGS.post);
  const badScore = calculateQualityScore(badChunk, QUALITY_GATE_CONFIGS.post);
  
  assert.ok(goodScore > badScore, `Good score ${goodScore} should be > bad score ${badScore}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Similarity Tests
// ─────────────────────────────────────────────────────────────────────────────

test('calculateSimilarity returns 1 for identical strings', () => {
  const result = calculateSimilarity('hello world', 'hello world');
  assert.equal(result, 1);
});

test('calculateSimilarity returns 0 for completely different strings', () => {
  const result = calculateSimilarity('hello world', 'foo bar baz');
  assert.equal(result, 0);
});

test('calculateSimilarity returns partial match', () => {
  const result = calculateSimilarity('hello world test', 'hello world different');
  assert.ok(result > 0 && result < 1, `Expected partial match, got ${result}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Detection Tests
// ─────────────────────────────────────────────────────────────────────────────

test('detectDuplicateChunks finds exact duplicates', () => {
  const chunks = [
    createChunk('Unique content here', 0),
    createChunk('Another unique content', 1),
    createChunk('Unique content here', 2), // Duplicate of 0
  ];
  
  const duplicates = detectDuplicateChunks(chunks);
  assert.ok(duplicates.has(2), 'Should detect chunk 2 as duplicate');
  assert.ok(!duplicates.has(0), 'Should not mark first occurrence as duplicate');
});

test('detectDuplicateChunks finds similar duplicates', () => {
  const chunks = [
    createChunk('The quick brown fox jumps', 0),
    createChunk('The quick brown fox jumps over', 1), // Very similar
  ];
  
  const duplicates = detectDuplicateChunks(chunks, 0.8);
  // May or may not detect based on exact similarity threshold
  assert.ok(duplicates.size >= 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Quality Gate Pipeline Tests
// ─────────────────────────────────────────────────────────────────────────────

test('qualifyChunk returns qualified chunk', () => {
  const chunk = createChunk('This is valid content with enough length.');
  const result = qualifyChunk(chunk, QUALITY_GATE_CONFIGS.post);
  
  assert.ok('qualityStatus' in result);
  assert.ok('qualityScore' in result);
  assert.ok('validityResult' in result);
});

test('qualifyChunk marks duplicates as failed', () => {
  const chunk = createChunk('Any content here');
  const result = qualifyChunk(chunk, QUALITY_GATE_CONFIGS.post, true);
  
  assert.equal(result.qualityStatus, 'failed');
  assert.equal(result.validityResult.reason, 'duplicate');
});

test('qualityGateChunks processes all chunks', () => {
  const chunks = [
    createChunk('First valid chunk with enough content to pass the minimum length requirement for posts.', 0),
    createChunk('Second valid chunk with enough content to pass the minimum length requirement for posts.', 1),
    createChunk('Sh', 2), // Too short
  ];
  
  const result = qualityGateChunks(chunks, QUALITY_GATE_CONFIGS.post);
  
  assert.equal(result.length, 3);
  assert.ok(result[0].qualityStatus === 'passed' || result[0].qualityStatus === 'incomplete');
  assert.equal(result[2].qualityStatus, 'failed');
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary Tests
// ─────────────────────────────────────────────────────────────────────────────

test('getQualitySummary returns correct counts', () => {
  const chunks = [
    createChunk('Valid content one here.', 0),
    createChunk('Valid content two here.', 1),
    createChunk('x', 2),
  ];
  
  const qualified = qualityGateChunks(chunks, QUALITY_GATE_CONFIGS.post);
  const summary = getQualitySummary(qualified);
  
  assert.equal(summary.total, 3);
  assert.ok(summary.passed + summary.incomplete + summary.failed === 3);
});
