/**
 * Cached versions of content functions for frontend use.
 * These functions use an anonymous Supabase client (no cookies) 
 * so they can be safely used with Next.js unstable_cache.
 * 
 * Use these in frontend pages (e.g., app/[locale]/page.tsx) 
 * instead of the direct database functions to improve TTFB and LCP.
 * 
 * @module lib/modules/content/cached
 */

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import { cachedQuery } from '@/lib/cache/wrapper';
import type { SiteContent, PortfolioItem, Service, CompanySetting } from '@/lib/types/content';

// Cache revalidation time in seconds (1 minute = 60 seconds)
const CACHE_REVALIDATE_SECONDS = 60;

/**
 * Cached version of getPublishedSiteContent
 * Revalidates every 60 seconds
 */
export const getPublishedSiteContentCached = cachedQuery(
  async (): Promise<SiteContent[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('is_published', true)
      .order('section_key');

    if (error) {
      console.error('Error fetching published site content:', error);
      return [];
    }

    return data || [];
  },
  ['published-site-content'],
  ['site-content'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Cached version of getVisiblePortfolioItems
 * Revalidates every 60 seconds
 */
export const getVisiblePortfolioItemsCached = cachedQuery(
  async (): Promise<PortfolioItem[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching visible portfolio items:', error);
      return [];
    }

    return data || [];
  },
  ['visible-portfolio-items'],
  ['portfolio'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Cached version of getVisibleServices
 * Revalidates every 60 seconds
 */
export const getVisibleServicesCached = cachedQuery(
  async (): Promise<Service[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching visible services:', error);
      return [];
    }

    return data || [];
  },
  ['visible-services'],
  ['services'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Cached version of getCompanySettings
 * Revalidates every 60 seconds
 */
export const getCompanySettingsCached = cachedQuery(
  async (): Promise<CompanySetting[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .order('category')
      .order('key');

    if (error) {
      console.error('Error fetching company settings:', error);
      return [];
    }

    return data || [];
  },
  ['company-settings'],
  ['company-settings'],
  CACHE_REVALIDATE_SECONDS
);

// =============================================================================
// Hamburger Nav (PR-8)
// =============================================================================

import type { HamburgerNavV2 } from '@/lib/types/hamburger-nav';
import { parseHamburgerNav } from '@/lib/validators/hamburger-nav';

const EMPTY_HAMBURGER_NAV: HamburgerNavV2 = {
  version: 2,
  groups: [],
};

/**
 * Cached hamburger nav v2 fetch
 * Returns parsed HamburgerNavV2 or empty nav if not found/invalid
 */
export const getHamburgerNavCached = cachedQuery(
  async (): Promise<HamburgerNavV2> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('site_content')
      .select('content_zh')
      .eq('section_key', 'hamburger_nav')
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching hamburger nav:', error);
      return EMPTY_HAMBURGER_NAV;
    }

    if (!data?.content_zh) {
      return EMPTY_HAMBURGER_NAV;
    }

    const { nav, errors } = parseHamburgerNav(data.content_zh as Record<string, unknown>);

    if (!nav) {
      console.error('Invalid hamburger nav content:', errors);
      return EMPTY_HAMBURGER_NAV;
    }

    return nav;
  },
  ['hamburger-nav'],
  ['site-content'],
  CACHE_REVALIDATE_SECONDS
);

