/**
 * Blog Post Markdown Formatter (Pure)
 *
 * Formats blog posts to Markdown with YAML frontmatter.
 * Following PRD §2.1 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.1
 */

import type { Post } from '@/lib/types/blog';
import type { BlogPostFrontmatter } from '@/lib/types/import-export';

// =============================================================================
// Constants
// =============================================================================

/** Language content separator markers */
export const LANG_MARKER_EN = '<!-- lang: en -->';
export const LANG_MARKER_ZH = '<!-- lang: zh -->';

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Extract frontmatter data from a Post object.
 * @param post - The blog post to extract frontmatter from
 * @returns Frontmatter object for YAML serialization
 */
export function extractFrontmatter(post: Post): BlogPostFrontmatter {
  return {
    slug: post.slug,
    category: post.category?.slug ?? '',
    visibility: post.visibility,
    created_at: post.created_at,
    title_en: post.title_en,
    ...(post.title_zh && { title_zh: post.title_zh }),
    ...(post.excerpt_en && { excerpt_en: post.excerpt_en }),
    ...(post.excerpt_zh && { excerpt_zh: post.excerpt_zh }),
    ...(post.cover_image_url_en && { cover_image_url_en: post.cover_image_url_en }),
    ...(post.cover_image_url_zh && { cover_image_url_zh: post.cover_image_url_zh }),
    ...(post.cover_image_alt_en && { cover_image_alt_en: post.cover_image_alt_en }),
    ...(post.cover_image_alt_zh && { cover_image_alt_zh: post.cover_image_alt_zh }),
  };
}

/**
 * Serialize frontmatter object to YAML string.
 * @param frontmatter - The frontmatter object to serialize
 * @returns YAML formatted string (without delimiters)
 */
export function serializeFrontmatter(frontmatter: BlogPostFrontmatter): string {
  const lines: string[] = [];

  // Required fields first
  lines.push(`slug: ${frontmatter.slug}`);
  lines.push(`category: ${frontmatter.category}`);
  lines.push(`visibility: ${frontmatter.visibility}`);
  lines.push(`created_at: ${frontmatter.created_at}`);
  lines.push(`title_en: ${escapeYamlString(frontmatter.title_en)}`);

  // Optional fields
  if (frontmatter.title_zh) {
    lines.push(`title_zh: ${escapeYamlString(frontmatter.title_zh)}`);
  }
  if (frontmatter.excerpt_en) {
    lines.push(`excerpt_en: ${escapeYamlString(frontmatter.excerpt_en)}`);
  }
  if (frontmatter.excerpt_zh) {
    lines.push(`excerpt_zh: ${escapeYamlString(frontmatter.excerpt_zh)}`);
  }
  if (frontmatter.cover_image_url_en) {
    lines.push(`cover_image_url_en: ${frontmatter.cover_image_url_en}`);
  }
  if (frontmatter.cover_image_url_zh) {
    lines.push(`cover_image_url_zh: ${frontmatter.cover_image_url_zh}`);
  }
  if (frontmatter.cover_image_alt_en) {
    lines.push(`cover_image_alt_en: ${escapeYamlString(frontmatter.cover_image_alt_en)}`);
  }
  if (frontmatter.cover_image_alt_zh) {
    lines.push(`cover_image_alt_zh: ${escapeYamlString(frontmatter.cover_image_alt_zh)}`);
  }

  return lines.join('\n');
}

/**
 * Escape a string for YAML output.
 * Wraps in quotes if contains special characters.
 */
export function escapeYamlString(value: string): string {
  // Check if string needs quoting
  if (
    value.includes(':') ||
    value.includes('#') ||
    value.includes('\n') ||
    value.includes('"') ||
    value.includes("'") ||
    value.startsWith(' ') ||
    value.endsWith(' ')
  ) {
    // Use double quotes and escape internal quotes
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Format a blog post to Markdown string.
 * @param post - The blog post to format
 * @returns Markdown string with YAML frontmatter and bilingual content
 */
export function formatBlogPostToMarkdown(post: Post): string {
  const frontmatter = extractFrontmatter(post);
  const yamlContent = serializeFrontmatter(frontmatter);

  const parts: string[] = [];

  // YAML frontmatter
  parts.push('---');
  parts.push(yamlContent);
  parts.push('---');
  parts.push('');

  // English content (required)
  parts.push(LANG_MARKER_EN);
  parts.push('');
  parts.push(post.content_en);

  // Chinese content (optional)
  if (post.content_zh) {
    parts.push('');
    parts.push(LANG_MARKER_ZH);
    parts.push('');
    parts.push(post.content_zh);
  }

  return parts.join('\n');
}

/**
 * Generate folder structure for batch export.
 * Posts are organized by category slug.
 *
 * @param posts - Array of blog posts to organize
 * @returns Map of file path -> markdown content
 *
 * @example
 * // Returns:
 * // Map {
 * //   'tech/my-post.md' => '---\nslug: my-post\n...',
 * //   'lifestyle/travel.md' => '---\nslug: travel\n...'
 * // }
 */
export function formatBlogPostsFolderStructure(
  posts: Post[]
): Map<string, string> {
  const result = new Map<string, string>();

  for (const post of posts) {
    const categorySlug = post.category?.slug ?? 'uncategorized';
    const filePath = `${categorySlug}/${post.slug}.md`;
    const content = formatBlogPostToMarkdown(post);
    result.set(filePath, content);
  }

  return result;
}
