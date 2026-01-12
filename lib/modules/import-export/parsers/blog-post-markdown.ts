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
const REQUIRED_FIELDS = ['slug', 'category', 'visibility', 'title_en'] as const;

/** Valid visibility values */
const VALID_VISIBILITIES = ['draft', 'private', 'public'] as const;

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Parse bilingual content from Markdown body.
 * Splits content by language markers.
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

  // No markers - treat entire content as English
  if (!hasEnMarker && !hasZhMarker) {
    return { content_en: trimmedContent };
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

  return content_zh ? { content_en, content_zh } : { content_en };
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
  const frontmatter: BlogPostFrontmatter = {
    slug: String(data.slug || ''),
    category: String(data.category || ''),
    visibility: isValidVisibility(data.visibility) ? data.visibility : 'draft',
    created_at: String(data.created_at || new Date().toISOString()),
    title_en: String(data.title_en || ''),
  };

  // Add optional fields if present
  if (data.title_zh) {
    frontmatter.title_zh = String(data.title_zh);
  }
  if (data.excerpt_en) {
    frontmatter.excerpt_en = String(data.excerpt_en);
  }
  if (data.excerpt_zh) {
    frontmatter.excerpt_zh = String(data.excerpt_zh);
  }
  if (data.cover_image_url_en) {
    frontmatter.cover_image_url_en = String(data.cover_image_url_en);
  }
  if (data.cover_image_url_zh) {
    frontmatter.cover_image_url_zh = String(data.cover_image_url_zh);
  }
  if (data.cover_image_alt_en) {
    frontmatter.cover_image_alt_en = String(data.cover_image_alt_en);
  }
  if (data.cover_image_alt_zh) {
    frontmatter.cover_image_alt_zh = String(data.cover_image_alt_zh);
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
        error: `Missing required frontmatter fields: ${missingFields.join(', ')}`,
      };
    }

    // Validate visibility
    if (!isValidVisibility(parsed.data.visibility)) {
      return {
        success: false,
        error: `Invalid visibility value: "${parsed.data.visibility}". Must be one of: draft, private, public`,
      };
    }

    // Extract frontmatter
    const frontmatter = extractFrontmatterFromData(parsed.data);

    // Parse bilingual content
    const { content_en, content_zh } = parseBilingualContent(parsed.content);

    // Warn if content_en is empty
    if (!content_en) {
      warnings.push('English content is empty');
    }

    // Warn if no ZH content and title_zh exists
    if (!content_zh && frontmatter.title_zh) {
      warnings.push(
        'Chinese title exists but Chinese content is missing'
      );
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
      error: `Failed to parse Markdown: ${error instanceof Error ? error.message : String(error)}`,
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
