/**
 * Users List Query Admin IO
 *
 * Admin-only Supabase queries for user list operations.
 * Returns raw rows + total count; transformation is handled by users-list-transform.ts
 *
 * @module lib/modules/user/users-list-query-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/auth';
import type { UserDirectoryWithProfileRow } from './users-list-transform';

// =============================================================================
// Types
// =============================================================================

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

export interface UserListQueryResult {
    rows: UserDirectoryWithProfileRow[];
    total: number;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_TAG_LENGTH = 64;

// =============================================================================
// Helper: Get User IDs by Tag
// =============================================================================

/**
 * Query user_admin_profiles for user_ids matching a tag (both en and zh)
 * Returns null if tag is empty/invalid, empty array if no matches
 */
async function getUserIdsByTag(
    supabase: Awaited<ReturnType<typeof createClient>>,
    tag: string | undefined
): Promise<string[] | null> {
    if (!tag || tag.trim() === '') {
        return null;
    }

    const normalizedTag = tag.trim();

    if (normalizedTag.length > MAX_TAG_LENGTH) {
        console.warn(
            'Tag filter too long, skipping:',
            normalizedTag.substring(0, 20) + '...'
        );
        return [];
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

    if (profilesEnResult.error) {
        console.error('Error fetching profiles by tags_en:', profilesEnResult.error);
    }
    if (profilesZhResult.error) {
        console.error('Error fetching profiles by tags_zh:', profilesZhResult.error);
    }

    const userIdSet = new Set<string>();
    for (const p of profilesEnResult.data || []) {
        userIdSet.add(p.user_id);
    }
    for (const p of profilesZhResult.data || []) {
        userIdSet.add(p.user_id);
    }

    return Array.from(userIdSet);
}

/**
 * Query customer_profiles for user_ids matching a short_id
 */
async function getUserIdsByShortId(
    supabase: Awaited<ReturnType<typeof createClient>>,
    shortId: string
): Promise<string[]> {
    const normalizedShortId = shortId.trim().toUpperCase();

    const { data: profileData, error: profileError } = await supabase
        .from('customer_profiles')
        .select('user_id')
        .eq('short_id', normalizedShortId);

    if (profileError) {
        console.error('Error fetching by short_id:', profileError);
        return [];
    }

    return (profileData || []).map((p) => p.user_id);
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Query all users from user_directory with customer_profiles join
 * Returns raw rows for transformation
 */
export async function queryAllUsers(): Promise<UserDirectoryWithProfileRow[]> {
    const supabase = await createClient();

    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
        return [];
    }

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

    return (users || []) as UserDirectoryWithProfileRow[];
}

/**
 * Query users filtered by tag
 * Returns raw rows for transformation
 */
export async function queryUsersFiltered(
    params: UserListFilterParams
): Promise<UserDirectoryWithProfileRow[]> {
    const supabase = await createClient();

    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
        return [];
    }

    const { tag } = params;

    const userIds = await getUserIdsByTag(supabase, tag);

    // null means no tag filter - query all
    if (userIds === null) {
        return queryAllUsers();
    }

    // Empty array means tag specified but no matches
    if (userIds.length === 0) {
        return [];
    }

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

    return (users || []) as UserDirectoryWithProfileRow[];
}

/**
 * Query users with filter + search + pagination
 * Returns raw rows + total count for transformation
 */
export async function queryUsersFilteredPaged(
    params: UserListPagedParams
): Promise<UserListQueryResult> {
    const supabase = await createClient();

    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
        return { rows: [], total: 0 };
    }

    const { tag, q, qMode = 'text', limit, offset } = params;

    let targetUserIds: string[] | null = null;

    // Step 1: Handle tag filtering
    const tagUserIds = await getUserIdsByTag(supabase, tag);
    if (tagUserIds !== null) {
        if (tagUserIds.length === 0) {
            return { rows: [], total: 0 };
        }
        targetUserIds = tagUserIds;
    }

    // Step 2: Handle short_id search
    if (q && qMode === 'short_id') {
        const shortIdUserIds = await getUserIdsByShortId(supabase, q);

        if (shortIdUserIds.length === 0) {
            return { rows: [], total: 0 };
        }

        if (targetUserIds !== null) {
            const intersection = shortIdUserIds.filter((id) =>
                targetUserIds!.includes(id)
            );
            if (intersection.length === 0) {
                return { rows: [], total: 0 };
            }
            targetUserIds = intersection;
        } else {
            targetUserIds = shortIdUserIds;
        }
    }

    // Step 3: Build the main query
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
        return { rows: [], total: 0 };
    }

    return {
        rows: (users || []) as UserDirectoryWithProfileRow[],
        total: total ?? 0,
    };
}
