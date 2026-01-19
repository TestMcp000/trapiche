/**
 * Page View Analytics Admin IO (Server-only)
 *
 * IO module for reading page view analytics in admin dashboard.
 * Uses authenticated Supabase client with RLS (admin-only policy).
 *
 * @see supabase/02_add/16_page_views.sql - page_view_daily table & RLS
 * @see lib/validators/page-views-admin.ts - Query validation
 * @see ARCHITECTURE.md §3.4 - IO module constraints
 */

import 'server-only';
import { createClient } from '@/lib/infrastructure/supabase/server';
import type {
    PageViewAdminLocaleFilter,
    PageViewDashboardData,
    PageViewSummary,
    TopPageItem,
} from '@/lib/types/page-views';

// =============================================================================
// Types
// =============================================================================

interface GetDashboardParams {
    from: string;
    to: string;
    locale: PageViewAdminLocaleFilter;
    limit: number;
    offset: number;
}

interface RawPageViewRow {
    day: string;
    path: string;
    locale: string;
    view_count: number;
}

// =============================================================================
// Dashboard Data
// =============================================================================

/**
 * Get page view dashboard data with aggregation in application layer.
 *
 * @param params - Validated query parameters
 * @returns Dashboard data with summary and paginated top pages
 *
 * @example
 * ```ts
 * const data = await getPageViewDashboardData({
 *   from: '2026-01-01',
 *   to: '2026-01-07',
 *   locale: 'all',
 *   limit: 50,
 *   offset: 0,
 * });
 * ```
 */
export async function getPageViewDashboardData(
    params: GetDashboardParams
): Promise<PageViewDashboardData> {
    const { from, to, locale, limit, offset } = params;
    const supabase = await createClient();

    // Build query with date range filter
    let query = supabase
        .from('page_view_daily')
        .select('day, path, locale, view_count')
        .gte('day', from)
        .lte('day', to);

    // Add locale filter if not 'all'
    if (locale !== 'all') {
        query = query.eq('locale', locale);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[pageviews-admin-io] Failed to fetch page views:', error.message);
        return emptyDashboardData(from, to, locale);
    }

    const rows = (data ?? []) as RawPageViewRow[];

    // Aggregate in application layer
    const { totalViews, topPages, totalPagesCount } = aggregatePageViews(rows, limit, offset);

    const summary: PageViewSummary = {
        totalViews,
        dateRange: { from, to },
        locale,
    };

    return {
        summary,
        topPages,
        totalPagesCount,
    };
}

// =============================================================================
// Aggregation Helpers (Pure)
// =============================================================================

interface AggregationResult {
    totalViews: number;
    topPages: TopPageItem[];
    totalPagesCount: number;
}

/**
 * Aggregate page view rows into summary and top pages.
 * Pure function for testability.
 */
function aggregatePageViews(
    rows: RawPageViewRow[],
    limit: number,
    offset: number
): AggregationResult {
    if (rows.length === 0) {
        return { totalViews: 0, topPages: [], totalPagesCount: 0 };
    }

    // Aggregate by path
    const pathMap = new Map<string, number>();
    let totalViews = 0;

    for (const row of rows) {
        const count = row.view_count;
        totalViews += count;

        const existing = pathMap.get(row.path) ?? 0;
        pathMap.set(row.path, existing + count);
    }

    // Sort by view count (descending)
    const sortedPaths = Array.from(pathMap.entries())
        .map(([path, viewCount]) => ({ path, viewCount }))
        .sort((a, b) => b.viewCount - a.viewCount);

    const totalPagesCount = sortedPaths.length;

    // Paginate
    const topPages = sortedPaths.slice(offset, offset + limit);

    return { totalViews, topPages, totalPagesCount };
}

/**
 * Return empty dashboard data (for error cases or no data)
 */
function emptyDashboardData(
    from: string,
    to: string,
    locale: PageViewAdminLocaleFilter
): PageViewDashboardData {
    return {
        summary: {
            totalViews: 0,
            dateRange: { from, to },
            locale,
        },
        topPages: [],
        totalPagesCount: 0,
    };
}
