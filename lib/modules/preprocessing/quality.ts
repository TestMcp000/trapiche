/**
 * Quality Gate (Pure Functions)
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5
 * @see uiux_refactor.md §6.4
 *
 * Pure functions for quality checking preprocessed chunks.
 *
 * IMPORTANT: This module contains ONLY pure functions.
 * No IO, no side effects, no external dependencies.
 */

import type {
  ContentChunk,
  QualifiedChunk,
  QualityGateConfig,
  ValidityCheckResult,
} from './types';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Default Configs per Type (PRD §5.2)
// ─────────────────────────────────────────────────────────────────────────────

export const QUALITY_GATE_CONFIGS: Record<EmbeddingTargetType, QualityGateConfig> = {
  product: {
    minLength: 20, // characters
    maxLength: 5000,
    minQualityScore: 0.6,
    maxNoiseRatio: 0.3,
  },
  post: {
    minLength: 50, // characters for posts
    maxLength: 10000,
    minQualityScore: 0.6,
    maxNoiseRatio: 0.3,
  },
  gallery_item: {
    minLength: 10, // Gallery items can be short
    maxLength: 2000,
    minQualityScore: 0.5,
    maxNoiseRatio: 0.4,
  },
  comment: {
    minLength: 5, // Comments can be very short
    maxLength: 2000,
    minQualityScore: 0.5,
    maxNoiseRatio: 0.4,
  },
};

export const DEFAULT_QUALITY_CONFIG: QualityGateConfig = QUALITY_GATE_CONFIGS.post;

// ─────────────────────────────────────────────────────────────────────────────
// Noise Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Characters considered as "noise" (not meaningful content).
 */
const NOISE_CHAR_PATTERN = /[^\p{L}\p{N}]/gu;

/**
 * Calculate the noise ratio (non-letter/number chars) in text.
 * @pure
 */
export function calculateNoiseRatio(text: string): number {
  if (text.length === 0) return 1;

  const noiseChars = text.match(NOISE_CHAR_PATTERN)?.length || 0;
  return noiseChars / text.length;
}

/**
 * Count meaningful words in text.
 * Handles both English and Chinese.
 * @pure
 */
export function countWords(text: string): number {
  // Count English word-like sequences
  const englishWords = text.match(/[a-zA-Z]+/g)?.length || 0;
  // Count Chinese characters as individual "words"
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;

  return englishWords + chineseChars;
}

/**
 * Check if text is primarily punctuation/symbols.
 * @pure
 */
export function isPurelyPunctuation(text: string): boolean {
  const stripped = text.replace(NOISE_CHAR_PATTERN, '');
  return stripped.length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validity Check (PRD §5.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check validity of a single chunk.
 * @pure
 */
export function checkValidity(
  chunk: ContentChunk,
  config: QualityGateConfig = DEFAULT_QUALITY_CONFIG
): ValidityCheckResult {
  const text = chunk.text;
  const charCount = text.length;
  const wordCount = countWords(text);
  const noiseRatio = calculateNoiseRatio(text);

  // Check for too short
  if (charCount < config.minLength) {
    return {
      isValid: false,
      reason: 'too_short',
      metrics: { charCount, wordCount, noiseRatio },
    };
  }

  // Check for too noisy
  if (noiseRatio > config.maxNoiseRatio) {
    return {
      isValid: false,
      reason: 'too_noisy',
      metrics: { charCount, wordCount, noiseRatio },
    };
  }

  // Check for no meaningful content
  if (isPurelyPunctuation(text) || wordCount === 0) {
    return {
      isValid: false,
      reason: 'no_content',
      metrics: { charCount, wordCount, noiseRatio },
    };
  }

  return {
    isValid: true,
    metrics: { charCount, wordCount, noiseRatio },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate quality score for a chunk (0-1).
 * Higher is better.
 * @pure
 */
export function calculateQualityScore(
  chunk: ContentChunk,
  config: QualityGateConfig = DEFAULT_QUALITY_CONFIG
): number {
  const text = chunk.text;
  const charCount = text.length;
  const noiseRatio = calculateNoiseRatio(text);
  const wordCount = countWords(text);

  // Factor 1: Length score (0-0.4)
  // Optimal length is around 200-500 chars
  const lengthScore = Math.min(0.4, (charCount / 500) * 0.4);

  // Factor 2: Noise score (0-0.3)
  // Lower noise is better
  const noiseScore = Math.max(0, 0.3 * (1 - noiseRatio / config.maxNoiseRatio));

  // Factor 3: Word density score (0-0.3)
  // Higher meaningful word count is better
  const wordDensity = wordCount / Math.max(1, charCount);
  const wordDensityScore = Math.min(0.3, wordDensity * 3);

  return Math.min(1, lengthScore + noiseScore + wordDensityScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple hash for quick duplicate detection.
 * @pure
 */
function simpleHash(text: string): string {
  // Normalize for comparison
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  // Simple checksum-like hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(16);
}

/**
 * Calculate similarity between two strings (0-1).
 * Uses a simple Jaccard-like similarity on words.
 * @pure
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Detect and mark duplicate chunks.
 * Returns indices of duplicate chunks (to be filtered).
 * @pure
 */
export function detectDuplicateChunks(
  chunks: ContentChunk[],
  similarityThreshold: number = 0.95
): Set<number> {
  const duplicates = new Set<number>();
  const hashes = new Map<string, number>(); // hash -> first occurrence index

  for (let i = 0; i < chunks.length; i++) {
    const hash = simpleHash(chunks[i].text);

    // Quick hash-based detection
    if (hashes.has(hash)) {
      duplicates.add(i);
      continue;
    }
    hashes.set(hash, i);

    // Check similarity with previous chunks (within window)
    const windowStart = Math.max(0, i - 5);
    for (let j = windowStart; j < i; j++) {
      if (duplicates.has(j)) continue;

      const similarity = calculateSimilarity(chunks[i].text, chunks[j].text);
      if (similarity >= similarityThreshold) {
        duplicates.add(i); // Mark later occurrence as duplicate
        break;
      }
    }
  }

  return duplicates;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Gate Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply quality gate to a single chunk.
 * @pure
 */
export function qualifyChunk(
  chunk: ContentChunk,
  config: QualityGateConfig = DEFAULT_QUALITY_CONFIG,
  isDuplicate: boolean = false
): QualifiedChunk {
  // Check for duplicate first
  if (isDuplicate) {
    return {
      ...chunk,
      qualityStatus: 'failed',
      qualityScore: 0,
      validityResult: {
        isValid: false,
        reason: 'duplicate',
        metrics: {
          charCount: chunk.text.length,
          wordCount: countWords(chunk.text),
          noiseRatio: calculateNoiseRatio(chunk.text),
        },
      },
    };
  }

  // Check validity
  const validityResult = checkValidity(chunk, config);

  if (!validityResult.isValid) {
    return {
      ...chunk,
      qualityStatus: 'failed',
      qualityScore: 0,
      validityResult,
    };
  }

  // Calculate quality score
  const qualityScore = calculateQualityScore(chunk, config);

  // Determine status based on score
  const qualityStatus =
    qualityScore >= config.minQualityScore ? 'passed' : 'incomplete';

  return {
    ...chunk,
    qualityStatus,
    qualityScore,
    validityResult,
  };
}

/**
 * Apply quality gate to all chunks.
 * @pure
 */
export function qualityGateChunks(
  chunks: ContentChunk[],
  config: QualityGateConfig = DEFAULT_QUALITY_CONFIG
): QualifiedChunk[] {
  // Detect duplicates first
  const duplicates = detectDuplicateChunks(chunks);

  // Qualify each chunk
  return chunks.map((chunk, index) =>
    qualifyChunk(chunk, config, duplicates.has(index))
  );
}

/**
 * Apply quality gate for a specific target type.
 * @pure
 */
export function qualityGateChunksForType(
  chunks: ContentChunk[],
  targetType: EmbeddingTargetType
): QualifiedChunk[] {
  const config = QUALITY_GATE_CONFIGS[targetType] || DEFAULT_QUALITY_CONFIG;
  return qualityGateChunks(chunks, config);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary/Stats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get quality gate summary statistics.
 * @pure
 */
export function getQualitySummary(
  chunks: QualifiedChunk[]
): { total: number; passed: number; incomplete: number; failed: number } {
  return {
    total: chunks.length,
    passed: chunks.filter((c) => c.qualityStatus === 'passed').length,
    incomplete: chunks.filter((c) => c.qualityStatus === 'incomplete').length,
    failed: chunks.filter((c) => c.qualityStatus === 'failed').length,
  };
}
