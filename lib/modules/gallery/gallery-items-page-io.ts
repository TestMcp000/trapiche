/**
 * Gallery Items Page IO
 *
 * Database operations for paginated gallery item lists.
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/gallery/gallery-items-page-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { GalleryListParams, GalleryListResult } from '@/lib/types/gallery';

/**
 * Get paginated gallery items with optional filtering
 */
export async function getGalleryItemsPage(params: GalleryListParams): Promise<GalleryListResult> {
  const { limit = 24, offset = 0, categorySlug, q, tag, sort = 'newest' } = params;
  const supabase = createAnonClient();

  let query = supabase
    .from('gallery_items')
    .select('*, category:gallery_categories!inner(*)', { count: 'exact' })
    .eq('is_visible', true)
    .eq('category.is_visible', true);

  // Filter by category
  if (categorySlug) {
    query = query.eq('category.slug', categorySlug);
  }

  // Search by title
  if (q) {
    query = query.or(`title_en.ilike.%${q}%,title_zh.ilike.%${q}%`);
  }

  // Filter by tag
  if (tag) {
    query = query.or(`tags_en.cs.{${tag}},tags_zh.cs.{${tag}}`);
  }

  // Sort
  switch (sort) {
    case 'popular':
      query = query.order('like_count', { ascending: false });
      break;
    case 'featured':
      // For featured, we'd need a separate query or join with pins
      // Fallback to newest for now
      query = query.order('created_at', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching gallery items page:', error);
    return { items: [], total: 0 };
  }

  return {
    items: data || [],
    total: count || 0,
  };
}
