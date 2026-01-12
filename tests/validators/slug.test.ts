import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SLUG_REGEX, isValidSlug, validateSlug } from '../../lib/validators/slug';

describe('slug validator', () => {
  describe('SLUG_REGEX', () => {
    it('matches valid slugs', () => {
      assert.ok(SLUG_REGEX.test('abc'));
      assert.ok(SLUG_REGEX.test('a-1'));
      assert.ok(SLUG_REGEX.test('hello-world'));
      assert.ok(SLUG_REGEX.test('123'));
      assert.ok(SLUG_REGEX.test('a1b2c3'));
      assert.ok(SLUG_REGEX.test('a'));
      assert.ok(SLUG_REGEX.test('1'));
    });

    it('rejects invalid slugs', () => {
      assert.ok(!SLUG_REGEX.test('Hello')); // uppercase
      assert.ok(!SLUG_REGEX.test('a__b')); // underscore
      assert.ok(!SLUG_REGEX.test('-abc')); // leading hyphen
      assert.ok(!SLUG_REGEX.test('abc-')); // trailing hyphen
      assert.ok(!SLUG_REGEX.test('a b')); // space
      assert.ok(!SLUG_REGEX.test('')); // empty
      assert.ok(!SLUG_REGEX.test('a--b')); // double hyphen
      assert.ok(!SLUG_REGEX.test('ABC')); // all uppercase
      assert.ok(!SLUG_REGEX.test('a-B-c')); // mixed case
    });
  });

  describe('isValidSlug', () => {
    it('returns true for valid slugs', () => {
      assert.equal(isValidSlug('abc'), true);
      assert.equal(isValidSlug('hello-world'), true);
      assert.equal(isValidSlug('a-1'), true);
      assert.equal(isValidSlug('123'), true);
    });

    it('returns false for invalid slugs', () => {
      assert.equal(isValidSlug('Hello'), false);
      assert.equal(isValidSlug('-abc'), false);
      assert.equal(isValidSlug('abc-'), false);
      assert.equal(isValidSlug('a--b'), false);
      assert.equal(isValidSlug(''), false);
      assert.equal(isValidSlug('a b'), false);
    });
  });

  describe('validateSlug', () => {
    it('returns valid result with trimmed slug for valid input', () => {
      const result = validateSlug('hello-world');
      assert.equal(result.valid, true);
      assert.equal(result.data, 'hello-world');
    });

    it('trims whitespace from input', () => {
      const result = validateSlug('  hello-world  ');
      assert.equal(result.valid, true);
      assert.equal(result.data, 'hello-world');
    });

    it('returns error for empty string', () => {
      const result = validateSlug('');
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('required'));
    });

    it('returns error for whitespace-only string', () => {
      const result = validateSlug('   ');
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('required'));
    });

    it('returns error for invalid format', () => {
      const result = validateSlug('Hello-World');
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('URL-safe'));
    });

    it('returns error for leading hyphen', () => {
      const result = validateSlug('-hello');
      assert.equal(result.valid, false);
    });

    it('returns error for trailing hyphen', () => {
      const result = validateSlug('hello-');
      assert.equal(result.valid, false);
    });

    it('returns error for consecutive hyphens', () => {
      const result = validateSlug('hello--world');
      assert.equal(result.valid, false);
    });
  });
});
