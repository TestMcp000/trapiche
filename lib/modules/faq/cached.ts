/**
 * Cached FAQ Data Access
 *
 * Wraps `lib/modules/faq/io.ts` (IO) with global cache versioning so public routes can
 * reuse server-side results and keep TTFB/LCP stable.
 *
 * @see lib/modules/faq/io.ts - Raw IO functions
 * @see lib/modules/faq/admin-io.ts - Admin operations (not cached)
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type { FAQPublic, FAQForSitemap } from '@/lib/types/faq';
import {
    getVisibleFAQs,
    getVisibleFAQsCount,
    getFAQsForSitemap,
} from '@/lib/modules/faq/io';

const CACHE_REVALIDATE_SECONDS = 60;

// =============================================================================
// FAQ - Cached
// =============================================================================

export const getVisibleFAQsCached = cachedQuery(
    async (): Promise<FAQPublic[]> => getVisibleFAQs(),
    ['visible-faqs'],
    ['faqs'],
    CACHE_REVALIDATE_SECONDS
);

export const getVisibleFAQsCountCached = cachedQuery(
    async (): Promise<number> => getVisibleFAQsCount(),
    ['visible-faqs-count'],
    ['faqs'],
    CACHE_REVALIDATE_SECONDS
);

export const getFAQsForSitemapCached = cachedQuery(
    async (): Promise<FAQForSitemap | null> => getFAQsForSitemap(),
    ['faqs-sitemap'],
    ['faqs'],
    CACHE_REVALIDATE_SECONDS
);
