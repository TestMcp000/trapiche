/**
 * AI Analysis Pure Functions
 *
 * Pure utility functions for AI analysis - no IO operations.
 * Safe for use in both server and client contexts.
 *
 * Functions:
 * - Token estimation
 * - Cost estimation
 * - Data de-identification (PII removal)
 * - Data sampling/prioritization
 *
 * @see lib/types/ai-analysis.ts - Type definitions
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §4 - Cost control
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §5 - Data privacy
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */

import {
  type ModelPricing,
  type CostEstimate,
  type CostWarning,
  type CostWarningType,
  COST_THRESHOLDS,
  TOKEN_ESTIMATION,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Token Estimation
// =============================================================================

/**
 * Estimate token count for a string.
 * Uses the approximation of ~4 characters per token.
 *
 * @param text - Input text to estimate
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  return Math.ceil(text.length / TOKEN_ESTIMATION.CHARS_PER_TOKEN);
}

/**
 * Estimate token count for a data array serialized to JSON.
 *
 * @param data - Array of objects to estimate
 * @returns Estimated token count
 */
export function estimateDataTokens(data: unknown[]): number {
  if (!Array.isArray(data) || data.length === 0) {
    return 0;
  }

  try {
    const serialized = JSON.stringify(data);
    return estimateTokenCount(serialized);
  } catch {
    return 0;
  }
}

/**
 * Estimate output tokens based on input and typical ratio.
 *
 * @param inputTokens - Estimated input tokens
 * @returns Estimated output tokens
 */
export function estimateOutputTokens(inputTokens: number): number {
  return Math.ceil(inputTokens * TOKEN_ESTIMATION.OUTPUT_RATIO);
}

// =============================================================================
// Cost Estimation
// =============================================================================

/**
 * Calculate cost for a given token count and pricing.
 *
 * @param tokens - Number of tokens
 * @param pricePerMillion - Price per million tokens (USD)
 * @returns Cost in USD
 */
export function calculateTokenCost(
  tokens: number,
  pricePerMillion: number
): number {
  return (tokens / 1_000_000) * pricePerMillion;
}

/**
 * Generate cost warnings based on thresholds.
 *
 * @param totalCost - Estimated total cost (USD)
 * @param recordCount - Number of records to analyze
 * @returns Array of warnings
 */
export function generateCostWarnings(
  totalCost: number,
  recordCount: number
): CostWarning[] {
  const warnings: CostWarning[] = [];

  if (totalCost > COST_THRESHOLDS.HIGH_COST_WARNING) {
    warnings.push({
      type: 'high_cost',
      message: 'Estimated cost is high. Are you sure you want to continue?',
      threshold: COST_THRESHOLDS.HIGH_COST_WARNING,
      actual: totalCost,
    });
  }

  if (recordCount > COST_THRESHOLDS.FORCE_SAMPLING_THRESHOLD) {
    warnings.push({
      type: 'forced_sampling',
      message: `Dataset exceeds ${COST_THRESHOLDS.FORCE_SAMPLING_THRESHOLD.toLocaleString()} records. Sampling will be applied.`,
      threshold: COST_THRESHOLDS.FORCE_SAMPLING_THRESHOLD,
      actual: recordCount,
    });
  } else if (recordCount > COST_THRESHOLDS.LARGE_DATASET_WARNING) {
    warnings.push({
      type: 'large_dataset',
      message: 'Large dataset. Consider enabling sampling for faster analysis.',
      threshold: COST_THRESHOLDS.LARGE_DATASET_WARNING,
      actual: recordCount,
    });
  }

  return warnings;
}

/**
 * Estimate total cost for an analysis request.
 *
 * @param data - Data array to be analyzed
 * @param pricing - Model pricing info
 * @returns Complete cost estimate with warnings
 */
export function estimateAnalysisCost(
  data: unknown[],
  pricing: ModelPricing
): CostEstimate {
  const recordCount = data.length;
  const estimatedInputTokens = estimateDataTokens(data);
  const estimatedOutputTokens = estimateOutputTokens(estimatedInputTokens);

  const estimatedInputCost = calculateTokenCost(
    estimatedInputTokens,
    pricing.inputPricePerMillion
  );
  const estimatedOutputCost = calculateTokenCost(
    estimatedOutputTokens,
    pricing.outputPricePerMillion
  );
  const estimatedTotalCost = estimatedInputCost + estimatedOutputCost;

  const warnings = generateCostWarnings(estimatedTotalCost, recordCount);

  return {
    recordCount,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedInputCost,
    estimatedOutputCost,
    estimatedTotalCost,
    warnings,
  };
}

// =============================================================================
// Data De-identification
// =============================================================================

/**
 * Fields that contain PII and must be removed or hashed.
 */
const PII_FIELDS = [
  'email',
  'phone',
  'address',
  'name',
  'full_name',
  'first_name',
  'last_name',
  'ip',
  'ip_address',
] as const;

/**
 * Simple hash function for de-identification.
 * Creates a consistent but non-reversible identifier.
 *
 * @param input - String to hash
 * @param prefix - Optional prefix for the hash
 * @returns Hashed string
 */
export function simpleHash(input: string, prefix = 'user'): string {
  if (!input || typeof input !== 'string') {
    return `${prefix}_unknown`;
  }

  // Simple djb2 hash algorithm
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }

  // Convert to hex and take first 8 chars
  const hashHex = Math.abs(hash).toString(16).substring(0, 8);
  return `${prefix}_${hashHex}`;
}

/**
 * Check if a field name is a PII field.
 *
 * @param fieldName - Name of the field to check
 * @returns True if field contains PII
 */
export function isPiiField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return PII_FIELDS.some(
    (pii) => lowerName === pii || lowerName.includes(pii)
  );
}

/**
 * De-identify a single record by removing/hashing PII fields.
 *
 * @param record - Object to de-identify
 * @returns New object with PII removed/hashed
 */
export function deidentifyRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  if (typeof record !== 'object' || record === null) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (isPiiField(key)) {
      // Hash PII fields instead of removing
      if (typeof value === 'string' && value.length > 0) {
        result[key] = simpleHash(value, key.replace(/_/g, ''));
      } else {
        result[key] = '[redacted]';
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively de-identify nested objects
      result[key] = deidentifyRecord(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * De-identify an array of records.
 *
 * @param data - Array of records to de-identify
 * @returns New array with all PII removed/hashed
 */
export function deidentifyData(
  data: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(deidentifyRecord);
}

// =============================================================================
// Data Sampling & Prioritization
// =============================================================================

/**
 * Data priority levels per PRD §4.3.
 * Higher priority = more important to keep in sample.
 */
const DATA_TYPE_PRIORITY: Record<string, number> = {
  purchase: 3,
  order: 3,
  orders: 3,
  comment: 2,
  comments: 2,
  reaction: 1,
  reactions: 1,
  like: 1,
  view: 0,
  views: 0,
};

/**
 * Get priority level for a data type.
 *
 * @param dataType - Type of data
 * @returns Priority level (higher = more important)
 */
export function getDataPriority(dataType: string): number {
  const lowerType = dataType.toLowerCase();
  return DATA_TYPE_PRIORITY[lowerType] ?? 1;
}

/**
 * Sample data while preserving high-priority records.
 * Purchases are always kept, lower priority data is sampled.
 *
 * @param data - Array of records with a 'type' field
 * @param maxCount - Maximum records to return
 * @param typeField - Field name for record type (default: 'type')
 * @returns Sampled array
 */
export function prioritizedSample<T extends Record<string, unknown>>(
  data: T[],
  maxCount: number,
  typeField = 'type'
): T[] {
  if (!Array.isArray(data) || data.length <= maxCount) {
    return data;
  }

  // Group by priority
  const byPriority = new Map<number, T[]>();

  for (const record of data) {
    const recordType = String(record[typeField] ?? 'unknown');
    const priority = getDataPriority(recordType);

    if (!byPriority.has(priority)) {
      byPriority.set(priority, []);
    }
    byPriority.get(priority)!.push(record);
  }

  // Build result, starting from highest priority
  const result: T[] = [];
  const priorities = Array.from(byPriority.keys()).sort((a, b) => b - a);

  for (const priority of priorities) {
    const records = byPriority.get(priority)!;

    if (result.length + records.length <= maxCount) {
      // All fit, add all
      result.push(...records);
    } else {
      // Need to sample this priority level
      const remaining = maxCount - result.length;
      if (remaining > 0) {
        // Random sample
        const shuffled = [...records].sort(() => Math.random() - 0.5);
        result.push(...shuffled.slice(0, remaining));
      }
      break;
    }
  }

  return result;
}

// =============================================================================
// Deterministic Seeded Sampling
// =============================================================================

/**
 * Result of sampling operation with metadata.
 * Used to display sampling stats in UI.
 */
export interface SamplingResult<T> {
  /** Sampled data array */
  data: T[];
  /** Original record count before sampling */
  originalCount: number;
  /** Final record count after sampling */
  sampledCount: number;
  /** Count of high-priority records kept (orders/purchases) */
  highPriorityKept: number;
  /** Whether sampling was actually applied */
  wasSampled: boolean;
}

/**
 * Simple djb2 hash function for generating seeds from strings.
 * Produces consistent numeric hash for same input.
 *
 * @param str - Input string to hash
 * @returns Numeric hash value
 */
export function hashString(str: string): number {
  if (!str || typeof str !== 'string') {
    return 0;
  }
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Seeded pseudo-random number generator using Linear Congruential Generator.
 * Same seed always produces same sequence of values.
 *
 * @param seed - Numeric seed value
 * @returns Function that returns next pseudo-random number in [0, 1)
 */
export function createSeededRandom(seed: number): () => number {
  // LCG parameters (same as glibc)
  const a = 1103515245;
  const c = 12345;
  const m = 2 ** 31;
  let state = seed % m;

  return () => {
    state = (a * state + c) % m;
    return state / m;
  };
}

/**
 * Deterministically shuffle an array using a seeded random.
 * Same seed + same input always produces same output order.
 *
 * @param array - Array to shuffle (not mutated)
 * @param seed - Numeric seed for determinism
 * @returns New shuffled array
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = createSeededRandom(seed);

  // Fisher-Yates shuffle with seeded random
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Deterministic sampling that preserves high-priority records.
 * Uses seed-based selection for reproducibility (same seed = same output).
 *
 * Priority rules (per PRD §4.3):
 * - High priority (3): orders/purchases - kept first, truncated by recency if over limit
 * - Medium priority (2): comments - kept after high priority
 * - Low priority (1): reactions/likes - sampled if needed
 * - Lowest priority (0): views - sampled last
 *
 * @param data - Array of records with a type field
 * @param maxCount - Maximum records to return
 * @param seed - String seed for deterministic sampling (e.g., reportId)
 * @param typeField - Field name for record type (default: '_dataType')
 * @param dateField - Field name for date ordering (default: 'created_at')
 * @returns SamplingResult with sampled data and metadata
 */
export function seededPrioritizedSample<T extends Record<string, unknown>>(
  data: T[],
  maxCount: number,
  seed: string,
  typeField = '_dataType',
  dateField = 'created_at'
): SamplingResult<T> {
  const originalCount = data.length;

  // No sampling needed if under limit
  if (!Array.isArray(data) || data.length <= maxCount) {
    const highPriorityKept = data.filter((record) => {
      const recordType = String(record[typeField] ?? 'unknown');
      return getDataPriority(recordType) >= 3;
    }).length;

    return {
      data,
      originalCount,
      sampledCount: originalCount,
      highPriorityKept,
      wasSampled: false,
    };
  }

  // Generate numeric seed from string
  const numericSeed = hashString(seed);

  // Group by priority
  const byPriority = new Map<number, T[]>();

  for (const record of data) {
    const recordType = String(record[typeField] ?? 'unknown');
    const priority = getDataPriority(recordType);

    if (!byPriority.has(priority)) {
      byPriority.set(priority, []);
    }
    byPriority.get(priority)!.push(record);
  }

  // Build result, starting from highest priority
  const result: T[] = [];
  let highPriorityKept = 0;
  const priorities = Array.from(byPriority.keys()).sort((a, b) => b - a);

  for (const priority of priorities) {
    let records = byPriority.get(priority)!;

    // For high-priority (orders/purchases), sort by date and truncate if needed
    if (priority >= 3 && records.length > 0) {
      // Sort by date descending (most recent first)
      records = [...records].sort((a, b) => {
        const dateA = a[dateField] as string | undefined;
        const dateB = b[dateField] as string | undefined;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.localeCompare(dateA);
      });
    }

    if (result.length + records.length <= maxCount) {
      // All fit, add all
      result.push(...records);
      if (priority >= 3) {
        highPriorityKept += records.length;
      }
    } else {
      // Need to sample this priority level
      const remaining = maxCount - result.length;
      if (remaining > 0) {
        let selected: T[];

        if (priority >= 3) {
          // High priority: take most recent N (already sorted by date)
          selected = records.slice(0, remaining);
        } else {
          // Lower priority: use deterministic shuffle + slice
          const shuffled = seededShuffle(records, numericSeed + priority);
          selected = shuffled.slice(0, remaining);
        }

        result.push(...selected);
        if (priority >= 3) {
          highPriorityKept += selected.length;
        }
      }
      break;
    }
  }

  return {
    data: result,
    originalCount,
    sampledCount: result.length,
    highPriorityKept,
    wasSampled: true,
  };
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format USD cost for display.
 *
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.45")
 */
export function formatCostUsd(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display.
 *
 * @param tokens - Token count
 * @returns Formatted string (e.g., "8,500")
 */
export function formatTokenCount(tokens: number): string {
  return tokens.toLocaleString();
}

/**
 * Get warning type label.
 *
 * @param type - Warning type
 * @param locale - Locale for label ('en' | 'zh')
 * @returns Localized warning label
 */
export function getWarningLabel(
  type: CostWarningType,
  locale: 'en' | 'zh' = 'en'
): string {
  const labels: Record<CostWarningType, { en: string; zh: string }> = {
    high_cost: {
      en: 'High Cost Warning',
      zh: '成本警告',
    },
    large_dataset: {
      en: 'Large Dataset',
      zh: '資料量較大',
    },
    forced_sampling: {
      en: 'Sampling Required',
      zh: '需要採樣',
    },
  };

  return labels[type]?.[locale] ?? type;
}
