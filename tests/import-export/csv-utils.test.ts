/**
 * CSV Utilities Unit Tests
 *
 * Tests for pure CSV formatting functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeCsvCell,
  toIsoUtc,
  nullToEmpty,
  boolToCsv,
  arrayToCsvValue,
  arrayToCsvRow,
  toCsv,
} from '../../lib/modules/import-export/formatters/csv/csv-utils';

describe('CSV Utilities', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null', () => {
      assert.equal(escapeCsvCell(null), '');
    });

    it('returns empty string for undefined', () => {
      assert.equal(escapeCsvCell(undefined), '');
    });

    it('returns plain string for simple values', () => {
      assert.equal(escapeCsvCell('hello'), 'hello');
      assert.equal(escapeCsvCell(123), '123');
    });

    it('quotes strings containing commas', () => {
      assert.equal(escapeCsvCell('hello, world'), '"hello, world"');
    });

    it('quotes strings containing newlines', () => {
      assert.equal(escapeCsvCell('hello\nworld'), '"hello\nworld"');
    });

    it('quotes strings containing quotes and doubles them', () => {
      assert.equal(escapeCsvCell('say "hello"'), '"say ""hello"""');
    });

    it('handles complex strings with multiple special chars', () => {
      assert.equal(escapeCsvCell('a, "b"\nc'), '"a, ""b""\nc"');
    });
  });

  describe('toIsoUtc', () => {
    it('returns empty string for null', () => {
      assert.equal(toIsoUtc(null), '');
    });

    it('returns empty string for undefined', () => {
      assert.equal(toIsoUtc(undefined), '');
    });

    it('converts ISO string to ISO format', () => {
      const result = toIsoUtc('2024-01-15T10:30:00Z');
      assert.equal(result, '2024-01-15T10:30:00.000Z');
    });

    it('converts Date object to ISO format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = toIsoUtc(date);
      assert.equal(result, '2024-01-15T10:30:00.000Z');
    });

    it('returns empty string for invalid date', () => {
      assert.equal(toIsoUtc('invalid-date'), '');
    });
  });

  describe('nullToEmpty', () => {
    it('returns empty string for null', () => {
      assert.equal(nullToEmpty(null), '');
    });

    it('returns empty string for undefined', () => {
      assert.equal(nullToEmpty(undefined), '');
    });

    it('returns string representation for numbers', () => {
      assert.equal(nullToEmpty(123), '123');
    });

    it('returns string as-is', () => {
      assert.equal(nullToEmpty('test'), 'test');
    });
  });

  describe('boolToCsv', () => {
    it('returns "true" for true', () => {
      assert.equal(boolToCsv(true), 'true');
    });

    it('returns "false" for false', () => {
      assert.equal(boolToCsv(false), 'false');
    });
  });

  describe('arrayToCsvValue', () => {
    it('returns empty string for null', () => {
      assert.equal(arrayToCsvValue(null), '');
    });

    it('returns empty string for empty array', () => {
      assert.equal(arrayToCsvValue([]), '');
    });

    it('joins array elements with comma and quotes', () => {
      assert.equal(arrayToCsvValue(['a', 'b', 'c']), '"a,b,c"');
    });
  });

  describe('arrayToCsvRow', () => {
    it('joins cells with comma', () => {
      assert.equal(arrayToCsvRow(['a', 'b', 'c']), 'a,b,c');
    });
  });

  describe('toCsv', () => {
    it('generates CSV with headers and rows', () => {
      const headers = ['name', 'age'];
      const rows = [
        ['Alice', '30'],
        ['Bob', '25'],
      ];
      const result = toCsv(headers, rows);
      assert.equal(result, 'name,age\r\nAlice,30\r\nBob,25');
    });

    it('escapes headers with special characters', () => {
      const headers = ['name, title', 'age'];
      const rows = [['test', '30']];
      const result = toCsv(headers, rows);
      assert.equal(result, '"name, title",age\r\ntest,30');
    });
  });
});
