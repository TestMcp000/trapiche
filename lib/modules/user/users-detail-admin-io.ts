/**
 * Users Detail Admin IO
 *
 * Admin-only user detail operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/user/users-detail-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/auth';
import type {
    UserAdminProfileRow,
    UserAppointmentRow,
    UserAdminProfileDetail,
    UserAppointmentSummary,
    UserDetail,
} from '@/lib/types/user';
import {
    transformDirectoryToSummary,
    type UserDirectoryWithProfileRow,
} from './users-list-admin-io';

// =============================================================================
// Transform Helpers (Pure Functions)
// =============================================================================

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
