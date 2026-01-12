/**
 * Cached Landing Section Data Access
 *
 * Wraps lib/modules/landing/io.ts with global cache versioning so public routes can
 * reuse server-side results and keep TTFB/LCP stable.
 *
 * @module lib/modules/landing/cached
 * @see lib/cache/wrapper.ts
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type { LandingSection } from '@/lib/types/landing';
import type { GalleryItem } from '@/lib/types/gallery';
import {
  getVisibleLandingSections,
  getVisibleLandingSectionByKey,
  fetchGalleryDataForSections,
} from '@/lib/modules/landing/io';

const CACHE_REVALIDATE_SECONDS = 60;

/**
 * Get all visible landing sections (cached)
 *
 * @returns Visible sections ordered by sort_order
 */
export const getVisibleLandingSectionsCached = cachedQuery(
  async (): Promise<LandingSection[]> => getVisibleLandingSections(),
  ['visible-landing-sections'],
  ['landing-sections'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Get a visible landing section by key (cached)
 *
 * @param sectionKey - The section key to lookup
 * @returns The section if visible, null otherwise
 */
export const getVisibleLandingSectionByKeyCached = cachedQuery(
  async (sectionKey: string): Promise<LandingSection | null> =>
    getVisibleLandingSectionByKey(sectionKey),
  ['visible-landing-section-by-key'],
  ['landing-sections'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Fetch gallery data for landing sections (cached)
 *
 * @param sections - The sections to fetch gallery data for
 * @returns Record mapping section ID to gallery items
 */
export const fetchGalleryDataForSectionsCached = cachedQuery(
  async (sections: LandingSection[]): Promise<Record<string, GalleryItem[]>> =>
    fetchGalleryDataForSections(sections),
  ['landing-gallery-data'],
  ['landing-sections', 'gallery'],
  CACHE_REVALIDATE_SECONDS
);
