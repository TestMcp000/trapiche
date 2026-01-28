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

/**
 * Default hamburger nav seed (matches doc/archive/DESIGN_SSOT.md §6)
 * @see doc/SPEC.md (Home UIUX / Navigation)
 * @see doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md (PR-40)
 */
const DEFAULT_HAMBURGER_NAV: HamburgerNavV2 = {
  version: 2,
  groups: [
    {
      id: 'health-education',
      label: '身心健康衛教',
      items: [
        { id: 'emotion-care', label: '情緒照顧', target: { type: 'blog_index', q: '情緒照顧' } },
        { id: 'anxiety-stress', label: '焦慮壓力', target: { type: 'blog_index', q: '焦慮壓力' } },
        { id: 'sleep', label: '睡眠議題', target: { type: 'blog_index', q: '睡眠議題' } },
        { id: 'boundaries', label: '關係界線', target: { type: 'blog_index', q: '關係界線' } },
        { id: 'self-awareness', label: '自我覺察', target: { type: 'blog_index', q: '自我覺察' } },
      ],
    },
    {
      id: 'book-recommendations',
      label: '書籍推薦',
      items: [
        { id: 'emotion-healing', label: '情緒療癒', target: { type: 'blog_index', q: '情緒療癒' } },
        { id: 'relationship-repair', label: '關係修復', target: { type: 'blog_index', q: '關係修復' } },
        { id: 'self-growth', label: '自我成長', target: { type: 'blog_index', q: '自我成長' } },
        { id: 'healing-writing', label: '療癒書寫', target: { type: 'blog_index', q: '療癒書寫' } },
        { id: 'parenting', label: '親子教養', target: { type: 'blog_index', q: '親子教養' } },
      ],
    },
    {
      id: 'events',
      label: '講座／活動',
      items: [
        { id: 'recent-talks', label: '近期講座', target: { type: 'events_index', eventType: 'talks' } },
        { id: 'workshops', label: '療癒工作坊', target: { type: 'events_index', eventType: 'workshops' } },
        { id: 'corporate-training', label: '企業內訓', target: { type: 'events_index', eventType: 'corporate-training' } },
        { id: 'collaboration', label: '合作邀請', target: { type: 'page', path: '/collaboration' } },
      ],
    },
    {
      id: 'about-contact',
      label: '關於／聯絡',
      items: [
        { id: 'about', label: '心理師介紹', target: { type: 'page', path: '/about' } },
        { id: 'services', label: '服務方式', target: { type: 'page', path: '/services' } },
        { id: 'faq', label: '常見問題', target: { type: 'faq_index' } },
        { id: 'contact', label: '聯絡方式', target: { type: 'page', path: '/contact' } },
      ],
    },
  ],
};

/**
 * Cached hamburger nav v2 fetch
 * Returns parsed HamburgerNavV2 or default if not found/invalid
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
      return DEFAULT_HAMBURGER_NAV;
    }

    if (!data?.content_zh) {
      return DEFAULT_HAMBURGER_NAV;
    }

    const { nav, errors } = parseHamburgerNav(data.content_zh as Record<string, unknown>);

    if (!nav) {
      console.error('Invalid hamburger nav content:', errors);
      return DEFAULT_HAMBURGER_NAV;
    }

    return nav;
  },
  ['hamburger-nav'],
  ['site-content'],
  CACHE_REVALIDATE_SECONDS
);

