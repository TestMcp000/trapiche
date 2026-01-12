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
