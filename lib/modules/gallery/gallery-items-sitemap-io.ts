/**
 * Gallery Items Sitemap IO
 *
 * Database operations for sitemap generation.
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/gallery/gallery-items-sitemap-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';

/**
 * Get minimal data for visible gallery items for sitemap generation
 */
export async function getVisibleGalleryItemsForSitemap(): Promise<
  Array<{ categorySlug: string; itemSlug: string; updatedAt: string }>
> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('gallery_items')
    .select('slug, updated_at, category:gallery_categories!inner(slug)')
    .eq('is_visible', true)
    .eq('category.is_visible', true);

  if (error || !data) {
    console.error('Error fetching gallery items for sitemap:', error);
    return [];
  }

  return data.map(item => {
    const category = item.category as unknown as { slug: string } | null;
    return {
      categorySlug: category?.slug || '',
      itemSlug: item.slug,
      updatedAt: item.updated_at,
    };
  });
}
