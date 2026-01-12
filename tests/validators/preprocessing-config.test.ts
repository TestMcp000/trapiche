/**
 * Preprocessing Config Validator Tests
 * @see lib/validators/preprocessing-config.ts
 * @see uiux_refactor.md §6.4
 *
 * Tests for Zod schema validation, bounds checking, and merge defaults.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHUNKING_STRATEGIES,
  CHUNKING_BOUNDS,
  QUALITY_BOUNDS,
  chunkingConfigSchema,
  qualityGateConfigSchema,
  typePreprocessingConfigSchema,
  validatePreprocessingConfig,
  validateChunkingConfig,
  mergeChunkingWithDefaults,
  mergeQualityWithDefaults,
  DEFAULT_CHUNKING_CONFIGS,
  DEFAULT_QUALITY_CONFIG,
} from '../../lib/validators/preprocessing-config';

// ============================================================
// Constants Tests
// ============================================================

test('CHUNKING_STRATEGIES contains expected values', () => {
  assert.ok(CHUNKING_STRATEGIES.includes('sentence'));
  assert.ok(CHUNKING_STRATEGIES.includes('paragraph'));
  assert.ok(CHUNKING_STRATEGIES.includes('semantic'));
  assert.ok(CHUNKING_STRATEGIES.includes('fixed'));
  assert.equal(CHUNKING_STRATEGIES.length, 4);
});

test('CHUNKING_BOUNDS has valid ranges', () => {
  assert.ok(CHUNKING_BOUNDS.targetSize.min < CHUNKING_BOUNDS.targetSize.max);
  assert.ok(CHUNKING_BOUNDS.overlap.min < CHUNKING_BOUNDS.overlap.max);
  assert.ok(CHUNKING_BOUNDS.minSize.min < CHUNKING_BOUNDS.minSize.max);
  assert.ok(CHUNKING_BOUNDS.maxSize.min < CHUNKING_BOUNDS.maxSize.max);
});

test('QUALITY_BOUNDS has valid ranges', () => {
  assert.ok(QUALITY_BOUNDS.minLength.min < QUALITY_BOUNDS.minLength.max);
  assert.ok(QUALITY_BOUNDS.maxLength.min < QUALITY_BOUNDS.maxLength.max);
  assert.ok(QUALITY_BOUNDS.minQualityScore.min <= QUALITY_BOUNDS.minQualityScore.max);
  assert.ok(QUALITY_BOUNDS.maxNoiseRatio.min <= QUALITY_BOUNDS.maxNoiseRatio.max);
});

// ============================================================
// chunkingConfigSchema Tests
// ============================================================

test('chunkingConfigSchema accepts valid config', () => {
  const validConfig = {
    targetSize: 300,
    overlap: 50,
    splitBy: 'semantic' as const,
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  };

  const result = chunkingConfigSchema.safeParse(validConfig);
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, validConfig);
  }
});

test('chunkingConfigSchema rejects targetSize below minimum', () => {
  const config = {
    targetSize: CHUNKING_BOUNDS.targetSize.min - 1,
    overlap: 50,
    splitBy: 'semantic' as const,
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  };

  const result = chunkingConfigSchema.safeParse(config);
  assert.equal(result.success, false);
});

test('chunkingConfigSchema rejects targetSize above maximum', () => {
  const config = {
    targetSize: CHUNKING_BOUNDS.targetSize.max + 1,
    overlap: 50,
    splitBy: 'semantic' as const,
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  };

  const result = chunkingConfigSchema.safeParse(config);
  assert.equal(result.success, false);
});

test('chunkingConfigSchema rejects invalid splitBy strategy', () => {
  const config = {
    targetSize: 300,
    overlap: 50,
    splitBy: 'invalid_strategy',
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  };

  const result = chunkingConfigSchema.safeParse(config);
  assert.equal(result.success, false);
});

test('chunkingConfigSchema rejects non-integer values', () => {
  const config = {
    targetSize: 300.5,
    overlap: 50,
    splitBy: 'semantic' as const,
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  };

  const result = chunkingConfigSchema.safeParse(config);
  assert.equal(result.success, false);
});

test('chunkingConfigSchema accepts all valid splitBy strategies', () => {
  for (const strategy of CHUNKING_STRATEGIES) {
    const config = {
      targetSize: 300,
      overlap: 50,
      splitBy: strategy,
      minSize: 64,
      maxSize: 600,
      useHeadingsAsBoundary: false,
    };

    const result = chunkingConfigSchema.safeParse(config);
    assert.equal(result.success, true, `Strategy '${strategy}' should be valid`);
  }
});

// ============================================================
// qualityGateConfigSchema Tests
// ============================================================

test('qualityGateConfigSchema accepts valid config', () => {
  const validConfig = {
    minLength: 16,
    maxLength: 5000,
    minQualityScore: 0.3,
    maxNoiseRatio: 0.7,
  };

  const result = qualityGateConfigSchema.safeParse(validConfig);
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, validConfig);
  }
});

test('qualityGateConfigSchema rejects minQualityScore below 0', () => {
  const config = {
    minLength: 16,
    maxLength: 5000,
    minQualityScore: -0.1,
    maxNoiseRatio: 0.7,
  };

  const result = qualityGateConfigSchema.safeParse(config);
  assert.equal(result.success, false);
});

test('qualityGateConfigSchema rejects minQualityScore above 1', () => {
  const config = {
    minLength: 16,
    maxLength: 5000,
    minQualityScore: 1.1,
    maxNoiseRatio: 0.7,
  };

  const result = qualityGateConfigSchema.safeParse(config);
  assert.equal(result.success, false);
});

test('qualityGateConfigSchema rejects maxNoiseRatio outside bounds', () => {
  const config1 = {
    minLength: 16,
    maxLength: 5000,
    minQualityScore: 0.3,
    maxNoiseRatio: -0.1,
  };

  const config2 = {
    minLength: 16,
    maxLength: 5000,
    minQualityScore: 0.3,
    maxNoiseRatio: 1.5,
  };

  assert.equal(qualityGateConfigSchema.safeParse(config1).success, false);
  assert.equal(qualityGateConfigSchema.safeParse(config2).success, false);
});

test('qualityGateConfigSchema accepts edge case values (0 and 1)', () => {
  const config = {
    minLength: QUALITY_BOUNDS.minLength.min,
    maxLength: QUALITY_BOUNDS.maxLength.min,
    minQualityScore: 0,
    maxNoiseRatio: 1,
  };

  const result = qualityGateConfigSchema.safeParse(config);
  assert.equal(result.success, true);
});

// ============================================================
// typePreprocessingConfigSchema Tests (per-type config)
// ============================================================

test('typePreprocessingConfigSchema accepts empty object', () => {
  const result = typePreprocessingConfigSchema.safeParse({});
  assert.equal(result.success, true);
});

test('typePreprocessingConfigSchema accepts partial chunking config', () => {
  const result = typePreprocessingConfigSchema.safeParse({
    chunking: { targetSize: 400 },
  });
  assert.equal(result.success, true);
});

test('typePreprocessingConfigSchema accepts partial quality config', () => {
  const result = typePreprocessingConfigSchema.safeParse({
    quality: { minLength: 32 },
  });
  assert.equal(result.success, true);
});

test('typePreprocessingConfigSchema accepts full config', () => {
  const result = typePreprocessingConfigSchema.safeParse({
    chunking: { targetSize: 400, overlap: 60 },
    quality: { minLength: 32, maxNoiseRatio: 0.5 },
  });
  assert.equal(result.success, true);
});

test('typePreprocessingConfigSchema rejects invalid chunking values', () => {
  const result = typePreprocessingConfigSchema.safeParse({
    chunking: { targetSize: 'invalid' },
  });
  assert.equal(result.success, false);
});

// ============================================================
// validatePreprocessingConfig Tests
// ============================================================

test('validatePreprocessingConfig handles null/undefined gracefully', () => {
  // null should fail parse but with sensible error
  const nullResult = validatePreprocessingConfig(null);
  assert.equal(nullResult.success, false);

  const undefinedResult = validatePreprocessingConfig(undefined);
  assert.equal(undefinedResult.success, false);
});

test('validatePreprocessingConfig returns error for invalid values', () => {
  const config = {
    product: {
      chunking: { targetSize: -100 }, // Invalid: negative
    },
  };

  const result = validatePreprocessingConfig(config);
  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.ok(result.error.includes('product'));
});

test('validatePreprocessingConfig returns error for invalid target type', () => {
  const config = {
    invalid_type: {
      chunking: { targetSize: 300 },
    },
  };

  const result = validatePreprocessingConfig(config);
  assert.equal(result.success, false);
});

// ============================================================
// validateChunkingConfig Tests
// ============================================================

test('validateChunkingConfig accepts partial config', () => {
  const result = validateChunkingConfig({ targetSize: 400 });
  assert.equal(result.success, true);
  assert.equal(result.data?.targetSize, 400);
});

test('validateChunkingConfig accepts empty config', () => {
  const result = validateChunkingConfig({});
  assert.equal(result.success, true);
  assert.deepEqual(result.data, {});
});

test('validateChunkingConfig rejects invalid values', () => {
  const result = validateChunkingConfig({ targetSize: 'invalid' });
  assert.equal(result.success, false);
  assert.ok(result.error);
});

test('validateChunkingConfig rejects out-of-bounds values', () => {
  const result = validateChunkingConfig({
    targetSize: CHUNKING_BOUNDS.targetSize.max + 1,
  });
  assert.equal(result.success, false);
});

// ============================================================
// mergeChunkingWithDefaults Tests (Core Functionality)
// ============================================================

test('mergeChunkingWithDefaults returns defaults when dbConfig is undefined', () => {
  const result = mergeChunkingWithDefaults('product', undefined);
  assert.deepEqual(result, DEFAULT_CHUNKING_CONFIGS.product);
});

test('mergeChunkingWithDefaults returns defaults for each target type', () => {
  const targetTypes = ['product', 'post', 'gallery_item', 'comment'] as const;

  for (const targetType of targetTypes) {
    const result = mergeChunkingWithDefaults(targetType, undefined);
    assert.deepEqual(result, DEFAULT_CHUNKING_CONFIGS[targetType]);
  }
});

test('mergeChunkingWithDefaults overrides with dbConfig values', () => {
  const dbConfig = { targetSize: 400, overlap: 60 };
  const result = mergeChunkingWithDefaults('product', dbConfig);

  assert.equal(result.targetSize, 400);
  assert.equal(result.overlap, 60);
  // Other values should come from defaults
  assert.equal(result.splitBy, DEFAULT_CHUNKING_CONFIGS.product.splitBy);
  assert.equal(result.minSize, DEFAULT_CHUNKING_CONFIGS.product.minSize);
  assert.equal(result.maxSize, DEFAULT_CHUNKING_CONFIGS.product.maxSize);
  assert.equal(
    result.useHeadingsAsBoundary,
    DEFAULT_CHUNKING_CONFIGS.product.useHeadingsAsBoundary
  );
});

test('mergeChunkingWithDefaults handles partial overrides', () => {
  const dbConfig = { splitBy: 'paragraph' as const };
  const result = mergeChunkingWithDefaults('post', dbConfig);

  assert.equal(result.splitBy, 'paragraph');
  assert.equal(result.targetSize, DEFAULT_CHUNKING_CONFIGS.post.targetSize);
});

test('mergeChunkingWithDefaults handles empty object dbConfig', () => {
  const result = mergeChunkingWithDefaults('gallery_item', {});
  assert.deepEqual(result, DEFAULT_CHUNKING_CONFIGS.gallery_item);
});

test('mergeChunkingWithDefaults respects all overridable fields', () => {
  const dbConfig = {
    targetSize: 250,
    overlap: 30,
    splitBy: 'fixed' as const,
    minSize: 50,
    maxSize: 500,
    useHeadingsAsBoundary: false,
  };

  const result = mergeChunkingWithDefaults('comment', dbConfig);
  assert.deepEqual(result, dbConfig);
});

test('mergeChunkingWithDefaults preserves type-specific defaults', () => {
  // Product and post have different default targetSize
  const productResult = mergeChunkingWithDefaults('product', undefined);
  const postResult = mergeChunkingWithDefaults('post', undefined);

  assert.notEqual(productResult.targetSize, postResult.targetSize);
  assert.equal(productResult.targetSize, 300);
  assert.equal(postResult.targetSize, 500);
});

// ============================================================
// mergeQualityWithDefaults Tests (Core Functionality)
// ============================================================

test('mergeQualityWithDefaults returns defaults when dbConfig is undefined', () => {
  const result = mergeQualityWithDefaults(undefined);
  assert.deepEqual(result, DEFAULT_QUALITY_CONFIG);
});

test('mergeQualityWithDefaults overrides with dbConfig values', () => {
  const dbConfig = { minLength: 32, maxNoiseRatio: 0.5 };
  const result = mergeQualityWithDefaults(dbConfig);

  assert.equal(result.minLength, 32);
  assert.equal(result.maxNoiseRatio, 0.5);
  // Other values should come from defaults
  assert.equal(result.maxLength, DEFAULT_QUALITY_CONFIG.maxLength);
  assert.equal(result.minQualityScore, DEFAULT_QUALITY_CONFIG.minQualityScore);
});

test('mergeQualityWithDefaults handles empty object dbConfig', () => {
  const result = mergeQualityWithDefaults({});
  assert.deepEqual(result, DEFAULT_QUALITY_CONFIG);
});

test('mergeQualityWithDefaults respects all overridable fields', () => {
  const dbConfig = {
    minLength: 24,
    maxLength: 6000,
    minQualityScore: 0.4,
    maxNoiseRatio: 0.6,
  };

  const result = mergeQualityWithDefaults(dbConfig);
  assert.deepEqual(result, dbConfig);
});

test('mergeQualityWithDefaults handles single field override', () => {
  const result = mergeQualityWithDefaults({ minQualityScore: 0.5 });

  assert.equal(result.minQualityScore, 0.5);
  assert.equal(result.minLength, DEFAULT_QUALITY_CONFIG.minLength);
  assert.equal(result.maxLength, DEFAULT_QUALITY_CONFIG.maxLength);
  assert.equal(result.maxNoiseRatio, DEFAULT_QUALITY_CONFIG.maxNoiseRatio);
});

// ============================================================
// Default Configs Validation Tests
// ============================================================

test('DEFAULT_CHUNKING_CONFIGS are all valid', () => {
  const targetTypes = ['product', 'post', 'gallery_item', 'comment'] as const;

  for (const targetType of targetTypes) {
    const config = DEFAULT_CHUNKING_CONFIGS[targetType];
    const result = chunkingConfigSchema.safeParse(config);
    assert.equal(result.success, true, `Default config for ${targetType} should be valid`);
  }
});

test('DEFAULT_QUALITY_CONFIG is valid', () => {
  const result = qualityGateConfigSchema.safeParse(DEFAULT_QUALITY_CONFIG);
  assert.equal(result.success, true);
});

test('DEFAULT_CHUNKING_CONFIGS have sensible relationships', () => {
  const targetTypes = ['product', 'post', 'gallery_item', 'comment'] as const;

  for (const targetType of targetTypes) {
    const config = DEFAULT_CHUNKING_CONFIGS[targetType];
    // minSize should be less than targetSize
    assert.ok(
      config.minSize < config.targetSize,
      `${targetType}: minSize should be less than targetSize`
    );
    // targetSize should be less than maxSize
    assert.ok(
      config.targetSize < config.maxSize,
      `${targetType}: targetSize should be less than maxSize`
    );
    // overlap should be less than targetSize
    assert.ok(
      config.overlap < config.targetSize,
      `${targetType}: overlap should be less than targetSize`
    );
  }
});

test('DEFAULT_QUALITY_CONFIG has sensible relationships', () => {
  // minLength should be less than maxLength
  assert.ok(DEFAULT_QUALITY_CONFIG.minLength < DEFAULT_QUALITY_CONFIG.maxLength);
  // scores are within valid range
  assert.ok(DEFAULT_QUALITY_CONFIG.minQualityScore >= 0);
  assert.ok(DEFAULT_QUALITY_CONFIG.minQualityScore <= 1);
  assert.ok(DEFAULT_QUALITY_CONFIG.maxNoiseRatio >= 0);
  assert.ok(DEFAULT_QUALITY_CONFIG.maxNoiseRatio <= 1);
});
