/**
 * User Admin Profiles IO
 *
 * Owner-only profile management operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/user/profiles-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import type { UpdateUserAdminProfileInput } from '@/lib/types/user';

// =============================================================================
// Profile Write Operations (Owner-only)
// =============================================================================

/**
 * Update user admin profile
 * Owner-only: updates description and tags
 */
export async function updateUserAdminProfile(
  userId: string,
  input: UpdateUserAdminProfileInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Owner guard
  const isOwnerRole = await isOwner(supabase);
  if (!isOwnerRole) {
    return { success: false, error: 'Unauthorized: Owner role required' };
  }

  // Get current user for updated_by
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build update payload (only include provided fields)
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  };

  if (input.descriptionEnMd !== undefined) {
    updatePayload.description_en_md = input.descriptionEnMd;
  }
  if (input.descriptionZhMd !== undefined) {
    updatePayload.description_zh_md = input.descriptionZhMd;
  }
  if (input.tagsEn !== undefined) {
    updatePayload.tags_en = input.tagsEn;
  }
  if (input.tagsZh !== undefined) {
    updatePayload.tags_zh = input.tagsZh;
  }

  // Upsert: create if not exists, update if exists
  const { error } = await supabase
    .from('user_admin_profiles')
    .upsert(
      {
        user_id: userId,
        ...updatePayload,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error updating user admin profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
