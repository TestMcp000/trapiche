/**
 * Embedding Pure Functions
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Pure functions for embedding content processing.
 * No IO, no side effects, fully testable.
 */

import { createHash } from 'crypto';
import type {
  EmbeddingTargetType,
  ProductEmbeddingData,
  PostEmbeddingData,
  GalleryItemEmbeddingData,
  CommentEmbeddingData,
} from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum tokens for OpenAI ada-002 (with buffer).
 * @see SUPABASE_AI.md §5.1
 */
const MAX_TOKENS = 8000;

// ─────────────────────────────────────────────────────────────────────────────
// Text Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags from text.
 */
export function stripHtml(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip Markdown syntax from text.
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove emphasis
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip both HTML and Markdown from text.
 */
export function stripHtmlAndMarkdown(text: string): string {
  return stripMarkdown(stripHtml(text));
}

/**
 * Normalize whitespace in text.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate token count for text.
 * Uses a conservative estimate for mixed Chinese/English content.
 * 
 * @see SUPABASE_AI.md §5.1 for token limits
 */
export function estimateTokenCount(text: string): number {
  // Count Chinese characters (CJK Unified Ideographs range)
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // Non-Chinese characters
  const otherChars = text.length - chineseChars;
  
  // Chinese: ~1.5 tokens/char, Other: ~0.25 tokens/char
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
}

/**
 * Truncate text to fit within token limit.
 * Preserves whole words when possible.
 * 
 * @see SUPABASE_AI.md §5.1 for truncation rules
 */
export function truncateToTokenLimit(text: string, maxTokens: number = MAX_TOKENS): string {
  const estimatedTokens = estimateTokenCount(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Binary search for the right length
  let low = 0;
  let high = text.length;
  let result = text;
  
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const truncated = text.slice(0, mid);
    
    if (estimateTokenCount(truncated) <= maxTokens) {
      result = truncated;
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  
  // Try to break at word boundary
  const lastSpace = result.lastIndexOf(' ');
  if (lastSpace > result.length * 0.8) {
    result = result.slice(0, lastSpace);
  }
  
  return result.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate SHA256 hash of content for change detection.
 * @see SUPABASE_AI.md §2.1.1 content_hash field
 */
export function hashContent(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Composition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose embedding content from product data.
 * @see SUPABASE_AI.md §2.2 - "name + description_en + description_zh + tags"
 */
export function composeProductContent(data: ProductEmbeddingData): string {
  const parts: string[] = [data.name];
  
  if (data.description_en) {
    parts.push(stripHtmlAndMarkdown(data.description_en));
  }
  if (data.description_zh) {
    parts.push(stripHtmlAndMarkdown(data.description_zh));
  }
  if (data.tags && data.tags.length > 0) {
    parts.push(data.tags.join(', '));
  }
  
  return normalizeWhitespace(parts.join(' '));
}

/**
 * Compose embedding content from post data.
 * @see SUPABASE_AI.md §2.2 - "title_en + title_zh + excerpt_en + excerpt_zh"
 */
export function composePostContent(data: PostEmbeddingData): string {
  const parts: string[] = [];
  
  if (data.title_en) parts.push(data.title_en);
  if (data.title_zh) parts.push(data.title_zh);
  if (data.excerpt_en) parts.push(stripHtmlAndMarkdown(data.excerpt_en));
  if (data.excerpt_zh) parts.push(stripHtmlAndMarkdown(data.excerpt_zh));
  
  return normalizeWhitespace(parts.join(' '));
}

/**
 * Compose embedding content from gallery item data.
 * @see SUPABASE_AI.md §2.2 - "title_en + title_zh + description_en + description_zh"
 */
export function composeGalleryItemContent(data: GalleryItemEmbeddingData): string {
  const parts: string[] = [];
  
  if (data.title_en) parts.push(data.title_en);
  if (data.title_zh) parts.push(data.title_zh);
  if (data.description_en) parts.push(stripHtmlAndMarkdown(data.description_en));
  if (data.description_zh) parts.push(stripHtmlAndMarkdown(data.description_zh));
  
  return normalizeWhitespace(parts.join(' '));
}

/**
 * Compose embedding content from comment data.
 * @see SUPABASE_AI.md §2.2 - "content"
 */
export function composeCommentContent(data: CommentEmbeddingData): string {
  return normalizeWhitespace(stripHtmlAndMarkdown(data.content));
}

/**
 * Compose embedding content based on entity type.
 */
export function composeEmbeddingContent(
  targetType: EmbeddingTargetType,
  data: ProductEmbeddingData | PostEmbeddingData | GalleryItemEmbeddingData | CommentEmbeddingData
): string {
  switch (targetType) {
    case 'product':
      return composeProductContent(data as ProductEmbeddingData);
    case 'post':
      return composePostContent(data as PostEmbeddingData);
    case 'gallery_item':
      return composeGalleryItemContent(data as GalleryItemEmbeddingData);
    case 'comment':
      return composeCommentContent(data as CommentEmbeddingData);
    default:
      throw new Error(`Unknown target type: ${targetType}`);
  }
}

/**
 * Prepare content for embedding: compose, strip, normalize, truncate.
 */
export function prepareContentForEmbedding(
  targetType: EmbeddingTargetType,
  data: ProductEmbeddingData | PostEmbeddingData | GalleryItemEmbeddingData | CommentEmbeddingData
): { content: string; contentHash: string; truncated: boolean } {
  const composed = composeEmbeddingContent(targetType, data);
  const originalTokens = estimateTokenCount(composed);
  const content = truncateToTokenLimit(composed, MAX_TOKENS);
  const contentHash = hashContent(content);
  
  return {
    content,
    contentHash,
    truncated: originalTokens > MAX_TOKENS,
  };
}
