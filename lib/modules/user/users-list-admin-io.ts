/**
 * Users List Admin IO (Facade)
 *
 * Thin facade for admin-only user list operations.
 * Delegates to query module for DB ops and transform module for data mapping.
 *
 * @module lib/modules/user/users-list-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import type { UserDirectorySummary } from '@/lib/types/user';

import {
    transformDirectoryToSummary,
    transformDirectoryRowsToSummaries,
    type UserDirectoryWithProfileRow,
} from './users-list-transform';

import {
    queryAllUsers,
    queryUsersFiltered,
    queryUsersFilteredPaged,
    type UserListFilterParams,
    type UserListPagedParams,
    type UserListQueryResult,
} from './users-list-query-admin-io';

// =============================================================================
// Re-exports for backward compatibility
// =============================================================================

export type { UserDirectoryWithProfileRow };
export type { UserListFilterParams, UserListPagedParams };

export interface UserListPagedResult {
    users: UserDirectorySummary[];
    total: number;
}

export { transformDirectoryToSummary };

// =============================================================================
// Facade Functions
// =============================================================================

/**
 * Get users list from user_directory table
 * LEFT JOINs customer_profiles to get short_id (C1, C2, ...) for AI Analysis
 * Requires authenticated admin session via RLS (Owner/Editor can read)
 */
export async function getUserList(): Promise<UserDirectorySummary[]> {
    const rows = await queryAllUsers();
    return transformDirectoryRowsToSummaries(rows);
}

/**
 * Get filtered users list from user_directory table
 * Uses two-step query to filter by tag
 */
export async function getUserListFiltered(
    params: UserListFilterParams = {}
): Promise<UserDirectorySummary[]> {
    const rows = await queryUsersFiltered(params);
    return transformDirectoryRowsToSummaries(rows);
}

/**
 * Get filtered and paginated users list from user_directory table
 * Supports tag filtering, text/short_id search, and pagination
 */
export async function getUserListFilteredPaged(
    params: UserListPagedParams
): Promise<UserListPagedResult> {
    const result: UserListQueryResult = await queryUsersFilteredPaged(params);

    return {
        users: transformDirectoryRowsToSummaries(result.rows),
        total: result.total,
    };
}
