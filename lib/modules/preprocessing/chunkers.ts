/**
 * Content Chunkers (Pure Functions)
 * @see doc/specs/completed/DATA_PREPROCESSING.md §3
 * @see uiux_refactor.md §6.4
 *
 * Pure functions for splitting content into chunks for embedding.
 *
 * IMPORTANT: This module contains ONLY pure functions.
 * No IO, no side effects, no external dependencies.
 */

import type {
  ChunkingConfig,
  ChunkResult,
  ContentChunk,
  ChunkingMetadata,
} from './types';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Default Configs per Type (PRD §3.5)
// ─────────────────────────────────────────────────────────────────────────────

export const CHUNKING_CONFIGS: Record<EmbeddingTargetType, ChunkingConfig> = {
  product: {
    targetSize: 300,
    overlap: 45, // 15% overlap
    splitBy: 'semantic',
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  },
  post: {
    targetSize: 500,
    overlap: 75, // 15% overlap
    splitBy: 'semantic',
    minSize: 128,
    maxSize: 1000,
    useHeadingsAsBoundary: true,
  },
  gallery_item: {
    targetSize: 128,
    overlap: 20, // ~15% overlap
    splitBy: 'sentence',
    minSize: 32,
    maxSize: 256,
    useHeadingsAsBoundary: false,
  },
  comment: {
    targetSize: 128,
    overlap: 0, // Comments usually don't need overlap
    splitBy: 'sentence',
    minSize: 16,
    maxSize: 256,
    useHeadingsAsBoundary: false,
  },
};

export const DEFAULT_CHUNKER_CONFIG: ChunkingConfig = CHUNKING_CONFIGS.post;

// ─────────────────────────────────────────────────────────────────────────────
// Token Estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate token count for text.
 * Uses conservative estimates for mixed Chinese/English content.
 * @pure
 */
export function estimateTokenCount(text: string): number {
  // Count Chinese characters (CJK Unified Ideographs range)
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // Non-Chinese characters
  const otherChars = text.length - chineseChars;

  // Chinese: ~1.5 tokens/char, English: ~0.25 tokens/char (4 chars/token)
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic Splitters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split content by sentences.
 * Handles both English and Chinese sentence endings.
 * @pure
 */
export function splitBySentences(content: string): string[] {
  // Split on sentence-ending punctuation
  // For Chinese, no whitespace is needed after punctuation
  // For English, typically followed by whitespace
  return content
    .split(/(?<=[。！？])|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Split content by paragraphs.
 * @pure
 */
export function splitByParagraphs(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Split content into fixed-size chunks with overlap.
 * @pure
 */
export function splitByFixedSize(
  content: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    chunks.push(content.slice(start, end));

    const step = chunkSize - overlap;
    if (step <= 0) break; // Prevent infinite loop
    start += step;

    if (start >= content.length) break;
  }

  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Heading Detection for Semantic Chunking
// ─────────────────────────────────────────────────────────────────────────────

/** Heading pattern with priority */
interface HeadingBoundary {
  pattern: RegExp;
  priority: number;
  type: 'heading' | 'paragraph' | 'sentence';
}

const BOUNDARY_PRIORITIES: HeadingBoundary[] = [
  { pattern: /^#{1,3}\s+.+$/gm, priority: 1, type: 'heading' }, // H1-H3
  { pattern: /\n\n+/g, priority: 2, type: 'paragraph' }, // Paragraph breaks
  { pattern: /[。！？.!?]\s*/g, priority: 3, type: 'sentence' }, // Sentence endings
];

/**
 * Extract heading contexts from content.
 * @pure
 */
export function extractHeadings(content: string): { text: string; position: number }[] {
  const headings: { text: string; position: number }[] = [];
  const pattern = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    headings.push({
      text: match[2].trim(),
      position: match.index,
    });
  }

  return headings;
}

/**
 * Find the heading context for a given position.
 * @pure
 */
export function getHeadingContext(
  headings: { text: string; position: number }[],
  position: number
): string | undefined {
  // Find the last heading before this position
  for (let i = headings.length - 1; i >= 0; i--) {
    if (headings[i].position <= position) {
      return headings[i].text;
    }
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Chunking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the best boundary position near a target position.
 * Prefers: heading > paragraph > sentence > arbitrary
 * @pure
 */
function _findBestBoundary(
  content: string,
  targetPosition: number,
  searchWindow: number = 100
): number {
  const start = Math.max(0, targetPosition - searchWindow);
  const end = Math.min(content.length, targetPosition + searchWindow);
  const searchText = content.slice(start, end);

  // Try to find boundary in priority order
  for (const boundary of BOUNDARY_PRIORITIES) {
    const matches = [...searchText.matchAll(boundary.pattern)];
    if (matches.length > 0) {
      // Find the match closest to the target
      let bestMatch = matches[0];
      let bestDistance = Math.abs((matches[0].index || 0) + start - targetPosition);

      for (const match of matches) {
        const position = (match.index || 0) + start;
        const distance = Math.abs(position - targetPosition);
        if (distance < bestDistance) {
          bestMatch = match;
          bestDistance = distance;
        }
      }

      return (bestMatch.index || 0) + start + bestMatch[0].length;
    }
  }

  // No boundary found, return target position
  return targetPosition;
}

/**
 * Split content using semantic boundaries (headings, paragraphs).
 * @pure
 */
export function splitBySemantic(
  content: string,
  config: ChunkingConfig
): string[] {
  const chunks: string[] = [];

  // If content is already under maxSize, return as single chunk
  if (estimateTokenCount(content) <= config.maxSize) {
    return [content];
  }

  // First, split by headings if enabled
  if (config.useHeadingsAsBoundary) {
    const sections = content.split(/(?=^#{1,3}\s+)/gm).filter(Boolean);

    for (const section of sections) {
      const tokens = estimateTokenCount(section);

      if (tokens <= config.maxSize) {
        chunks.push(section.trim());
      } else {
        // Section too long, split further by paragraphs
        const subChunks = splitLongSection(section, config);
        chunks.push(...subChunks);
      }
    }
  } else {
    // Split by paragraphs
    const paragraphs = splitByParagraphs(content);
    let buffer = '';

    for (const para of paragraphs) {
      const combined = buffer ? `${buffer}\n\n${para}` : para;
      const tokens = estimateTokenCount(combined);

      if (tokens <= config.targetSize) {
        buffer = combined;
      } else {
        if (buffer) chunks.push(buffer.trim());

        if (estimateTokenCount(para) > config.maxSize) {
          // Paragraph too long, split by sentences
          const subChunks = splitLongSection(para, config);
          chunks.push(...subChunks);
          buffer = '';
        } else {
          buffer = para;
        }
      }
    }

    if (buffer) chunks.push(buffer.trim());
  }

  return chunks.filter(Boolean);
}

/**
 * Split a long section into smaller chunks.
 * @pure
 */
function splitLongSection(section: string, config: ChunkingConfig): string[] {
  const chunks: string[] = [];
  const sentences = splitBySentences(section);
  let buffer = '';

  for (const sentence of sentences) {
    const combined = buffer ? `${buffer} ${sentence}` : sentence;
    const tokens = estimateTokenCount(combined);

    if (tokens <= config.targetSize) {
      buffer = combined;
    } else {
      if (buffer) chunks.push(buffer.trim());

      // Single sentence exceeds target, split by fixed size
      if (estimateTokenCount(sentence) > config.targetSize) {
        const fixedChunks = splitByFixedSize(
          sentence,
          Math.floor(config.targetSize * 4), // Approximate chars
          Math.floor(config.overlap * 4)
        );
        chunks.push(...fixedChunks);
        buffer = '';
      } else {
        buffer = sentence;
      }
    }
  }

  if (buffer) chunks.push(buffer.trim());

  return chunks.filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlap Application
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply overlap between chunks (sliding window).
 * @pure
 */
export function applyOverlap(
  chunks: string[],
  overlapTokens: number
): string[] {
  if (overlapTokens <= 0 || chunks.length <= 1) {
    return chunks;
  }

  const result: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      result.push(chunks[i]);
    } else {
      // Get overlap from previous chunk
      const prevChunk = chunks[i - 1];
      const prevWords = prevChunk.split(/\s+/);

      // Estimate overlap word count (roughly 4 chars per token)
      const overlapWordCount = Math.ceil(overlapTokens / 0.25 / 4);
      const overlapWords = prevWords.slice(-overlapWordCount).join(' ');

      result.push(`${overlapWords} ${chunks[i]}`.trim());
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chunking Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chunk content based on config.
 * @pure
 */
export function chunkContent(
  content: string,
  config: ChunkingConfig = DEFAULT_CHUNKER_CONFIG
): ChunkResult {
  let segments: string[];

  // Select chunking strategy
  switch (config.splitBy) {
    case 'sentence':
      segments = splitBySentences(content);
      break;
    case 'paragraph':
      segments = splitByParagraphs(content);
      break;
    case 'semantic':
      segments = splitBySemantic(content, config);
      break;
    case 'fixed':
      segments = splitByFixedSize(
        content,
        Math.floor(config.targetSize * 4), // Approximate chars
        Math.floor(config.overlap * 4)
      );
      break;
    default:
      segments = [content];
  }

  // Apply overlap if needed (except for fixed which handles it)
  if (config.splitBy !== 'fixed' && config.overlap > 0) {
    segments = applyOverlap(segments, config.overlap);
  }

  // Merge small chunks or split large ones
  segments = normalizeChunkSizes(segments, config);

  // Extract heading contexts
  const headings = extractHeadings(content);

  // Build chunks with position tracking
  const chunks: ContentChunk[] = [];
  let charOffset = 0;

  for (let i = 0; i < segments.length; i++) {
    const text = segments[i];
    const charStart = content.indexOf(text, charOffset);
    const charEnd = charStart >= 0 ? charStart + text.length : charOffset + text.length;
    const tokenCount = estimateTokenCount(text);

    chunks.push({
      index: i,
      text,
      charStart: Math.max(0, charStart),
      charEnd,
      tokenCount,
      headingContext: config.useHeadingsAsBoundary
        ? getHeadingContext(headings, Math.max(0, charStart))
        : undefined,
    });

    charOffset = charEnd;
  }

  // Calculate metadata
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
  const metadata: ChunkingMetadata = {
    totalChunks: chunks.length,
    averageTokens: chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0,
    strategy: config.splitBy,
    originalLength: content.length,
  };

  return { chunks, metadata };
}

/**
 * Normalize chunk sizes: merge too-small, split too-large.
 * @pure
 */
function normalizeChunkSizes(
  segments: string[],
  config: ChunkingConfig
): string[] {
  const result: string[] = [];
  let buffer = '';

  for (const segment of segments) {
    const segmentTokens = estimateTokenCount(segment);
    const bufferTokens = estimateTokenCount(buffer);
    const combinedTokens = buffer ? bufferTokens + segmentTokens : segmentTokens;

    if (combinedTokens <= config.maxSize) {
      // Merge into buffer
      buffer = buffer ? `${buffer}\n\n${segment}` : segment;

      // Flush if we've reached target size
      if (combinedTokens >= config.targetSize) {
        result.push(buffer.trim());
        buffer = '';
      }
    } else {
      // Flush buffer first
      if (buffer && bufferTokens >= config.minSize) {
        result.push(buffer.trim());
      } else if (buffer) {
        // Buffer too small, try to combine with segment
        if (segment.length > 0) {
          result.push(`${buffer} ${segment}`.trim());
        } else {
          result.push(buffer.trim());
        }
        buffer = '';
        continue;
      }

      // Handle oversized segment
      if (segmentTokens > config.maxSize) {
        const subChunks = splitByFixedSize(
          segment,
          Math.floor(config.maxSize * 4),
          Math.floor(config.overlap * 4)
        );
        result.push(...subChunks.map((s) => s.trim()).filter(Boolean));
        buffer = '';
      } else {
        buffer = segment;
      }
    }
  }

  // Flush remaining buffer
  if (buffer) {
    const bufferTokens = estimateTokenCount(buffer);
    if (bufferTokens >= config.minSize || result.length === 0) {
      result.push(buffer.trim());
    } else if (result.length > 0) {
      // Merge with last chunk if too small
      result[result.length - 1] = `${result[result.length - 1]}\n\n${buffer}`.trim();
    }
  }

  return result.filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: Chunk for Target Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chunk content using type-specific default config.
 * @pure
 */
export function chunkContentForType(
  content: string,
  targetType: EmbeddingTargetType
): ChunkResult {
  const config = CHUNKING_CONFIGS[targetType] || DEFAULT_CHUNKER_CONFIG;
  return chunkContent(content, config);
}
