import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReadingTimeMinutes } from '../lib/utils/reading-time';

test('calculateReadingTimeMinutes returns at least 1 minute', () => {
  assert.equal(calculateReadingTimeMinutes('', ''), 1);
  assert.equal(calculateReadingTimeMinutes(null, null), 1);
});

test('calculateReadingTimeMinutes uses English words per minute (200)', () => {
  const words200 = Array.from({ length: 200 }, () => 'w').join(' ');
  assert.equal(calculateReadingTimeMinutes(words200, ''), 1);

  const words201 = `${words200} w`;
  assert.equal(calculateReadingTimeMinutes(words201, ''), 2);
});

test('calculateReadingTimeMinutes uses Chinese chars per minute (500)', () => {
  const chars500 = '字'.repeat(500);
  assert.equal(calculateReadingTimeMinutes('', chars500), 1);

  const chars501 = `${chars500}字`;
  assert.equal(calculateReadingTimeMinutes('', chars501), 2);
});

test('calculateReadingTimeMinutes returns the longer of EN/ZH', () => {
  const words50 = Array.from({ length: 50 }, () => 'w').join(' ');
  const chars1000 = '字'.repeat(1000); // => 2 minutes
  assert.equal(calculateReadingTimeMinutes(words50, chars1000), 2);
});

test('calculateReadingTimeMinutes supports overriding speeds and minimum', () => {
  const words101 = Array.from({ length: 101 }, () => 'w').join(' ');
  assert.equal(calculateReadingTimeMinutes(words101, '', { enWordsPerMinute: 100 }), 2);

  const chars251 = '字'.repeat(251);
  assert.equal(calculateReadingTimeMinutes('', chars251, { zhCharsPerMinute: 250 }), 2);

  assert.equal(calculateReadingTimeMinutes('', '', { minimumMinutes: 3 }), 3);
});
