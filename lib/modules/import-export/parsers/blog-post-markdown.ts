import 'server-only';

/**
 * Blog Post Markdown Parser (Pure)
 *
 * Parses Markdown with YAML frontmatter to structured blog post data.
 * Uses gray-matter for frontmatter parsing.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.1
 *
 * NOTE: This module uses gray-matter which is a heavy dependency.
 * It should only be imported by server-only IO modules to prevent
 * it from being bundled into the client.
 */

import matter from 'gray-matter';
import type {
  ParsedBlogPost,
  BlogPostFrontmatter,
  ParseResult,
} from '@/lib/types/import-export';
import { LANG_MARKER_EN, LANG_MARKER_ZH } from '../formatters/blog-post-markdown';

// =============================================================================
// Constants
// =============================================================================

/** Required frontmatter fields */
const REQUIRED_FIELDS = ['slug', 'category', 'visibility'] as const;

/** Valid visibility values */
const VALID_VISIBILITIES = ['draft', 'private', 'public'] as const;

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Parse content from Markdown body.
 *
 * Supports legacy bilingual markers, but for single-language project it always
 * returns a single canonical content (prefer zh when present), mirrored to both
 * `content_en` and `content_zh` for legacy DB fields.
 *
 * @param content - The Markdown body (after frontmatter)
 * @returns Object with content_en and optional content_zh
 */
export function parseBilingualContent(content: string): {
  content_en: string;
  content_zh?: string;
} {
  const trimmedContent = content.trim();

  // Check for language markers
  const hasEnMarker = trimmedContent.includes(LANG_MARKER_EN);
  const hasZhMarker = trimmedContent.includes(LANG_MARKER_ZH);

  // No markers - treat entire content as single-language content (zh)
  if (!hasEnMarker && !hasZhMarker) {
    return trimmedContent ? { content_en: trimmedContent, content_zh: trimmedContent } : { content_en: '' };
  }

  // Split by markers
  let content_en = '';
  let content_zh: string | undefined;

  if (hasEnMarker && hasZhMarker) {
    // Both markers present
    const enIndex = trimmedContent.indexOf(LANG_MARKER_EN);
    const zhIndex = trimmedContent.indexOf(LANG_MARKER_ZH);

    if (enIndex < zhIndex) {
      // EN first, then ZH
      content_en = trimmedContent
        .slice(enIndex + LANG_MARKER_EN.length, zhIndex)
        .trim();
      content_zh = trimmedContent.slice(zhIndex + LANG_MARKER_ZH.length).trim();
    } else {
      // ZH first, then EN
      content_zh = trimmedContent
        .slice(zhIndex + LANG_MARKER_ZH.length, enIndex)
        .trim();
      content_en = trimmedContent.slice(enIndex + LANG_MARKER_EN.length).trim();
    }
  } else if (hasEnMarker) {
    // Only EN marker
    const enIndex = trimmedContent.indexOf(LANG_MARKER_EN);
    content_en = trimmedContent.slice(enIndex + LANG_MARKER_EN.length).trim();
  } else {
    // Only ZH marker - treat content before marker as EN
    const zhIndex = trimmedContent.indexOf(LANG_MARKER_ZH);
    content_en = trimmedContent.slice(0, zhIndex).trim();
    content_zh = trimmedContent.slice(zhIndex + LANG_MARKER_ZH.length).trim();
  }

  // Single-language: prefer zh when available, otherwise fallback to en.
  const canonical = (content_zh || content_en).trim();
  return canonical ? { content_en: canonical, content_zh: canonical } : { content_en: '' };
}

/**
 * Validate frontmatter has all required fields.
 *
 * @param data - The parsed frontmatter data
 * @returns Array of missing field names
 */
export function validateFrontmatterFields(
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field])) {
      missing.push(field);
    }
  }

  const titleCandidate = data.title_zh ?? data.title_en ?? data.title;
  if (!titleCandidate || (typeof titleCandidate === 'string' && titleCandidate.trim().length === 0)) {
    missing.push('title');
  }

  return missing;
}

/**
 * Validate visibility field value.
 *
 * @param visibility - The visibility value to validate
 * @returns True if valid
 */
export function isValidVisibility(
  visibility: unknown
): visibility is 'draft' | 'private' | 'public' {
  return (
    typeof visibility === 'string' &&
    VALID_VISIBILITIES.includes(visibility as (typeof VALID_VISIBILITIES)[number])
  );
}

/**
 * Extract and normalize frontmatter from parsed data.
 *
 * @param data - Raw frontmatter data from gray-matter
 * @returns Normalized frontmatter object
 */
export function extractFrontmatterFromData(
  data: Record<string, unknown>
): BlogPostFrontmatter {
  const titleCandidate = data.title_zh ?? data.title_en ?? data.title ?? '';
  const title = String(titleCandidate || '');

  const excerptCandidate = data.excerpt_zh ?? data.excerpt_en ?? data.excerpt ?? undefined;
  const excerpt = excerptCandidate !== undefined ? String(excerptCandidate) : undefined;

  const coverImageUrlCandidate =
    data.cover_image_url_zh ?? data.cover_image_url_en ?? data.cover_image_url ?? undefined;
  const coverImageUrl =
    coverImageUrlCandidate !== undefined ? String(coverImageUrlCandidate) : undefined;

  const coverImageAltCandidate =
    data.cover_image_alt_zh ?? data.cover_image_alt_en ?? data.cover_image_alt ?? undefined;
  const coverImageAlt =
    coverImageAltCandidate !== undefined ? String(coverImageAltCandidate) : undefined;

  const frontmatter: BlogPostFrontmatter = {
    slug: String(data.slug || ''),
    category: String(data.category || ''),
    visibility: isValidVisibility(data.visibility) ? data.visibility : 'draft',
    created_at: String(data.created_at || new Date().toISOString()),
    // Single-language: keep both fields identical for legacy schema.
    title_en: title,
    title_zh: title,
  };

  // Optional fields (single-language; mirror to legacy en fields)
  if (excerpt && excerpt.trim().length > 0) {
    frontmatter.excerpt_en = excerpt;
    frontmatter.excerpt_zh = excerpt;
  }

  if (coverImageUrl && coverImageUrl.trim().length > 0) {
    frontmatter.cover_image_url_en = coverImageUrl;
    frontmatter.cover_image_url_zh = coverImageUrl;
  }

  if (coverImageAlt && coverImageAlt.trim().length > 0) {
    frontmatter.cover_image_alt_en = coverImageAlt;
    frontmatter.cover_image_alt_zh = coverImageAlt;
  }

  return frontmatter;
}

/**
 * Parse a Markdown file content to structured blog post data.
 *
 * @param content - The raw Markdown file content
 * @returns ParseResult with parsed data or error
 */
export function parseBlogPostMarkdown(content: string): ParseResult<ParsedBlogPost> {
  const warnings: string[] = [];

  try {
    // Parse frontmatter with gray-matter
    const parsed = matter(content);

    // Validate required fields
    const missingFields = validateFrontmatterFields(parsed.data);
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `缺少必要的 frontmatter 欄位：${missingFields.join(', ')}`,
      };
    }

    // Validate visibility
    if (!isValidVisibility(parsed.data.visibility)) {
      return {
        success: false,
        error: `visibility 無效："${parsed.data.visibility}"。必須是 draft / private / public 其中之一`,
      };
    }

    // Extract frontmatter
    const frontmatter = extractFrontmatterFromData(parsed.data);

    // Parse content (single-language; legacy markers supported)
    const { content_en, content_zh } = parseBilingualContent(parsed.content);

    if (!content_en) {
      warnings.push('內容為空');
    }

    const result: ParsedBlogPost = {
      frontmatter,
      content_en,
      ...(content_zh && { content_zh }),
    };

    return {
      success: true,
      data: result,
      ...(warnings.length > 0 && { warnings }),
    };
  } catch (error) {
    return {
      success: false,
      error: `Markdown 解析失敗：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse multiple Markdown files from a folder structure.
 *
 * @param files - Map of file path -> content
 * @returns Array of parse results with file paths
 */
export function parseBlogPostsFromFiles(
  files: Map<string, string>
): Array<{ path: string; result: ParseResult<ParsedBlogPost> }> {
  const results: Array<{ path: string; result: ParseResult<ParsedBlogPost> }> = [];

  for (const [path, content] of files) {
    results.push({
      path,
      result: parseBlogPostMarkdown(content),
    });
  }

  return results;
}
