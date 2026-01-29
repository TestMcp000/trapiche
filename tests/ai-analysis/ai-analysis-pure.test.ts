/**
 * AI Analysis Pure Function Tests
 *
 * Tests for pure functions in the AI analysis module.
 * Uses Node.js built-in test runner.
 *
 * @see lib/modules/ai-analysis/analysis-pure.ts
 * @see lib/validators/ai-analysis.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  estimateTokenCount,
  estimateDataTokens,
  estimateOutputTokens,
  calculateTokenCost,
  generateCostWarnings,
  estimateAnalysisCost,
  simpleHash,
  isPiiField,
  deidentifyRecord,
  deidentifyData,
  getDataPriority,
  prioritizedSample,
  formatCostUsd,
  formatTokenCount,
  // Seeded deterministic sampling
  hashString,
  createSeededRandom,
  seededShuffle,
  seededPrioritizedSample,
} from '../../lib/modules/ai-analysis/analysis-pure';

import {
  isValidTemplateId,
  validateTemplateId,
  isValidDataType,
  validateDataTypes,
  getRequiredDataTypes,
  validateRequiredDataTypes,
  mergeWithRequiredTypes,
  isValidMode,
  isValidIsoDate,
  validateDateRange,
  validateAnalysisRequest,
} from '../../lib/validators/ai-analysis';

import type { ModelPricing } from '../../lib/types/ai-analysis';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_PRICING: ModelPricing = {
  modelId: 'openai/gpt-4',
  modelName: 'GPT-4',
  inputPricePerMillion: 10.0,
  outputPricePerMillion: 30.0,
};

const MOCK_DATA = [
  { id: '1', type: 'comment', content: 'Great!', email: 'john@example.com' },
  { id: '2', type: 'comment', content: 'Nice!', email: 'jane@example.com' },
  { id: '3', type: 'reaction', target: 'post', email: 'user@test.com' },
];

// =============================================================================
// Token Estimation Tests
// =============================================================================

describe('Token Estimation', () => {
  describe('estimateTokenCount', () => {
    it('estimates tokens for English text', () => {
      const text = 'Hello, world!'; // 13 chars
      const tokens = estimateTokenCount(text);
      // 13 / 4 = 3.25, ceil = 4
      assert.equal(tokens, 4);
    });

    it('estimates tokens for longer text', () => {
      const text = 'a'.repeat(100); // 100 chars
      const tokens = estimateTokenCount(text);
      // 100 / 4 = 25
      assert.equal(tokens, 25);
    });

    it('returns 0 for empty string', () => {
      assert.equal(estimateTokenCount(''), 0);
    });

    it('returns 0 for null/undefined', () => {
      assert.equal(estimateTokenCount(null as unknown as string), 0);
      assert.equal(estimateTokenCount(undefined as unknown as string), 0);
    });
  });

  describe('estimateDataTokens', () => {
    it('estimates tokens for data array', () => {
      const tokens = estimateDataTokens(MOCK_DATA);
      assert.ok(tokens > 0);
    });

    it('returns 0 for empty array', () => {
      assert.equal(estimateDataTokens([]), 0);
    });

    it('returns 0 for non-array', () => {
      assert.equal(estimateDataTokens({} as unknown as unknown[]), 0);
    });
  });

  describe('estimateOutputTokens', () => {
    it('estimates output as 30% of input', () => {
      const output = estimateOutputTokens(100);
      assert.equal(output, 30);
    });

    it('rounds up', () => {
      const output = estimateOutputTokens(10);
      // 10 * 0.3 = 3
      assert.equal(output, 3);
    });
  });
});

// =============================================================================
// Cost Estimation Tests
// =============================================================================

describe('Cost Estimation', () => {
  describe('calculateTokenCost', () => {
    it('calculates input cost correctly', () => {
      const cost = calculateTokenCost(1000, 10.0);
      // 1000 / 1,000,000 * 10 = 0.01
      assert.equal(cost, 0.01);
    });

    it('calculates cost for large token counts', () => {
      const cost = calculateTokenCost(1_000_000, 10.0);
      assert.equal(cost, 10.0);
    });
  });

  describe('generateCostWarnings', () => {
    it('generates high cost warning', () => {
      const warnings = generateCostWarnings(1.5, 100);
      assert.equal(warnings.length, 1);
      assert.equal(warnings[0].type, 'high_cost');
    });

    it('generates large dataset warning', () => {
      const warnings = generateCostWarnings(0.5, 6000);
      assert.equal(warnings.length, 1);
      assert.equal(warnings[0].type, 'large_dataset');
    });

    it('generates forced sampling warning', () => {
      const warnings = generateCostWarnings(0.5, 15000);
      assert.equal(warnings.length, 1);
      assert.equal(warnings[0].type, 'forced_sampling');
    });

    it('generates multiple warnings', () => {
      const warnings = generateCostWarnings(2.0, 15000);
      assert.equal(warnings.length, 2);
      const types = warnings.map((w) => w.type);
      assert.ok(types.includes('high_cost'));
      assert.ok(types.includes('forced_sampling'));
    });

    it('returns empty for safe values', () => {
      const warnings = generateCostWarnings(0.5, 1000);
      assert.equal(warnings.length, 0);
    });
  });

  describe('estimateAnalysisCost', () => {
    it('returns complete cost estimate', () => {
      const estimate = estimateAnalysisCost(MOCK_DATA, MOCK_PRICING);

      assert.equal(estimate.recordCount, 3);
      assert.ok(estimate.estimatedInputTokens > 0);
      assert.ok(estimate.estimatedOutputTokens > 0);
      assert.ok(estimate.estimatedTotalCost >= 0);
      assert.ok(Array.isArray(estimate.warnings));
    });
  });
});

// =============================================================================
// De-identification Tests
// =============================================================================

describe('De-identification', () => {
  describe('simpleHash', () => {
    it('produces consistent hash for same input', () => {
      const hash1 = simpleHash('test@example.com', 'user');
      const hash2 = simpleHash('test@example.com', 'user');
      assert.equal(hash1, hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = simpleHash('test1@example.com', 'user');
      const hash2 = simpleHash('test2@example.com', 'user');
      assert.notEqual(hash1, hash2);
    });

    it('uses prefix in output', () => {
      const hash = simpleHash('test', 'email');
      assert.ok(hash.startsWith('email_'));
    });

    it('handles empty input', () => {
      const hash = simpleHash('', 'user');
      assert.equal(hash, 'user_unknown');
    });
  });

  describe('isPiiField', () => {
    it('identifies email field', () => {
      assert.equal(isPiiField('email'), true);
      assert.equal(isPiiField('user_email'), true);
    });

    it('identifies phone field', () => {
      assert.equal(isPiiField('phone'), true);
      assert.equal(isPiiField('phone_number'), true);
    });

    it('identifies name fields', () => {
      assert.equal(isPiiField('name'), true);
      assert.equal(isPiiField('full_name'), true);
      assert.equal(isPiiField('first_name'), true);
    });

    it('rejects non-PII fields', () => {
      assert.equal(isPiiField('id'), false);
      assert.equal(isPiiField('amount'), false);
      assert.equal(isPiiField('created_at'), false);
    });
  });

  describe('deidentifyRecord', () => {
    it('hashes email field', () => {
      const record = { id: '1', email: 'test@example.com' };
      const result = deidentifyRecord(record);

      assert.equal(result.id, '1');
      assert.ok((result.email as string).startsWith('email_'));
      assert.notEqual(result.email, 'test@example.com');
    });

    it('preserves non-PII fields', () => {
      const record = { id: '1', amount: 100, type: 'comment' };
      const result = deidentifyRecord(record);

      assert.equal(result.id, '1');
      assert.equal(result.amount, 100);
      assert.equal(result.type, 'comment');
    });

    it('handles nested objects', () => {
      const record = { id: '1', user: { email: 'test@example.com', role: 'admin' } };
      const result = deidentifyRecord(record);

      const user = result.user as Record<string, unknown>;
      assert.ok((user.email as string).startsWith('email_'));
      assert.equal(user.role, 'admin');
    });
  });

  describe('deidentifyData', () => {
    it('de-identifies array of records', () => {
      const result = deidentifyData(MOCK_DATA as unknown as Record<string, unknown>[]);

      assert.equal(result.length, 3);
      result.forEach((record) => {
        assert.ok((record.email as string).startsWith('email_'));
      });
    });

    it('returns empty array for non-array', () => {
      const result = deidentifyData({} as unknown as Record<string, unknown>[]);
      assert.deepEqual(result, []);
    });
  });
});

// =============================================================================
// Sampling Tests
// =============================================================================

describe('Data Sampling', () => {
  describe('getDataPriority', () => {
    it('returns highest priority for comments', () => {
      assert.equal(getDataPriority('comment'), 3);
      assert.equal(getDataPriority('comments'), 3);
    });

    it('returns low priority for reactions', () => {
      assert.equal(getDataPriority('reaction'), 1);
      assert.equal(getDataPriority('like'), 1);
    });

    it('returns lowest priority for views', () => {
      assert.equal(getDataPriority('view'), 0);
      assert.equal(getDataPriority('views'), 0);
    });

    it('returns default for unknown types', () => {
      assert.equal(getDataPriority('unknown'), 1);
    });
  });

  describe('prioritizedSample', () => {
    it('returns all data when under limit', () => {
      const data = [
        { type: 'comment', id: 1 },
        { type: 'reaction', id: 2 },
      ];
      const result = prioritizedSample(data, 10);
      assert.equal(result.length, 2);
    });

    it('prioritizes comments over reactions', () => {
      const data = [
        { type: 'comment', id: 1 },
        { type: 'comment', id: 2 },
        { type: 'reaction', id: 3 },
        { type: 'reaction', id: 4 },
      ];
      const result = prioritizedSample(data, 2);

      // Should keep the 2 comments (higher priority)
      assert.equal(result.length, 2);
      assert.ok(result.every((r) => r.type === 'comment'));
    });

    it('handles empty array', () => {
      const result = prioritizedSample([], 10);
      assert.deepEqual(result, []);
    });
  });

  describe('hashString', () => {
    it('produces consistent hash for same input', () => {
      const hash1 = hashString('test-report-123');
      const hash2 = hashString('test-report-123');
      assert.equal(hash1, hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = hashString('report-1');
      const hash2 = hashString('report-2');
      assert.notEqual(hash1, hash2);
    });

    it('handles empty string', () => {
      assert.equal(hashString(''), 0);
    });

    it('handles null/undefined', () => {
      assert.equal(hashString(null as unknown as string), 0);
      assert.equal(hashString(undefined as unknown as string), 0);
    });
  });

  describe('createSeededRandom', () => {
    it('produces consistent sequence for same seed', () => {
      const random1 = createSeededRandom(12345);
      const random2 = createSeededRandom(12345);

      const seq1 = [random1(), random1(), random1()];
      const seq2 = [random2(), random2(), random2()];

      assert.deepEqual(seq1, seq2);
    });

    it('produces different sequences for different seeds', () => {
      const random1 = createSeededRandom(12345);
      const random2 = createSeededRandom(67890);

      const val1 = random1();
      const val2 = random2();

      assert.notEqual(val1, val2);
    });

    it('returns values in [0, 1) range', () => {
      const random = createSeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const val = random();
        assert.ok(val >= 0 && val < 1, `Value ${val} should be in [0, 1)`);
      }
    });
  });

  describe('seededShuffle', () => {
    it('produces consistent shuffle for same seed', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result1 = seededShuffle(input, 12345);
      const result2 = seededShuffle(input, 12345);

      assert.deepEqual(result1, result2);
    });

    it('produces different shuffles for different seeds', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result1 = seededShuffle(input, 12345);
      const result2 = seededShuffle(input, 67890);

      // May not be different for all cases, but highly likely
      // Use JSON stringify for comparison
      assert.notEqual(
        JSON.stringify(result1),
        JSON.stringify(result2),
        'Shuffles should differ for different seeds'
      );
    });

    it('does not mutate original array', () => {
      const input = [1, 2, 3, 4, 5];
      const original = [...input];
      seededShuffle(input, 42);

      assert.deepEqual(input, original);
    });

    it('preserves all elements', () => {
      const input = [1, 2, 3, 4, 5];
      const result = seededShuffle(input, 42);

      assert.equal(result.length, input.length);
      for (const item of input) {
        assert.ok(result.includes(item), `Result should include ${item}`);
      }
    });
  });

  describe('seededPrioritizedSample', () => {
    it('returns all data when under limit (not sampled)', () => {
      const data = [
        { _dataType: 'comments', id: 1, created_at: '2025-01-01' },
        { _dataType: 'views', id: 2, created_at: '2025-01-02' },
      ];
      const result = seededPrioritizedSample(data, 10, 'seed-1');

      assert.equal(result.wasSampled, false);
      assert.equal(result.originalCount, 2);
      assert.equal(result.sampledCount, 2);
      assert.equal(result.data.length, 2);
    });

    it('produces consistent output for same seed (deterministic)', () => {
      const data = [
        { _dataType: 'comments', id: 1, created_at: '2025-01-01' },
        { _dataType: 'comments', id: 2, created_at: '2025-01-02' },
        { _dataType: 'comments', id: 3, created_at: '2025-01-03' },
        { _dataType: 'reactions', id: 4, created_at: '2025-01-04' },
        { _dataType: 'views', id: 5, created_at: '2025-01-05' },
      ];

      const result1 = seededPrioritizedSample(data, 3, 'report-123');
      const result2 = seededPrioritizedSample(data, 3, 'report-123');

      assert.deepEqual(result1, result2);
    });

    it('produces different output for different seeds', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        _dataType: 'reactions',
        id: i,
        created_at: `2025-01-${String(i + 1).padStart(2, '0')}`,
      }));

      const result1 = seededPrioritizedSample(data, 5, 'seed-A');
      const result2 = seededPrioritizedSample(data, 5, 'seed-B');

      // Both are sampled
      assert.equal(result1.wasSampled, true);
      assert.equal(result2.wasSampled, true);

      // Sampled data should differ (very high probability)
      assert.notEqual(
        JSON.stringify(result1.data.map((d) => d.id)),
        JSON.stringify(result2.data.map((d) => d.id))
      );
    });

    it('prioritizes comments over views', () => {
      const data = [
        { _dataType: 'views', id: 1, created_at: '2025-01-01' },
        { _dataType: 'views', id: 2, created_at: '2025-01-02' },
        { _dataType: 'views', id: 3, created_at: '2025-01-03' },
        { _dataType: 'comments', id: 4, created_at: '2025-01-04' },
        { _dataType: 'comments', id: 5, created_at: '2025-01-05' },
      ];

      const result = seededPrioritizedSample(data, 2, 'seed-1');

      assert.equal(result.wasSampled, true);
      assert.equal(result.sampledCount, 2);
      assert.equal(result.highPriorityKept, 2);
      // All 2 should be comments
      assert.ok(result.data.every((r) => r._dataType === 'comments'));
    });

    it('keeps most recent comments when over limit', () => {
      const data = [
        { _dataType: 'comments', id: 1, created_at: '2025-01-01' },
        { _dataType: 'comments', id: 2, created_at: '2025-01-02' },
        { _dataType: 'comments', id: 3, created_at: '2025-01-03' },
      ];

      const result = seededPrioritizedSample(data, 2, 'seed-1');

      assert.equal(result.wasSampled, true);
      assert.equal(result.sampledCount, 2);
      assert.equal(result.highPriorityKept, 2);
      // Should keep id:3 and id:2 (most recent by created_at)
      const ids = result.data.map((r) => r.id);
      assert.ok(ids.includes(3), 'Should include most recent (id:3)');
      assert.ok(ids.includes(2), 'Should include second most recent (id:2)');
    });

    it('handles mixed priorities correctly', () => {
      const data = [
        { _dataType: 'views', id: 1, created_at: '2025-01-01' },
        { _dataType: 'views', id: 2, created_at: '2025-01-02' },
        { _dataType: 'reactions', id: 3, created_at: '2025-01-03' },
        { _dataType: 'reactions', id: 4, created_at: '2025-01-04' },
        { _dataType: 'comments', id: 5, created_at: '2025-01-05' },
        { _dataType: 'comments', id: 6, created_at: '2025-01-06' },
      ];

      const result = seededPrioritizedSample(data, 4, 'seed-1');

      assert.equal(result.wasSampled, true);
      assert.equal(result.sampledCount, 4);
      assert.equal(result.highPriorityKept, 2); // both comments kept

      // Should have both comments (priority 3)
      const comments = result.data.filter((r) => r._dataType === 'comments');
      assert.equal(comments.length, 2);

      // Should have 2 reactions (priority 1)
      const reactions = result.data.filter((r) => r._dataType === 'reactions');
      assert.equal(reactions.length, 2);

      // No views (priority 0) - lowest priority sampled out
      const views = result.data.filter((r) => r._dataType === 'views');
      assert.equal(views.length, 0);
    });
  });
});

// =============================================================================
// Validator Tests
// =============================================================================

describe('AI Analysis Validators', () => {
  describe('isValidTemplateId', () => {
    it('accepts valid templates', () => {
      assert.equal(isValidTemplateId('user_behavior'), true);
      assert.equal(isValidTemplateId('content_recommendation'), true);
      assert.equal(isValidTemplateId('custom'), true);
    });

    it('rejects invalid templates', () => {
      assert.equal(isValidTemplateId('invalid'), false);
      assert.equal(isValidTemplateId(''), false);
      assert.equal(isValidTemplateId(null), false);
    });
  });

  describe('validateTemplateId', () => {
    it('returns valid result for valid ID', () => {
      const result = validateTemplateId('user_behavior');
      assert.equal(result.valid, true);
      assert.equal(result.data, 'user_behavior');
    });

    it('returns error for invalid ID', () => {
      const result = validateTemplateId('invalid');
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('templateId 無效'));
    });
  });

  describe('isValidDataType', () => {
    it('accepts valid data types', () => {
      assert.equal(isValidDataType('comments'), true);
    });

    it('rejects invalid data types', () => {
      assert.equal(isValidDataType('products'), false);
      assert.equal(isValidDataType('orders'), false);
      assert.equal(isValidDataType('members'), false);
      assert.equal(isValidDataType('invalid'), false);
      assert.equal(isValidDataType(''), false);
    });
  });

  describe('validateDataTypes', () => {
    it('returns valid for array with valid types', () => {
      const result = validateDataTypes(['comments']);
      assert.equal(result.valid, true);
    });

    it('returns error for empty array', () => {
      const result = validateDataTypes([]);
      assert.equal(result.valid, false);
    });

    it('returns error for invalid type in array', () => {
      const result = validateDataTypes(['comments', 'invalid']);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('invalid'));
    });
  });

  describe('getRequiredDataTypes', () => {
    it('returns required types for user_behavior template', () => {
      const required = getRequiredDataTypes('user_behavior');
      assert.ok(required.includes('comments'));
    });

    it('returns required types for content_recommendation template', () => {
      const required = getRequiredDataTypes('content_recommendation');
      assert.ok(required.includes('comments'));
    });
  });

  describe('validateRequiredDataTypes', () => {
    it('passes when all required types present', () => {
      const result = validateRequiredDataTypes('user_behavior', ['comments']);
      assert.equal(result.valid, true);
    });

    it('fails when missing required type', () => {
      const result = validateRequiredDataTypes('user_behavior', []);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('comments'));
    });
  });

  describe('mergeWithRequiredTypes', () => {
    it('merges selected with required', () => {
      const merged = mergeWithRequiredTypes('user_behavior', []);
      assert.ok(merged.includes('comments'));
    });

    it('does not duplicate existing types', () => {
      const merged = mergeWithRequiredTypes('user_behavior', ['comments']);
      const commentCount = merged.filter((t) => t === 'comments').length;
      assert.equal(commentCount, 1);
    });
  });

  describe('isValidMode', () => {
    it('accepts valid modes', () => {
      assert.equal(isValidMode('standard'), true);
      assert.equal(isValidMode('rag'), true);
    });

    it('rejects invalid modes', () => {
      assert.equal(isValidMode('invalid'), false);
    });
  });

  describe('isValidIsoDate', () => {
    it('accepts YYYY-MM-DD format', () => {
      assert.equal(isValidIsoDate('2025-01-15'), true);
    });

    it('accepts full ISO timestamp', () => {
      assert.equal(isValidIsoDate('2025-01-15T10:30:00Z'), true);
    });

    it('rejects invalid dates', () => {
      assert.equal(isValidIsoDate('2025-13-45'), false);
      assert.equal(isValidIsoDate('not-a-date'), false);
    });
  });

  describe('validateDateRange', () => {
    it('accepts valid range', () => {
      const result = validateDateRange({ from: '2025-01-01', to: '2025-01-31' });
      assert.equal(result.valid, true);
    });

    it('rejects inverted range', () => {
      const result = validateDateRange({ from: '2025-01-31', to: '2025-01-01' });
      assert.equal(result.valid, false);
    });
  });

  describe('validateAnalysisRequest', () => {
    it('accepts valid request', () => {
      const request = {
        templateId: 'user_behavior',
        mode: 'standard',
        modelId: 'openai/gpt-4o-mini',
        dataTypes: ['comments'],
        filters: {},
      };
      const result = validateAnalysisRequest(request);
      assert.equal(result.valid, true);
    });

    it('rejects missing required fields', () => {
      const result = validateAnalysisRequest({ templateId: 'user_behavior' });
      assert.equal(result.valid, false);
    });

    it('rejects empty dataTypes array', () => {
      const request = {
        templateId: 'user_behavior',
        mode: 'standard',
        modelId: 'openai/gpt-4o-mini',
        dataTypes: [],
        filters: {},
      };
      const result = validateAnalysisRequest(request);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('至少需要選擇'));
    });

    it('rejects invalid modelId', () => {
      const request = {
        templateId: 'user_behavior',
        mode: 'standard',
        modelId: 'invalid/model',
        dataTypes: ['comments'],
        filters: {},
      };
      const result = validateAnalysisRequest(request);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('model'));
    });
  });
});

// =============================================================================
// Formatting Tests
// =============================================================================

describe('Formatting Helpers', () => {
  describe('formatCostUsd', () => {
    it('formats cost with 2 decimal places', () => {
      assert.equal(formatCostUsd(1.5), '$1.50');
      assert.equal(formatCostUsd(0.456), '$0.46');
    });
  });

  describe('formatTokenCount', () => {
    it('formats with locale separators', () => {
      const formatted = formatTokenCount(8500);
      // May be "8,500" or "8.500" depending on locale
      assert.ok(formatted.includes('8') && formatted.includes('500'));
    });
  });
});
