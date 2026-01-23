/**
 * Users List Transform
 *
 * Pure functions for transforming user directory rows to summaries.
 * No DB/IO/side effects - fully unit testable.
 *
 * @module lib/modules/user/users-list-transform
 * @see ARCHITECTURE.md §3.4 - Pure modules
 * @see ARCHITECTURE.md §4.3 - Pure module constraints
 */

import type { UserDirectoryRow, UserDirectorySummary } from '@/lib/types/user';

/**
 * Transform a single user_directory DB row to UserDirectorySummary
 *
 * @param row - The user_directory row from Supabase
 * @param shortId - Optional short_id from customer_profiles (C1, C2, ...)
 * @returns UserDirectorySummary with camelCase fields
 */
export function transformDirectoryToSummary(
    row: UserDirectoryRow,
    shortId?: string | null
): UserDirectorySummary {
    return {
        userId: row.user_id,
        email: row.email,
        shortId: shortId ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Row type for user_directory + customer_profiles join result
 */
export interface UserDirectoryWithProfileRow extends UserDirectoryRow {
    customer_profiles: { short_id: string } | null;
}

/**
 * Transform an array of user_directory rows (with joined profiles) to summaries
 *
 * @param rows - Array of user_directory rows with customer_profiles join
 * @returns Array of UserDirectorySummary
 */
export function transformDirectoryRowsToSummaries(
    rows: UserDirectoryWithProfileRow[]
): UserDirectorySummary[] {
    return rows.map((row) =>
        transformDirectoryToSummary(row, row.customer_profiles?.short_id ?? null)
    );
}
