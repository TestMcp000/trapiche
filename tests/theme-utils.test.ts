import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hexToRgb } from '../lib/modules/theme/resolve';

describe('hexToRgb', () => {
  it('converts valid hex with # prefix', () => {
    const result = hexToRgb('#0071e3');
    assert.deepStrictEqual(result, { r: 0, g: 113, b: 227 });
  });

  it('converts valid hex without # prefix', () => {
    const result = hexToRgb('0071e3');
    assert.deepStrictEqual(result, { r: 0, g: 113, b: 227 });
  });

  it('handles uppercase hex', () => {
    const result = hexToRgb('#FF5500');
    assert.deepStrictEqual(result, { r: 255, g: 85, b: 0 });
  });

  it('handles mixed case hex', () => {
    const result = hexToRgb('#FfAa33');
    assert.deepStrictEqual(result, { r: 255, g: 170, b: 51 });
  });

  it('returns null for invalid hex (too short)', () => {
    const result = hexToRgb('#fff');
    assert.strictEqual(result, null);
  });

  it('returns null for invalid hex (too long)', () => {
    const result = hexToRgb('#0071e3ff');
    assert.strictEqual(result, null);
  });

  it('returns null for invalid characters', () => {
    const result = hexToRgb('#gggggg');
    assert.strictEqual(result, null);
  });

  it('returns null for empty string', () => {
    const result = hexToRgb('');
    assert.strictEqual(result, null);
  });

  it('converts black correctly', () => {
    const result = hexToRgb('#000000');
    assert.deepStrictEqual(result, { r: 0, g: 0, b: 0 });
  });

  it('converts white correctly', () => {
    const result = hexToRgb('#ffffff');
    assert.deepStrictEqual(result, { r: 255, g: 255, b: 255 });
  });
});
