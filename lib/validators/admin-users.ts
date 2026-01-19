/**
 * Admin Users Query Validator (Pure Functions)
 *
 * Validates query parameters for /admin/users page.
 * Supports: tag filtering, search (email/user_id/short_id), pagination.
 *
 * @module lib/validators/admin-users
 * @see ARCHITECTURE.md §3.6 - Runtime Validators
 * @see doc/meta/STEP_PLAN.md - PR-1 Query Contract
 */

import { type ValidationResult, validResult } from './api-common';

// =============================================================================
// Constants
// =============================================================================

/** Maximum length for search query */
const MAX_Q_LENGTH = 100;

/** Maximum length for tag */
const MAX_TAG_LENGTH = 64;

/** Allowed page sizes */
const ALLOWED_PAGE_SIZES = [20, 50, 100] as const;

/** Default page size */
const DEFAULT_PAGE_SIZE = 50;

/** Default page number */
const DEFAULT_PAGE = 1;

/**
 * Regex to detect short_id format (e.g., C12, c123)
 * Case-insensitive, matches 'C' followed by one or more digits
 */
const SHORT_ID_REGEX = /^C\d+$/i;

/**
 * Characters that are not allowed in search queries
 * These could break PostgREST filter expressions
 * Uses global flag to replace all occurrences
 */
const DISALLOWED_CHARS_REGEX = /[,{}()[\]\\]/g;

// =============================================================================
// Types
// =============================================================================

export interface AdminUsersQueryParams {
    /** Tag filter (optional, max 64 chars) */
    tag?: string;
    /** Search query (optional, max 100 chars) */
    q?: string;
    /** Search mode: 'text' for email/user_id fuzzy search, 'short_id' for exact match */
    qMode: 'text' | 'short_id';
    /** Current page number (>= 1, default 1) */
    page: number;
    /** Items per page (20/50/100, default 50) */
    pageSize: number;
    /** SQL LIMIT (equals pageSize) */
    limit: number;
    /** SQL OFFSET ((page - 1) * pageSize) */
    offset: number;
}

export interface RawAdminUsersQueryParams {
    tag?: string;
    q?: string;
    page?: string;
    pageSize?: string;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Sanitize and validate search query string
 * @returns Sanitized string or undefined if empty/invalid
 */
function sanitizeSearchQuery(q: unknown): string | undefined {
    if (typeof q !== 'string') return undefined;

    const trimmed = q.trim();
    if (trimmed === '') return undefined;

    // Truncate if too long
    const truncated = trimmed.length > MAX_Q_LENGTH
        ? trimmed.slice(0, MAX_Q_LENGTH)
        : trimmed;

    // Check for disallowed characters
    if (DISALLOWED_CHARS_REGEX.test(truncated)) {
        // Remove disallowed characters instead of rejecting
        return truncated.replace(DISALLOWED_CHARS_REGEX, '').trim() || undefined;
    }

    return truncated;
}

/**
 * Determine search mode based on query string
 */
function determineSearchMode(q: string | undefined): 'text' | 'short_id' {
    if (!q) return 'text';
    return SHORT_ID_REGEX.test(q) ? 'short_id' : 'text';
}

/**
 * Sanitize and validate tag string
 * @returns Sanitized string or undefined if empty/invalid
 */
function sanitizeTag(tag: unknown): string | undefined {
    if (typeof tag !== 'string') return undefined;

    const trimmed = tag.trim();
    if (trimmed === '') return undefined;

    // Truncate if too long
    return trimmed.length > MAX_TAG_LENGTH
        ? trimmed.slice(0, MAX_TAG_LENGTH)
        : trimmed;
}

/**
 * Parse and validate page number
 * @returns Valid page number (>= 1), defaults to 1
 */
function parsePage(page: unknown): number {
    if (typeof page !== 'string') return DEFAULT_PAGE;

    const parsed = parseInt(page, 10);
    if (isNaN(parsed) || parsed < 1) return DEFAULT_PAGE;

    return parsed;
}

/**
 * Parse and validate page size
 * @returns Valid page size from allowlist, defaults to 50
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
 * Validate admin users query parameters
 *
 * @param params - Raw query parameters from searchParams
 * @returns ValidationResult with parsed AdminUsersQueryParams
 *
 * @example
 * ```ts
 * const result = validateAdminUsersQuery({ q: 'test@email.com', page: '2' });
 * if (result.valid) {
 *   console.log(result.data.q); // 'test@email.com'
 *   console.log(result.data.qMode); // 'text'
 *   console.log(result.data.page); // 2
 * }
 * ```
 */
export function validateAdminUsersQuery(
    params: RawAdminUsersQueryParams
): ValidationResult<AdminUsersQueryParams> {
    const tag = sanitizeTag(params.tag);
    const q = sanitizeSearchQuery(params.q);
    const qMode = determineSearchMode(q);
    const page = parsePage(params.page);
    const pageSize = parsePageSize(params.pageSize);

    // Calculate limit and offset
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    return validResult({
        tag,
        q,
        qMode,
        page,
        pageSize,
        limit,
        offset,
    });
}

/**
 * Check if a search query is in short_id format
 * Useful for UI to show different placeholder/hint
 */
export function isShortIdFormat(q: string): boolean {
    return SHORT_ID_REGEX.test(q.trim());
}

/**
 * Normalize short_id for database query (uppercase)
 */
export function normalizeShortId(q: string): string {
    return q.trim().toUpperCase();
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const _testing = {
    MAX_Q_LENGTH,
    MAX_TAG_LENGTH,
    ALLOWED_PAGE_SIZES,
    DEFAULT_PAGE_SIZE,
    DEFAULT_PAGE,
    SHORT_ID_REGEX,
    DISALLOWED_CHARS_REGEX,
    sanitizeSearchQuery,
    sanitizeTag,
    parsePage,
    parsePageSize,
};
