/**
 * Comment Permalink IO
 *
 * Build permalink URLs for comment targets.
 * Used by spam pipeline for Akismet integration.
 *
 * @module lib/modules/comment/permalink-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { SITE_URL } from '@/lib/seo/hreflang';
import type { CommentTargetType } from '@/lib/types/comments';

/**
 * Build permalink URL for a comment target
 * Used by API route to construct Akismet permalink
 */
export async function buildPermalink(
  targetType: CommentTargetType,
  targetId: string
): Promise<string> {
  const supabase = await createClient();
  const baseUrl = SITE_URL;

  if (targetType === 'post') {
    const { data: post } = await supabase
      .from('posts')
      .select('slug')
      .eq('id', targetId)
      .single();

    return `${baseUrl}/blog/${post?.slug || targetId}`;
  }

  if (targetType === 'gallery_item') {
    const { data: item } = await supabase
      .from('gallery_items')
      .select('slug, gallery_categories(slug)')
      .eq('id', targetId)
      .single();

    // Handle the joined category - could be object or array depending on Supabase join behavior
    const categoryData = item?.gallery_categories;
    let categorySlug = 'item';
    if (categoryData) {
      if (Array.isArray(categoryData) && categoryData.length > 0) {
        categorySlug = categoryData[0]?.slug || 'item';
      } else if (typeof categoryData === 'object' && 'slug' in categoryData) {
        categorySlug = (categoryData as { slug: string }).slug || 'item';
      }
    }
    return `${baseUrl}/gallery/${categorySlug}/${item?.slug || targetId}`;
  }

  return baseUrl;
}
