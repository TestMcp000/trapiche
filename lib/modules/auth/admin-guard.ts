import 'server-only';

/**
 * Admin Guard Helpers for Server Actions
 *
 * Provides one-line auth guards with typed error codes:
 * - requireSiteAdmin(): Checks for owner or editor role
 * - requireOwner(): Checks for owner role only
 *
 * @module lib/modules/auth/admin-guard
 * @see lib/modules/auth/index.ts - Core auth functions
 * @see lib/types/action-result.ts - ActionResult types
 * @see uiux_refactor.md §6.1 - Unified Result type + error codes
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isSiteAdmin, isOwner } from '@/lib/modules/auth';
import { ADMIN_ERROR_CODES, type ActionErrorCode } from '@/lib/types/action-result';

/**
 * Guard result type
 * - ok: true means authenticated with userId
 * - ok: false means auth failed with errorCode
 */
export type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; errorCode: ActionErrorCode };

/**
 * Require site admin (owner or editor) for action
 *
 * @param supabase - Supabase client from createClient()
 * @returns GuardResult with userId or errorCode
 *
 * @example
 * const guard = await requireSiteAdmin(supabase);
 * if (!guard.ok) {
 *   return { success: false, errorCode: guard.errorCode };
 * }
 * // guard.userId is now available
 */
export async function requireSiteAdmin(supabase: SupabaseClient): Promise<GuardResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, errorCode: ADMIN_ERROR_CODES.UNAUTHORIZED };
    }

    const admin = await isSiteAdmin(supabase);
    if (!admin) {
      return { ok: false, errorCode: ADMIN_ERROR_CODES.FORBIDDEN };
    }

    return { ok: true, userId: user.id };
  } catch (error) {
    console.error('Error in requireSiteAdmin:', error);
    return { ok: false, errorCode: ADMIN_ERROR_CODES.INTERNAL_ERROR };
  }
}

/**
 * Require owner role for action (highest privilege)
 *
 * @param supabase - Supabase client from createClient()
 * @returns GuardResult with userId or errorCode
 *
 * @example
 * const guard = await requireOwner(supabase);
 * if (!guard.ok) {
 *   return { success: false, errorCode: guard.errorCode };
 * }
 * // guard.userId is now available
 */
export async function requireOwner(supabase: SupabaseClient): Promise<GuardResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, errorCode: ADMIN_ERROR_CODES.UNAUTHORIZED };
    }

    const owner = await isOwner(supabase);
    if (!owner) {
      return { ok: false, errorCode: ADMIN_ERROR_CODES.OWNER_REQUIRED };
    }

    return { ok: true, userId: user.id };
  } catch (error) {
    console.error('Error in requireOwner:', error);
    return { ok: false, errorCode: ADMIN_ERROR_CODES.INTERNAL_ERROR };
  }
}
