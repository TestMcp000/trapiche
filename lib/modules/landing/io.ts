/**
 * Landing Section IO - Public Reads
 *
 * Server-side IO helpers for landing section database queries.
 * Uses an anonymous Supabase client (no cookies) so it can be safely used
 * by cached reads and metadata generation.
 *
 * @module lib/modules/landing/io
 * @see lib/infrastructure/supabase/anon.ts
 */

import 'server-only';
import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { LandingSection, GalleryContent } from '@/lib/types/landing';
import type { GalleryItem } from '@/lib/types/gallery';
import {
  getVisibleGalleryItemsByCategoryId,
  getVisibleGalleryItemsBySurface,
} from '@/lib/modules/gallery/io';

/**
 * Get all visible landing sections ordered by sort_order
 *
 * Used for rendering the public landing page.
 * Only returns sections where is_visible = true.
 */
export async function getVisibleLandingSections(): Promise<LandingSection[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('landing_sections')
    .select(`
      id,
      section_key,
      section_type,
      sort_order,
      is_visible,
      title_en,
      title_zh,
      subtitle_en,
      subtitle_zh,
      content_en,
      content_zh,
      gallery_category_id,
      gallery_surface,
      created_at,
      updated_at
    `)
    .eq('is_visible', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching visible landing sections:', error);
    return [];
  }

  return (data ?? []) as LandingSection[];
}

/**
 * Get a visible landing section by section_key
 *
 * Used for generating SEO metadata or specific section lookups.
 */
export async function getVisibleLandingSectionByKey(
  sectionKey: string
): Promise<LandingSection | null> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('landing_sections')
    .select('*')
    .eq('section_key', sectionKey)
    .eq('is_visible', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as LandingSection;
}

// ============================================
// Gallery Data Aggregation for Landing Sections
// ============================================

const DEFAULT_GALLERY_LIMIT = 12;

/**
 * Get the limit from section content, with fallback to default
 */
function getGalleryLimit(section: LandingSection): number {
  // Try to get limit from content_en (primary) or content_zh
  const content = (section.content_en || section.content_zh) as GalleryContent | null;
  if (content && typeof content.limit === 'number' && content.limit >= 1 && content.limit <= 12) {
    return content.limit;
  }
  return DEFAULT_GALLERY_LIMIT;
}

/**
 * Fetch gallery data for all gallery-type sections
 *
 * For each section that needs gallery data (section_type === 'gallery' or section_key === 'product_design'),
 * this function fetches the appropriate gallery items based on either:
 * - gallery_category_id: Items from a specific category
 * - gallery_surface: Featured pins from 'home' or 'gallery' surface
 *
 * @returns Record mapping section ID to array of gallery items
 */
export async function fetchGalleryDataForSections(
  sections: LandingSection[]
): Promise<Record<string, GalleryItem[]>> {
  // Filter sections that need gallery data
  const gallerySections = sections.filter(
    (s) => s.section_type === 'gallery' || s.section_key === 'product_design'
  );

  if (gallerySections.length === 0) {
    return {};
  }

  // Fetch gallery data for each section in parallel
  const results = await Promise.all(
    gallerySections.map(async (section) => {
      const limit = getGalleryLimit(section);

      let items: GalleryItem[] = [];

      if (section.gallery_category_id) {
        // Fetch by category ID
        items = await getVisibleGalleryItemsByCategoryId(section.gallery_category_id, limit);
      } else if (section.gallery_surface) {
        // Fetch by surface (featured pins)
        items = await getVisibleGalleryItemsBySurface(section.gallery_surface, limit);
      }

      return { sectionId: section.id, items };
    })
  );

  // Build result map
  const resultMap: Record<string, GalleryItem[]> = {};
  for (const { sectionId, items } of results) {
    resultMap[sectionId] = items;
  }

  return resultMap;
}
