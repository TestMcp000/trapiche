/**
 * Embedding Target Content IO Module
 * @see doc/specs/completed/SUPABASE_AI.md §2.2
 * @see uiux_refactor.md §6.4.2
 *
 * Server-only module for fetching raw content from business tables
 * for embedding generation. Extracts minimal AI-safe content per PRD.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { EmbeddingTargetType } from '@/lib/types/embedding';
import type { EnrichmentContext } from '@/lib/modules/preprocessing/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RawContentResult {
  rawContent: string;
  context: EnrichmentContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Fetchers (per target type)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch raw content for a product.
 * Composition: name_en/zh + descriptions + tags + category
 * @see SUPABASE_AI.md §2.2
 */
async function getProductContent(targetId: string): Promise<RawContentResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name_en,
      name_zh,
      description_short_en,
      description_short_zh,
      description_full_en,
      description_full_zh,
      tags_en,
      tags_zh,
      category,
      is_visible
    `)
    .eq('id', targetId)
    .single();

  if (error || !data) {
    console.error('[getProductContent] Query error:', error);
    return null;
  }

  // Skip hidden products
  if (!data.is_visible) {
    return null;
  }

  // Compose content for embedding
  const parts: string[] = [];
  if (data.name_en) parts.push(data.name_en);
  if (data.name_zh) parts.push(data.name_zh);
  if (data.description_short_en) parts.push(data.description_short_en);
  if (data.description_short_zh) parts.push(data.description_short_zh);
  if (data.description_full_en) parts.push(data.description_full_en);
  if (data.description_full_zh) parts.push(data.description_full_zh);

  const mergedTags = [
    ...(Array.isArray(data.tags_en) ? data.tags_en : []),
    ...(Array.isArray(data.tags_zh) ? data.tags_zh : []),
  ]
    .map((t) => String(t).trim())
    .filter(Boolean);
  const uniqueTags = Array.from(new Set(mergedTags));
  if (uniqueTags.length > 0) {
    parts.push(uniqueTags.join(', '));
  }
  if (data.category) parts.push(`Category: ${data.category}`);

  const rawContent = parts.join('\n\n');

  return {
    rawContent,
    context: {
      targetType: 'product',
      targetId: data.id,
      parentTitle: data.name_en ?? data.name_zh ?? undefined,
      category: data.category ?? undefined,
      tags: uniqueTags.length > 0 ? uniqueTags : undefined,
    },
  };
}

/**
 * Fetch raw content for a post.
 * Composition: title_en + title_zh + excerpt_en + excerpt_zh
 * @see SUPABASE_AI.md §2.2
 */
async function getPostContent(targetId: string): Promise<RawContentResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title_en,
      title_zh,
      excerpt_en,
      excerpt_zh,
      visibility,
      categories ( slug )
    `)
    .eq('id', targetId)
    .single();

  if (error || !data) {
    console.error('[getPostContent] Query error:', error);
    return null;
  }

  // Skip non-public posts
  if (data.visibility !== 'public') {
    return null;
  }

  // Compose content for embedding
  const parts: string[] = [];
  if (data.title_en) parts.push(data.title_en);
  if (data.title_zh) parts.push(data.title_zh);
  if (data.excerpt_en) parts.push(data.excerpt_en);
  if (data.excerpt_zh) parts.push(data.excerpt_zh);

  const rawContent = parts.join('\n\n');

  const categoriesValue = (data as unknown as { categories?: { slug?: string } | Array<{ slug?: string }> })
    .categories;
  const categorySlug = Array.isArray(categoriesValue)
    ? categoriesValue[0]?.slug
    : categoriesValue?.slug;

  return {
    rawContent,
    context: {
      targetType: 'post',
      targetId: data.id,
      parentTitle: data.title_en ?? data.title_zh ?? undefined,
      category: categorySlug ?? undefined,
    },
  };
}

/**
 * Fetch raw content for a gallery item.
 * Composition: title_en + title_zh + description_en + description_zh
 * @see SUPABASE_AI.md §2.2
 */
async function getGalleryItemContent(targetId: string): Promise<RawContentResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('gallery_items')
    .select(`
      id,
      title_en,
      title_zh,
      description_en,
      description_zh,
      is_visible,
      gallery_categories ( slug )
    `)
    .eq('id', targetId)
    .single();

  if (error || !data) {
    console.error('[getGalleryItemContent] Query error:', error);
    return null;
  }

  // Skip hidden items
  if (!data.is_visible) {
    return null;
  }

  // Compose content for embedding
  const parts: string[] = [];
  if (data.title_en) parts.push(data.title_en);
  if (data.title_zh) parts.push(data.title_zh);
  if (data.description_en) parts.push(data.description_en);
  if (data.description_zh) parts.push(data.description_zh);

  const rawContent = parts.join('\n\n');

  const galleryCategoriesValue = (
    data as unknown as { gallery_categories?: { slug?: string } | Array<{ slug?: string }> }
  ).gallery_categories;
  const categorySlug = Array.isArray(galleryCategoriesValue)
    ? galleryCategoriesValue[0]?.slug
    : galleryCategoriesValue?.slug;

  return {
    rawContent,
    context: {
      targetType: 'gallery_item',
      targetId: data.id,
      parentTitle: data.title_en ?? data.title_zh ?? undefined,
      category: categorySlug ?? undefined,
    },
  };
}

/**
 * Fetch raw content for a comment.
 * Composition: content only (single language)
 * @see SUPABASE_AI.md §2.2, §2.5
 */
async function getCommentContent(targetId: string): Promise<RawContentResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('comments')
    .select('id, content, is_approved, is_spam')
    .eq('id', targetId)
    .single();

  if (error || !data) {
    console.error('[getCommentContent] Query error:', error);
    return null;
  }

  // Skip unapproved or spam comments
  if (!data.is_approved || data.is_spam) {
    return null;
  }

  const rawContent = data.content ?? '';

  return {
    rawContent,
    context: {
      targetType: 'comment',
      targetId: data.id,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch raw content for embedding generation.
 * Routes to appropriate fetcher based on target type.
 *
 * @returns RawContentResult with content and context, or null if not found/hidden
 */
export async function getTargetContent(
  targetType: EmbeddingTargetType,
  targetId: string
): Promise<RawContentResult | null> {
  switch (targetType) {
    case 'product':
      return getProductContent(targetId);
    case 'post':
      return getPostContent(targetId);
    case 'gallery_item':
      return getGalleryItemContent(targetId);
    case 'comment':
      return getCommentContent(targetId);
    default:
      console.error(`[getTargetContent] Unknown target type: ${targetType}`);
      return null;
  }
}
