import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countLinks,
  escapeHtml,
  isRepetitive,
  sanitizeContent,
  stripHtml,
} from '../lib/security/sanitize';

test('sanitizeContent rejects potentially dangerous content', () => {
  const result = sanitizeContent('<script>alert(1)</script>');
  assert.equal(result.rejected, true);
  assert.equal(result.content, '');
  assert.equal(result.linkCount, 0);
  assert.ok(result.rejectReason);
});

test('sanitizeContent rejects empty input', () => {
  const result = sanitizeContent('');
  assert.equal(result.rejected, true);
  assert.equal(result.content, '');
});

test('sanitizeContent trims and normalizes whitespace', () => {
  const input = '  hello\n\n\n\nworld  ';
  const result = sanitizeContent(input);
  assert.equal(result.rejected, false);
  assert.equal(result.content, 'hello\n\n\nworld');
});

test('sanitizeContent removes control characters (except newline/tab)', () => {
  const input = `hi\u0000there\tok\nnext`;
  const result = sanitizeContent(input);
  assert.equal(result.rejected, false);
  assert.equal(result.content, 'hithere\tok\nnext');
});

test('sanitizeContent counts links before truncation', () => {
  const input = 'a https://example.com b http://example.org';
  const result = sanitizeContent(input, 10);
  assert.equal(result.rejected, false);
  assert.equal(result.linkCount, 2);
});

test('sanitizeContent truncates long content and marks truncated', () => {
  const input = 'word '.repeat(1000);
  const result = sanitizeContent(input, 50);
  assert.equal(result.rejected, false);
  assert.equal(result.truncated, true);
  assert.ok(result.content.length <= 51);
  assert.ok(result.content.endsWith('…'));
});

test('countLinks counts http(s) URLs', () => {
  assert.equal(countLinks('no links here'), 0);
  assert.equal(countLinks('https://a.com'), 1);
  assert.equal(countLinks('https://a.com http://b.com https://c.com'), 3);
});

test('stripHtml removes tags', () => {
  assert.equal(stripHtml('<p>Hello <strong>world</strong></p>'), 'Hello world');
});

test('escapeHtml escapes special characters', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('isRepetitive detects repeated words above threshold', () => {
  assert.equal(isRepetitive('hello hello hello hello hello hello'), true);
  assert.equal(isRepetitive('hello hello hello'), false);
});
