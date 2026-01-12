/**
 * Shop Variants Module Tests
 *
 * 測試 lib/modules/shop/variants.ts 的 pure functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOptions,
  generateCombinations,
  generateVariantKey,
  parseVariantKey,
  buildVariantMatrix,
  mergeVariantMatrix,
  applyOverride,
  type OptionAxis,
  type VariantRow,
} from '../lib/modules/shop/variants';

describe('normalizeOptions', () => {
  it('trims whitespace from names and values', () => {
    const axes: OptionAxis[] = [
      { name: '  顏色  ', values: ['  紅  ', '  藍  '] },
    ];
    const result = normalizeOptions(axes);
    assert.deepEqual(result, [{ name: '顏色', values: ['紅', '藍'] }]);
  });

  it('deduplicates values while preserving order', () => {
    const axes: OptionAxis[] = [
      { name: '尺寸', values: ['S', 'M', 'S', 'L', 'M'] },
    ];
    const result = normalizeOptions(axes);
    assert.deepEqual(result, [{ name: '尺寸', values: ['S', 'M', 'L'] }]);
  });

  it('removes empty values and axes', () => {
    const axes: OptionAxis[] = [
      { name: '顏色', values: ['紅', '', '  ', '藍'] },
      { name: '', values: ['A', 'B'] },
      { name: '尺寸', values: [] },
    ];
    const result = normalizeOptions(axes);
    assert.deepEqual(result, [{ name: '顏色', values: ['紅', '藍'] }]);
  });
});

describe('generateCombinations', () => {
  it('generates correct combinations for single axis', () => {
    const axes: OptionAxis[] = [{ name: '顏色', values: ['紅', '藍', '綠'] }];
    const result = generateCombinations(axes);
    assert.deepEqual(result, [{ 顏色: '紅' }, { 顏色: '藍' }, { 顏色: '綠' }]);
  });

  it('generates correct cartesian product for two axes (N×M)', () => {
    const axes: OptionAxis[] = [
      { name: '顏色', values: ['紅', '藍'] },
      { name: '尺寸', values: ['S', 'M'] },
    ];
    const result = generateCombinations(axes);
    assert.equal(result.length, 4); // 2 × 2
    assert.deepEqual(result, [
      { 顏色: '紅', 尺寸: 'S' },
      { 顏色: '紅', 尺寸: 'M' },
      { 顏色: '藍', 尺寸: 'S' },
      { 顏色: '藍', 尺寸: 'M' },
    ]);
  });

  it('generates correct cartesian product for three axes (N×M×K)', () => {
    const axes: OptionAxis[] = [
      { name: '顏色', values: ['紅', '藍'] },
      { name: '尺寸', values: ['S', 'M'] },
      { name: '材質', values: ['棉', '麻', '絲'] },
    ];
    const result = generateCombinations(axes);
    assert.equal(result.length, 12); // 2 × 2 × 3
  });

  it('returns empty array for empty axes', () => {
    assert.deepEqual(generateCombinations([]), []);
  });

  it('order is deterministic', () => {
    const axes: OptionAxis[] = [
      { name: '顏色', values: ['紅', '藍'] },
      { name: '尺寸', values: ['S', 'M'] },
    ];
    const result1 = generateCombinations(axes);
    const result2 = generateCombinations(axes);
    assert.deepEqual(result1, result2);
  });
});

describe('generateVariantKey / parseVariantKey', () => {
  it('generates stable key sorted by axis name', () => {
    const optionValues = { 尺寸: 'S', 顏色: '紅' };
    const key = generateVariantKey(optionValues);
    // 按 Unicode 排序：尺寸(23544) < 顏色(38991)
    assert.equal(key, '尺寸:S|顏色:紅');
  });

  it('same combination always produces same key', () => {
    const combo1 = { 顏色: '紅', 尺寸: 'S' };
    const combo2 = { 尺寸: 'S', 顏色: '紅' };
    assert.equal(generateVariantKey(combo1), generateVariantKey(combo2));
  });

  it('parses key back to optionValues', () => {
    const original = { 尺寸: 'S', 顏色: '紅' };
    const key = generateVariantKey(original);
    const parsed = parseVariantKey(key);
    assert.deepEqual(parsed, original);
  });

  it('handles special characters in values', () => {
    const optionValues = { 'option:1': 'value|with:special' };
    const key = generateVariantKey(optionValues);
    const parsed = parseVariantKey(key);
    assert.deepEqual(parsed, optionValues);
  });

  it('returns empty object for empty key', () => {
    assert.deepEqual(parseVariantKey(''), {});
  });

  it('handles backslash in key and value (roundtrip)', () => {
    const optionValues = { 'option\\name': 'value\\with\\backslash' };
    const key = generateVariantKey(optionValues);
    const parsed = parseVariantKey(key);
    assert.deepEqual(parsed, optionValues);
  });

  it('handles mixed special characters including backslash', () => {
    const optionValues = { 'key:with|special\\chars': 'val:ue|test\\ing' };
    const key = generateVariantKey(optionValues);
    const parsed = parseVariantKey(key);
    assert.deepEqual(parsed, optionValues);
  });

  it('parseVariantKey skips malformed fragments without colon', () => {
    // A malformed key with a fragment that has no colon
    const malformedKey = 'name:value|invalidfragment|other:good';
    const parsed = parseVariantKey(malformedKey);
    // Should skip 'invalidfragment' and parse the valid ones
    assert.deepEqual(parsed, { name: 'value', other: 'good' });
  });

  it('parseVariantKey handles empty fragments gracefully', () => {
    const keyWithEmpty = 'name:value||other:test';
    const parsed = parseVariantKey(keyWithEmpty);
    // Empty fragment should be skipped
    assert.deepEqual(parsed, { name: 'value', other: 'test' });
  });
});

describe('buildVariantMatrix', () => {
  it('builds matrix with default values', () => {
    const axes: OptionAxis[] = [{ name: '顏色', values: ['紅', '藍'] }];
    const matrix = buildVariantMatrix(axes, 1000, 10);

    assert.equal(matrix.length, 2);
    assert.deepEqual(matrix[0], {
      variantKey: '顏色:紅',
      optionValues: { 顏色: '紅' },
      sku: '',
      priceCents: 1000,
      stock: 10,
      enabled: true,
    });
  });

  it('uses zero defaults when not specified', () => {
    const axes: OptionAxis[] = [{ name: '顏色', values: ['紅'] }];
    const matrix = buildVariantMatrix(axes);

    assert.equal(matrix[0].priceCents, 0);
    assert.equal(matrix[0].stock, 0);
  });
});

describe('mergeVariantMatrix', () => {
  it('preserves existing overrides when key matches', () => {
    const existingRows: VariantRow[] = [
      {
        variantKey: '顏色:紅',
        optionValues: { 顏色: '紅' },
        sku: 'RED-001',
        priceCents: 1500,
        stock: 5,
        enabled: false,
      },
    ];

    const newMatrix = buildVariantMatrix(
      [{ name: '顏色', values: ['紅', '藍'] }],
      1000,
      10
    );

    const merged = mergeVariantMatrix(newMatrix, existingRows);

    // 紅色保留覆寫值
    const redRow = merged.find((r) => r.optionValues['顏色'] === '紅');
    assert.deepEqual(redRow, {
      variantKey: '顏色:紅',
      optionValues: { 顏色: '紅' },
      sku: 'RED-001',
      priceCents: 1500,
      stock: 5,
      enabled: false,
    });

    // 藍色使用預設值
    const blueRow = merged.find((r) => r.optionValues['顏色'] === '藍');
    assert.equal(blueRow?.priceCents, 1000);
    assert.equal(blueRow?.stock, 10);
    assert.equal(blueRow?.sku, '');
    assert.equal(blueRow?.enabled, true);
  });

  it('removes rows not in new matrix', () => {
    const existingRows: VariantRow[] = [
      {
        variantKey: '顏色:紅',
        optionValues: { 顏色: '紅' },
        sku: 'RED-001',
        priceCents: 1500,
        stock: 5,
        enabled: true,
      },
      {
        variantKey: '顏色:綠',
        optionValues: { 顏色: '綠' },
        sku: 'GREEN-001',
        priceCents: 1500,
        stock: 5,
        enabled: true,
      },
    ];

    // 新 matrix 只有紅和藍，沒有綠
    const newMatrix = buildVariantMatrix([
      { name: '顏色', values: ['紅', '藍'] },
    ]);

    const merged = mergeVariantMatrix(newMatrix, existingRows);

    assert.equal(merged.length, 2);
    assert.equal(
      merged.find((r) => r.optionValues['顏色'] === '綠'),
      undefined
    );
  });
});

describe('applyOverride', () => {
  it('applies partial override', () => {
    const row: VariantRow = {
      variantKey: '顏色:紅',
      optionValues: { 顏色: '紅' },
      sku: '',
      priceCents: 1000,
      stock: 10,
      enabled: true,
    };

    const result = applyOverride(row, { sku: 'RED-001', priceCents: 1500 });

    assert.equal(result.sku, 'RED-001');
    assert.equal(result.priceCents, 1500);
    assert.equal(result.stock, 10); // unchanged
    assert.equal(result.enabled, true); // unchanged
  });

  it('does not mutate original row', () => {
    const row: VariantRow = {
      variantKey: '顏色:紅',
      optionValues: { 顏色: '紅' },
      sku: '',
      priceCents: 1000,
      stock: 10,
      enabled: true,
    };

    applyOverride(row, { sku: 'NEW-SKU' });

    assert.equal(row.sku, '');
  });
});
