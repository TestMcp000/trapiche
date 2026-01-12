/**
 * Users Admin IO
 *
 * Admin-only user directory operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 * Query source: user_directory table (SSOT for users list/email).
 *
 * @module lib/modules/user/users-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import type {
  UserDirectoryRow,
  UserAdminProfileRow,
  UserAppointmentRow,
  UserDirectorySummary,
  UserAdminProfileDetail,
  UserAppointmentSummary,
  UserDetail,
} from '@/lib/types/user';

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

/**
 * Transform DB user_admin_profiles row to UserAdminProfileDetail
 */
export function transformProfileToDetail(
  row: UserAdminProfileRow
): UserAdminProfileDetail {
  return {
    userId: row.user_id,
    descriptionEnMd: row.description_en_md,
    descriptionZhMd: row.description_zh_md,
    tagsEn: row.tags_en || [],
    tagsZh: row.tags_zh || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/**
 * Transform DB user_appointments row to UserAppointmentSummary
 */
export function transformAppointmentToSummary(
  row: UserAppointmentRow
): UserAppointmentSummary {
  return {
    id: row.id,
    userId: row.user_id,
    startAt: row.start_at,
    endAt: row.end_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// User List Operations
// =============================================================================

/** Row type for user_directory + customer_profiles join */
interface UserDirectoryWithProfileRow extends UserDirectoryRow {
  customer_profiles: { short_id: string } | null;
}

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

export interface UserListFilterParams {
  tag?: string;
}

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
// User Detail Operations
// =============================================================================

/**
 * Get user detail by user ID
 * Includes: user_directory + user_admin_profiles + user_appointments + short_id
 * LEFT JOINs customer_profiles to get short_id (C1, C2, ...) for AI Analysis
 * Requires authenticated admin session via RLS
 */
export async function getUserById(userId: string): Promise<UserDetail | null> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return null;
  }

  // Fetch user_directory + customer_profiles.short_id
  const { data: directory, error: directoryError } = await supabase
    .from('user_directory')
    .select(`
      *,
      customer_profiles!left(short_id)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (directoryError) {
    console.error('Error fetching user directory:', directoryError);
    return null;
  }

  if (!directory) {
    return null;
  }

  // Fetch user_admin_profiles
  const { data: profile, error: profileError } = await supabase
    .from('user_admin_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching user admin profile:', profileError);
  }

  // Fetch user_appointments
  const { data: appointments, error: appointmentsError } = await supabase
    .from('user_appointments')
    .select('*')
    .eq('user_id', userId)
    .order('start_at', { ascending: true });

  if (appointmentsError) {
    console.error('Error fetching user appointments:', appointmentsError);
  }

  const directoryRow = directory as UserDirectoryWithProfileRow;
  return {
    directory: transformDirectoryToSummary(
      directoryRow,
      directoryRow.customer_profiles?.short_id ?? null
    ),
    adminProfile: profile
      ? transformProfileToDetail(profile as UserAdminProfileRow)
      : null,
    appointments: (appointments || []).map((a) =>
      transformAppointmentToSummary(a as UserAppointmentRow)
    ),
  };
}
