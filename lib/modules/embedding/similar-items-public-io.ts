/**
 * Similar Items Public IO Module
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3.2 item 3
 *
 * Server-only module to resolve similar item IDs into displayable data.
 * Uses anon client for public reads (not service role).
 */
import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import { getSimilarItemsCached, isSemanticSearchEnabledCached } from './cached';

// ─────────────────────────────────────────────────────────────────────────────
// Product Resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolved similar product for UI display.
 */
export interface ResolvedSimilarProduct {
  id: string;
  slug: string;
  category: string | null;
  nameEn: string | null;
  nameZh: string | null;
  coverImageUrl: string | null;
  minPriceCents: number;
  similarity: number;
}

/**
 * Get similar products resolved with product details.
 * Returns empty array if feature disabled or no similar items.
 */
export async function getResolvedSimilarProducts(
  productId: string,
  limit = 4
): Promise<ResolvedSimilarProduct[]> {
  // Feature gate check
  const isEnabled = await isSemanticSearchEnabledCached();
  if (!isEnabled) return [];

  // Get similar items
  const similarItems = await getSimilarItemsCached('product', productId, limit);
  if (similarItems.length === 0) return [];

  // Filter to product type only
  const productIds = similarItems
    .filter((item) => item.targetType === 'product')
    .map((item) => item.targetId);

  if (productIds.length === 0) return [];

  // Fetch product details
  const supabase = createAnonClient();
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      category,
      name_en,
      name_zh,
      cover_image_url,
      is_visible,
      product_variants!inner(price_cents)
    `)
    .in('id', productIds)
    .eq('is_visible', true);

  if (!products || products.length === 0) return [];

  // Map to similarity scores
  const similarityMap = new Map<string, number>();
  for (const item of similarItems) {
    similarityMap.set(item.targetId, item.similarity);
  }

  // Transform and sort by similarity
  return (products as Array<{
    id: string;
    slug: string;
    category: string | null;
    name_en: string | null;
    name_zh: string | null;
    cover_image_url: string | null;
    product_variants: Array<{ price_cents: number }>;
  }>)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      category: p.category,
      nameEn: p.name_en,
      nameZh: p.name_zh,
      coverImageUrl: p.cover_image_url,
      minPriceCents: Math.min(...p.product_variants.map((v) => v.price_cents)),
      similarity: similarityMap.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolved similar post for UI display.
 */
export interface ResolvedSimilarPost {
  id: string;
  slug: string;
  titleEn: string;
  titleZh: string | null;
  excerptEn: string | null;
  excerptZh: string | null;
  coverImageUrl: string | null;
  category: { slug: string; nameEn: string; nameZh: string } | null;
  publishedAt: string | null;
  similarity: number;
}

/**
 * Get similar posts resolved with post details.
 * Returns empty array if feature disabled or no similar items.
 */
export async function getResolvedSimilarPosts(
  postId: string,
  limit = 4
): Promise<ResolvedSimilarPost[]> {
  // Feature gate check
  const isEnabled = await isSemanticSearchEnabledCached();
  if (!isEnabled) return [];

  // Get similar items
  const similarItems = await getSimilarItemsCached('post', postId, limit);
  if (similarItems.length === 0) return [];

  // Filter to post type only
  const postIds = similarItems
    .filter((item) => item.targetType === 'post')
    .map((item) => item.targetId);

  if (postIds.length === 0) return [];

  // Fetch post details
  const supabase = createAnonClient();
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      slug,
      title_en,
      title_zh,
      excerpt_en,
      excerpt_zh,
      cover_image_url,
      cover_image_url_en,
      cover_image_url_zh,
      published_at,
      visibility,
      category:categories(slug, name_en, name_zh)
    `)
    .in('id', postIds)
    .eq('visibility', 'public');

  if (!posts || posts.length === 0) return [];

  // Map to similarity scores
  const similarityMap = new Map<string, number>();
  for (const item of similarItems) {
    similarityMap.set(item.targetId, item.similarity);
  }

  // Transform and sort by similarity
  // Note: Supabase joins on foreign keys can return array or object depending on cardinality
  return posts
    .map((p) => {
      // Handle category - may be array or object from Supabase join
      const category = Array.isArray(p.category) ? p.category[0] : p.category;
      return {
        id: p.id as string,
        slug: p.slug as string,
        titleEn: p.title_en as string,
        titleZh: p.title_zh as string | null,
        excerptEn: p.excerpt_en as string | null,
        excerptZh: p.excerpt_zh as string | null,
        coverImageUrl: (p.cover_image_url_en || p.cover_image_url_zh || p.cover_image_url) as string | null,
        category: category
          ? { slug: category.slug as string, nameEn: category.name_en as string, nameZh: category.name_zh as string }
          : null,
        publishedAt: p.published_at as string | null,
        similarity: similarityMap.get(p.id as string) ?? 0,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery Item Resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolved similar gallery item for UI display.
 */
export interface ResolvedSimilarGalleryItem {
  id: string;
  slug: string;
  titleEn: string;
  titleZh: string;
  imageUrl: string;
  category: { slug: string; nameEn: string; nameZh: string } | null;
  similarity: number;
}

/**
 * Get similar gallery items resolved with item details.
 * Returns empty array if feature disabled or no similar items.
 */
export async function getResolvedSimilarGalleryItems(
  galleryItemId: string,
  limit = 4
): Promise<ResolvedSimilarGalleryItem[]> {
  // Feature gate check
  const isEnabled = await isSemanticSearchEnabledCached();
  if (!isEnabled) return [];

  // Get similar items
  const similarItems = await getSimilarItemsCached('gallery_item', galleryItemId, limit);
  if (similarItems.length === 0) return [];

  // Filter to gallery_item type only
  const itemIds = similarItems
    .filter((item) => item.targetType === 'gallery_item')
    .map((item) => item.targetId);

  if (itemIds.length === 0) return [];

  // Fetch gallery item details
  const supabase = createAnonClient();
  const { data: items } = await supabase
    .from('gallery_items')
    .select(`
      id,
      slug,
      title_en,
      title_zh,
      image_url,
      is_visible,
      category:gallery_categories(slug, name_en, name_zh)
    `)
    .in('id', itemIds)
    .eq('is_visible', true);

  if (!items || items.length === 0) return [];

  // Map to similarity scores
  const similarityMap = new Map<string, number>();
  for (const item of similarItems) {
    similarityMap.set(item.targetId, item.similarity);
  }

  // Transform and sort by similarity
  // Note: Supabase joins on foreign keys can return array or object depending on cardinality
  return items
    .map((item) => {
      // Handle category - may be array or object from Supabase join
      const category = Array.isArray(item.category) ? item.category[0] : item.category;
      return {
        id: item.id as string,
        slug: item.slug as string,
        titleEn: item.title_en as string,
        titleZh: item.title_zh as string,
        imageUrl: item.image_url as string,
        category: category
          ? { slug: category.slug as string, nameEn: category.name_en as string, nameZh: category.name_zh as string }
          : null,
        similarity: similarityMap.get(item.id as string) ?? 0,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}
