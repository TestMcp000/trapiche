/**
 * Page Views Admin Query Validator (Pure Functions)
 *
 * Validates query parameters for /admin/analytics/pageviews dashboard.
 * Supports: date range filtering, locale filtering, pagination.
 *
 * @module lib/validators/page-views-admin
 * @see ARCHITECTURE.md §3.6 - Runtime Validators
 * @see doc/specs/completed/page-views-analytics-spec.md (query contract)
 */

import { type ValidationResult, validResult } from './api-common';
import type { PageViewLocale } from '@/lib/types/page-views';

// =============================================================================
// Constants
// =============================================================================

/** Maximum date range in days (prevent heavy queries) */
const MAX_DATE_RANGE_DAYS = 90;

/** Default date range in days */
const DEFAULT_DATE_RANGE_DAYS = 7;

/** Allowed page sizes */
const ALLOWED_PAGE_SIZES = [20, 50, 100] as const;

/** Default page size */
const DEFAULT_PAGE_SIZE = 50;

/** Default page number */
const DEFAULT_PAGE = 1;

/** Valid locale filters for admin dashboard */
const VALID_LOCALE_FILTERS = ['all', 'zh'] as const;

/** Default locale filter */
const DEFAULT_LOCALE_FILTER = 'all' as const;

/** Date format pattern YYYY-MM-DD */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// =============================================================================
// Types
// =============================================================================

/** Locale filter options for admin dashboard (includes 'all' for aggregate) */
export type PageViewAdminLocaleFilter = 'all' | PageViewLocale;

export interface PageViewsAdminQueryParams {
    /** Start date (YYYY-MM-DD, default: 7 days ago) */
    from: string;
    /** End date (YYYY-MM-DD, default: today) */
    to: string;
    /** Locale filter ('all' for aggregate, 'zh' for specific) */
    locale: PageViewAdminLocaleFilter;
    /** Current page number (>= 1, default 1) */
    page: number;
    /** Items per page (20/50/100, default 50) */
    pageSize: number;
    /** SQL LIMIT (equals pageSize) */
    limit: number;
    /** SQL OFFSET ((page - 1) * pageSize) */
    offset: number;
}

export interface RawPageViewsAdminQueryParams {
    from?: string;
    to?: string;
    locale?: string;
    page?: string;
    pageSize?: string;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Get today's date as YYYY-MM-DD in UTC
 */
function getTodayUTC(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Get date N days ago as YYYY-MM-DD in UTC
 */
function getDateDaysAgoUTC(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
}

/**
 * Check if a string is a valid YYYY-MM-DD date
 */
function isValidDateFormat(dateStr: string): boolean {
    if (!DATE_PATTERN.test(dateStr)) return false;

    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return false;

    // Verify the date matches (handles invalid dates like 2026-02-30)
    return date.toISOString().slice(0, 10) === dateStr;
}

/**
 * Calculate difference between two dates in days
 */
function dateDiffDays(from: string, to: string): number {
    const fromDate = new Date(from + 'T00:00:00Z');
    const toDate = new Date(to + 'T00:00:00Z');
    const diffMs = toDate.getTime() - fromDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Parse and validate date range
 * @returns Validated { from, to } or default range
 */
function parseDateRange(
    rawFrom: unknown,
    rawTo: unknown
): { from: string; to: string } {
    const today = getTodayUTC();
    const defaultFrom = getDateDaysAgoUTC(DEFAULT_DATE_RANGE_DAYS);

    // Default values
    let from = defaultFrom;
    let to = today;

    // Parse 'from'
    if (typeof rawFrom === 'string' && isValidDateFormat(rawFrom)) {
        from = rawFrom;
    }

    // Parse 'to'
    if (typeof rawTo === 'string' && isValidDateFormat(rawTo)) {
        to = rawTo;
    }

    // Validate: from must be <= to
    if (from > to) {
        // Swap if reversed
        [from, to] = [to, from];
    }

    // Validate: max range
    const diffDays = dateDiffDays(from, to);
    if (diffDays > MAX_DATE_RANGE_DAYS) {
        // Clamp to max range (keep 'to', adjust 'from')
        const maxFrom = new Date(to + 'T00:00:00Z');
        maxFrom.setDate(maxFrom.getDate() - MAX_DATE_RANGE_DAYS);
        from = maxFrom.toISOString().slice(0, 10);
    }

    // Validate: 'to' cannot be in the future
    if (to > today) {
        to = today;
    }

    return { from, to };
}

/**
 * Parse and validate locale filter
 */
function parseLocaleFilter(locale: unknown): PageViewAdminLocaleFilter {
    if (typeof locale !== 'string') return DEFAULT_LOCALE_FILTER;

    const normalized = locale.toLowerCase().trim();
    if (VALID_LOCALE_FILTERS.includes(normalized as PageViewAdminLocaleFilter)) {
        return normalized as PageViewAdminLocaleFilter;
    }

    return DEFAULT_LOCALE_FILTER;
}

/**
 * Parse and validate page number
 */
function parsePage(page: unknown): number {
    if (typeof page !== 'string') return DEFAULT_PAGE;

    const parsed = parseInt(page, 10);
    if (isNaN(parsed) || parsed < 1) return DEFAULT_PAGE;

    return parsed;
}

/**
 * Parse and validate page size
 */
function parsePageSize(pageSize: unknown): number {
    if (typeof pageSize !== 'string') return DEFAULT_PAGE_SIZE;

    const parsed = parseInt(pageSize, 10);
    if (isNaN(parsed) || !ALLOWED_PAGE_SIZES.includes(parsed as 20 | 50 | 100)) {
        return DEFAULT_PAGE_SIZE;
    }

    return parsed;
}

// =============================================================================
// Main Validator
// =============================================================================

/**
 * Validate page views admin query parameters
 *
 * @param params - Raw query parameters from searchParams
 * @returns ValidationResult with parsed PageViewsAdminQueryParams
 *
 * @example
 * ```ts
 * const result = validatePageViewsAdminQuery({ from: '2026-01-01', to: '2026-01-07' });
 * if (result.valid) {
 *   console.log(result.data.from); // '2026-01-01'
 *   console.log(result.data.locale); // 'all' (default)
 * }
 * ```
 */
export function validatePageViewsAdminQuery(
    params: RawPageViewsAdminQueryParams
): ValidationResult<PageViewsAdminQueryParams> {
    const { from, to } = parseDateRange(params.from, params.to);
    const locale = parseLocaleFilter(params.locale);
    const page = parsePage(params.page);
    const pageSize = parsePageSize(params.pageSize);

    // Calculate limit and offset
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    return validResult({
        from,
        to,
        locale,
        page,
        pageSize,
        limit,
        offset,
    });
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const _testing = {
    MAX_DATE_RANGE_DAYS,
    DEFAULT_DATE_RANGE_DAYS,
    ALLOWED_PAGE_SIZES,
    DEFAULT_PAGE_SIZE,
    DEFAULT_PAGE,
    VALID_LOCALE_FILTERS,
    DEFAULT_LOCALE_FILTER,
    DATE_PATTERN,
    getTodayUTC,
    getDateDaysAgoUTC,
    isValidDateFormat,
    dateDiffDays,
    parseDateRange,
    parseLocaleFilter,
    parsePage,
    parsePageSize,
};
