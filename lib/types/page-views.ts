/**
 * Page View Analytics Types
 *
 * Type definitions for page view tracking requests and data.
 * Privacy-first design: no PII stored.
 *
 * @see supabase/02_add/16_page_views.sql - Database schema
 * @see lib/validators/page-views.ts - Request validation
 * @see lib/analytics/pageviews-io.ts - Server-side IO
 */

/**
 * Supported locales for page view tracking.
 * Must match DB constraint in 16_page_views.sql.
 */
export type PageViewLocale = 'zh';

/**
 * Page view tracking request payload.
 * Sent from client via sendBeacon/fetch.
 */
export interface PageViewRequest {
  /** Canonical path (without locale prefix), e.g. '/blog/my-post' or '/' for home */
  path: string;
  /** Locale of the page being viewed */
  locale: PageViewLocale;
}

// =============================================================================
// Admin Dashboard Types
// =============================================================================

/** Locale filter for admin dashboard (includes 'all' for aggregate) */
export type PageViewAdminLocaleFilter = 'all' | PageViewLocale;

/** Daily row from page_view_daily table */
export interface PageViewDailyRow {
  day: string; // YYYY-MM-DD
  path: string;
  locale: PageViewLocale;
  viewCount: number;
}

/** Page views summary for dashboard */
export interface PageViewSummary {
  totalViews: number;
  dateRange: { from: string; to: string };
  locale: PageViewAdminLocaleFilter;
}

/** Top page item for list display */
export interface TopPageItem {
  path: string;
  viewCount: number;
}

/** Dashboard data returned to server page */
export interface PageViewDashboardData {
  summary: PageViewSummary;
  topPages: TopPageItem[];
  totalPagesCount: number; // for pagination
}
