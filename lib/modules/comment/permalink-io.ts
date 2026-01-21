/**
 * Comment Permalink IO
 *
 * Build permalink URLs for comment targets.
 * Used by spam pipeline for Akismet integration.
 *
 * @module lib/modules/comment/permalink-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 * @see ARCHITECTURE.md §3.11 - SEO / URL single source
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { SITE_URL } from '@/lib/site/site-url';
import { DEFAULT_LOCALE } from '@/lib/i18n/locales';
import { buildBlogPostUrl, buildGalleryItemUrl } from '@/lib/seo/url-builders';
import type { CommentTargetType } from '@/lib/types/comments';

/**
 * Build permalink URL for a comment target.
 * Returns v2 canonical absolute URL for Akismet integration.
 *
 * @param targetType - 'post' | 'gallery_item'
 * @param targetId - UUID of the target entity
 * @returns Absolute canonical URL (e.g., https://example.com/zh/blog/posts/my-post)
 */
export async function buildPermalink(
  targetType: CommentTargetType,
  targetId: string
): Promise<string> {
  const supabase = await createClient();

  if (targetType === 'post') {
    const { data: post } = await supabase
      .from('posts')
      .select('slug')
      .eq('id', targetId)
      .single();

    const slug = post?.slug || targetId;
    return `${SITE_URL}${buildBlogPostUrl(DEFAULT_LOCALE, slug)}`;
  }

  if (targetType === 'gallery_item') {
    const { data: item } = await supabase
      .from('gallery_items')
      .select('slug, gallery_categories(slug)')
      .eq('id', targetId)
      .single();

    // Extract category slug from joined data
    const categoryData = item?.gallery_categories;
    let categorySlug = 'uncategorized';
    if (categoryData) {
      if (Array.isArray(categoryData) && categoryData.length > 0) {
        categorySlug = categoryData[0]?.slug || 'uncategorized';
      } else if (typeof categoryData === 'object' && 'slug' in categoryData) {
        categorySlug = (categoryData as { slug: string }).slug || 'uncategorized';
      }
    }

    const itemSlug = item?.slug || targetId;
    return `${SITE_URL}${buildGalleryItemUrl(DEFAULT_LOCALE, categorySlug, itemSlug)}`;
  }

  return SITE_URL;
}
