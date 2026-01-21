/**
 * Users List Admin IO
 *
 * Admin-only user list operations with filtering and pagination.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/user/users-list-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/auth';
import type { UserDirectoryRow, UserDirectorySummary } from '@/lib/types/user';

// =============================================================================
// Types
// =============================================================================

/** Row type for user_directory + customer_profiles join */
export interface UserDirectoryWithProfileRow extends UserDirectoryRow {
    customer_profiles: { short_id: string } | null;
}

export interface UserListFilterParams {
    tag?: string;
}

export interface UserListPagedParams {
    /** Tag filter (optional) */
    tag?: string;
    /** Search query (optional) */
    q?: string;
    /** Search mode: 'text' for email/user_id fuzzy search, 'short_id' for exact match */
    qMode?: 'text' | 'short_id';
    /** SQL LIMIT */
    limit: number;
    /** SQL OFFSET */
    offset: number;
}

export interface UserListPagedResult {
    users: UserDirectorySummary[];
    total: number;
}

// =============================================================================
// Transform Helpers (Pure Functions)
// =============================================================================

/**
 * Transform DB user_directory row to UserDirectorySummary
 * @param row - The user_directory row
 * @param shortId - Optional short_id from customer_profiles (C1, C2, ...)
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

// =============================================================================
// User List Operations
// =============================================================================

/**
 * Get users list from user_directory table
 * LEFT JOINs customer_profiles to get short_id (C1, C2, ...) for AI Analysis
 * Requires authenticated admin session via RLS (Owner/Editor can read)
 */
export async function getUserList(): Promise<UserDirectorySummary[]> {
    const supabase = await createClient();

    // Admin guard
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
        return [];
    }

    // LEFT JOIN customer_profiles to get short_id
    const { data: users, error } = await supabase
        .from('user_directory')
        .select(`
      *,
      customer_profiles!left(short_id)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user directory:', error);
        return [];
    }

    return (users || []).map((u) => {
        const row = u as UserDirectoryWithProfileRow;
        return transformDirectoryToSummary(
            row,
            row.customer_profiles?.short_id ?? null
        );
    });
}

// =============================================================================
// User List with Filter (tag support)
// =============================================================================

/**
 * Get filtered users list from user_directory table
 * Uses two-step query to filter by tag:
 *   1. Query user_admin_profiles for matching tags (tags_en OR tags_zh using .contains())
 *   2. Query user_directory with matching user_ids
 *
 * NOTE: Uses two separate .contains() queries instead of .or() string interpolation
 * to prevent special characters (e.g., `, { }`) from breaking filter expressions.
 *
 * @param params - Filter parameters (tag optional)
 * @returns UserDirectorySummary[] - Filtered or full list
 */
export async function getUserListFiltered(
    params: UserListFilterParams = {}
): Promise<UserDirectorySummary[]> {
    const supabase = await createClient();

    // Admin guard
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
        return [];
    }

    const { tag } = params;

    // If no tag filter, return full list
    if (!tag || tag.trim() === '') {
        return getUserList();
    }

    const normalizedTag = tag.trim();

    // Validate tag length to prevent query pressure and potential abuse
    const MAX_TAG_LENGTH = 64;
    if (normalizedTag.length > MAX_TAG_LENGTH) {
        console.warn(
            'Tag filter too long, returning empty list:',
            normalizedTag.substring(0, 20) + '...'
        );
        return [];
    }

    // Step 1: Query user_admin_profiles for matching tags using .contains()
    // Use two separate queries instead of .or() string interpolation
    // to prevent special characters from breaking filter expressions.
    const [profilesEnResult, profilesZhResult] = await Promise.all([
        supabase
            .from('user_admin_profiles')
            .select('user_id')
            .contains('tags_en', [normalizedTag]),
        supabase
            .from('user_admin_profiles')
            .select('user_id')
            .contains('tags_zh', [normalizedTag]),
    ]);

    if (profilesEnResult.error) {
        console.error('Error fetching profiles by tags_en:', profilesEnResult.error);
    }
    if (profilesZhResult.error) {
        console.error('Error fetching profiles by tags_zh:', profilesZhResult.error);
    }

    // Union user_ids from both queries
    const userIdSet = new Set<string>();
    for (const p of profilesEnResult.data || []) {
        userIdSet.add(p.user_id);
    }
    for (const p of profilesZhResult.data || []) {
        userIdSet.add(p.user_id);
    }

    // If no matching profiles, return empty list
    if (userIdSet.size === 0) {
        return [];
    }

    const userIds = Array.from(userIdSet);

    // Step 2: Query user_directory with matching user_ids + LEFT JOIN customer_profiles
    const { data: users, error: usersError } = await supabase
        .from('user_directory')
        .select(`
      *,
      customer_profiles!left(short_id)
    `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

    if (usersError) {
        console.error('Error fetching users by ids:', usersError);
        return [];
    }

    return (users || []).map((u) => {
        const row = u as UserDirectoryWithProfileRow;
        return transformDirectoryToSummary(
            row,
            row.customer_profiles?.short_id ?? null
        );
    });
}

// =============================================================================
// User List with Filter + Search + Pagination
// =============================================================================

/**
 * Get filtered and paginated users list from user_directory table
 *
 * Supports:
 * - Tag filtering (two-stage query via user_admin_profiles)
 * - Text search (email/user_id fuzzy match using ilike)
 * - Short ID search (exact match via customer_profiles)
 * - Pagination with total count
 *
 * @param params - Filter and pagination parameters
 * @returns UserListPagedResult with users array and total count
 */
export async function getUserListFilteredPaged(
    params: UserListPagedParams
): Promise<UserListPagedResult> {
    const supabase = await createClient();

    // Admin guard
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
        return { users: [], total: 0 };
    }

    const { tag, q, qMode = 'text', limit, offset } = params;

    // Determine which user_ids to filter by based on tag and search
    let targetUserIds: string[] | null = null;

    // Step 1: Handle tag filtering (if provided)
    if (tag && tag.trim() !== '') {
        const normalizedTag = tag.trim();
        const MAX_TAG_LENGTH = 64;
        if (normalizedTag.length > MAX_TAG_LENGTH) {
            return { users: [], total: 0 };
        }

        const [profilesEnResult, profilesZhResult] = await Promise.all([
            supabase
                .from('user_admin_profiles')
                .select('user_id')
                .contains('tags_en', [normalizedTag]),
            supabase
                .from('user_admin_profiles')
                .select('user_id')
                .contains('tags_zh', [normalizedTag]),
        ]);

        const userIdSet = new Set<string>();
        for (const p of profilesEnResult.data || []) {
            userIdSet.add(p.user_id);
        }
        for (const p of profilesZhResult.data || []) {
            userIdSet.add(p.user_id);
        }

        if (userIdSet.size === 0) {
            return { users: [], total: 0 };
        }

        targetUserIds = Array.from(userIdSet);
    }

    // Step 2: Handle short_id search (if qMode is 'short_id')
    if (q && qMode === 'short_id') {
        const normalizedShortId = q.trim().toUpperCase();

        const { data: profileData, error: profileError } = await supabase
            .from('customer_profiles')
            .select('user_id')
            .eq('short_id', normalizedShortId);

        if (profileError) {
            console.error('Error fetching by short_id:', profileError);
            return { users: [], total: 0 };
        }

        const shortIdUserIds = (profileData || []).map((p) => p.user_id);

        if (shortIdUserIds.length === 0) {
            return { users: [], total: 0 };
        }

        // If we also have tag filter, intersect the user_ids
        if (targetUserIds !== null) {
            const intersection = shortIdUserIds.filter((id) =>
                targetUserIds!.includes(id)
            );
            if (intersection.length === 0) {
                return { users: [], total: 0 };
            }
            targetUserIds = intersection;
        } else {
            targetUserIds = shortIdUserIds;
        }
    }

    // Step 3: Build the main query for user_directory
    let query = supabase
        .from('user_directory')
        .select(
            `
        *,
        customer_profiles!left(short_id)
      `,
            { count: 'exact' }
        );

    // Apply user_id filter if we have one from tag or short_id
    if (targetUserIds !== null) {
        query = query.in('user_id', targetUserIds);
    }

    // Apply text search filter (email or user_id fuzzy match)
    if (q && qMode === 'text') {
        // Use ilike for case-insensitive fuzzy match
        const searchPattern = `%${q}%`;
        query = query.or(`email.ilike.${searchPattern},user_id.ilike.${searchPattern}`);
    }

    // Apply ordering and pagination
    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data: users, count: total, error: usersError } = await query;

    if (usersError) {
        console.error('Error fetching paginated users:', usersError);
        return { users: [], total: 0 };
    }

    const transformedUsers = (users || []).map((u) => {
        const row = u as UserDirectoryWithProfileRow;
        return transformDirectoryToSummary(
            row,
            row.customer_profiles?.short_id ?? null
        );
    });

    return {
        users: transformedUsers,
        total: total ?? 0,
    };
}
