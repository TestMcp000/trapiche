import test from 'node:test';
import assert from 'node:assert/strict';
import { ANON_ID_COOKIE_NAME, isValidAnonId, generateAnonId } from '../lib/utils/anon-id.js';

test('ANON_ID_COOKIE_NAME is defined correctly', () => {
  assert.equal(ANON_ID_COOKIE_NAME, 'anon_id');
});

test('isValidAnonId returns true for valid UUID v4', () => {
  assert.equal(isValidAnonId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isValidAnonId('6ba7b810-9dad-41d4-80b4-00c04fd430c8'), true);
  assert.equal(isValidAnonId('f47ac10b-58cc-4372-a567-0e02b2c3d479'), true);
});

test('isValidAnonId returns false for invalid UUIDs', () => {
  // Wrong version (not 4)
  assert.equal(isValidAnonId('550e8400-e29b-11d4-a716-446655440000'), false);
  
  // Wrong variant (not 8, 9, a, or b)
  assert.equal(isValidAnonId('550e8400-e29b-41d4-0716-446655440000'), false);
  
  // Too short
  assert.equal(isValidAnonId('550e8400-e29b-41d4'), false);
  
  // Invalid characters
  assert.equal(isValidAnonId('550e8400-e29b-41d4-a716-44665544ZZZZ'), false);
  
  // Not a UUID format at all
  assert.equal(isValidAnonId('not-a-uuid'), false);
});

test('isValidAnonId returns false for undefined', () => {
  assert.equal(isValidAnonId(undefined), false);
});

test('isValidAnonId returns false for empty string', () => {
  assert.equal(isValidAnonId(''), false);
});

test('isValidAnonId is case insensitive', () => {
  assert.equal(isValidAnonId('550E8400-E29B-41D4-A716-446655440000'), true);
  assert.equal(isValidAnonId('550e8400-E29B-41d4-A716-446655440000'), true);
});

test('generateAnonId returns a valid UUID v4', () => {
  const result = generateAnonId();
  
  assert.equal(isValidAnonId(result), true);
});

test('generateAnonId returns unique values', () => {
  const results = new Set<string>();
  
  for (let i = 0; i < 100; i++) {
    results.add(generateAnonId());
  }
  
  assert.equal(results.size, 100);
});
