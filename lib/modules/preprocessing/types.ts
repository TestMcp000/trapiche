/**
 * Data Preprocessing Types (SSOT)
 * @see doc/specs/completed/DATA_PREPROCESSING.md
 * @see uiux_refactor.md §6.4
 *
 * Type definitions for preprocessing pipeline stages.
 * All modules in lib/modules/preprocessing/* use these types.
 */

import type { EmbeddingTargetType } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Cleaner Types
// ─────────────────────────────────────────────────────────────────────────────

/** Types of content that can be removed during cleaning */
export type RemovedContentType =
  | 'html'
  | 'markdown'
  | 'emoji'
  | 'url'
  | 'whitespace'
  | 'noise'
  | 'unicode'
  | 'custom';

/** Details about removed content (for debugging/observability) */
export interface RemovedContent {
  type: RemovedContentType;
  original: string;
  position?: { start: number; end: number };
}

/** Result from a single cleaner operation */
export interface CleanResult {
  output: string;
  removed: RemovedContent[];
  metadata: Record<string, unknown>;
}

/** Cleaner configuration */
export interface CleanerConfig {
  removeHtml: boolean;
  removeMarkdown: boolean;
  removeUrls: boolean;
  removeEmails: boolean;
  removeNoise: boolean;
  normalizeUnicode: boolean;
  normalizeWhitespace: boolean;
  preserveHeadingStructure: boolean;
  customPatterns?: RegExp[];
}

/** Cleaned content after preprocessing */
export interface CleanedContent {
  raw: string;
  cleaned: string;
  removedPatterns: string[];
  metadata: {
    originalLength: number;
    cleanedLength: number;
    cleaningRatio: number;
    cleanersApplied: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunker Types
// ─────────────────────────────────────────────────────────────────────────────

/** Chunking strategies */
export type ChunkingStrategy = 'sentence' | 'paragraph' | 'semantic' | 'fixed';

/** Chunker configuration per PRD §3.2 */
export interface ChunkingConfig {
  /** Target chunk size (tokens) */
  targetSize: number;
  /** Overlap between chunks (tokens), typically 10-20% of targetSize */
  overlap: number;
  /** Chunking strategy */
  splitBy: ChunkingStrategy;
  /** Minimum chunk size (tokens) - avoid too small */
  minSize: number;
  /** Maximum chunk size (tokens) - hard limit */
  maxSize: number;
  /** Use headings as primary boundary */
  useHeadingsAsBoundary: boolean;
}

/** Content chunk for embedding */
export interface ContentChunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  tokenCount: number;
  headingContext?: string;
}

/** Metadata from chunking operation */
export interface ChunkingMetadata {
  totalChunks: number;
  averageTokens: number;
  strategy: ChunkingStrategy;
  originalLength: number;
}

/** Result from chunking operation */
export interface ChunkResult {
  chunks: ContentChunk[];
  metadata: ChunkingMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrichment Types
// ─────────────────────────────────────────────────────────────────────────────

/** Context for enriching chunks */
export interface EnrichmentContext {
  targetType: EmbeddingTargetType;
  targetId: string;
  parentTitle?: string;
  category?: string;
  tags?: string[];
  locale?: 'en' | 'zh';
}

/** Enriched chunk with additional context */
export interface EnrichedChunk extends ContentChunk {
  enrichedContent: string;
  enrichmentMetadata: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Gate Types
// ─────────────────────────────────────────────────────────────────────────────

/** Reasons for validity failure */
export type InvalidReason =
  | 'too_short'
  | 'too_noisy'
  | 'no_content'
  | 'duplicate';

/** Quality issue details */
export interface QualityIssue {
  type: InvalidReason | 'low_quality' | 'pii_detected';
  severity: 'warning' | 'error';
  message: string;
  location?: { start: number; end: number };
}

/** Result from validity check */
export interface ValidityCheckResult {
  isValid: boolean;
  reason?: InvalidReason;
  metrics: {
    charCount: number;
    wordCount: number;
    noiseRatio: number;
  };
}

/** Quality gate result */
export interface QualityGateResult {
  passed: boolean;
  score: number;
  issues: QualityIssue[];
}

/** Quality-checked chunk */
export interface QualifiedChunk extends ContentChunk {
  qualityStatus: 'passed' | 'incomplete' | 'failed';
  qualityScore: number;
  validityResult: ValidityCheckResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Gate Config Types
// ─────────────────────────────────────────────────────────────────────────────

/** Quality gate configuration */
export interface QualityGateConfig {
  /** Minimum character count (Chinese) or word count (English) */
  minLength: number;
  /** Maximum character count */
  maxLength: number;
  /** Minimum quality score to pass (0-1) */
  minQualityScore: number;
  /** Maximum noise ratio allowed (0-1) */
  maxNoiseRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Types
// ─────────────────────────────────────────────────────────────────────────────

/** Input for preprocessing pipeline */
export interface PreprocessingInput {
  targetType: EmbeddingTargetType;
  rawContent: string;
  context?: EnrichmentContext;
}

/** Preprocessing metadata summary */
export interface PreprocessingMetadata {
  cleaning: {
    originalLength: number;
    cleanedLength: number;
    cleaningRatio: number;
    cleanersApplied: string[];
  };
  chunking: ChunkingMetadata;
  quality: {
    total: number;
    passed: number;
    incomplete: number;
    failed: number;
  };
}

/** Output from preprocessing pipeline */
export interface PreprocessingOutput {
  chunks: QualifiedChunk[];
  metadata: PreprocessingMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-Type Configs
// ─────────────────────────────────────────────────────────────────────────────

/** Complete preprocessing config per target type */
export interface TypePreprocessingConfig {
  cleaning: CleanerConfig;
  chunking: ChunkingConfig;
  quality: QualityGateConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM-as-a-Judge Types (Phase 6.5.2)
// ─────────────────────────────────────────────────────────────────────────────

/** Request to judge Edge Function */
export interface JudgeRequest {
  chunkContent: string;
  title?: string;
  category?: string;
  targetType?: EmbeddingTargetType;
}

/** Response from judge Edge Function */
export interface JudgeResult {
  success: boolean;
  score?: number; // 0-1
  standalone?: boolean;
  reason?: string;
  model?: string;
  error?: string;
}

/** Chunk with judge result applied */
export interface JudgedChunk extends QualifiedChunk {
  judgeResult?: JudgeResult;
  judgedAt?: string;
}

