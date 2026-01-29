'use server';

/**
 * Comment Settings Server Actions
 * 
 * Server-side actions for comment settings management.
 * All actions perform permission check before calling lib IO.
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
  getCommentSettingsAndBlacklist,
  updateCommentSettings,
  addCommentBlacklistItem,
  removeCommentBlacklistItem,
} from '@/lib/modules/comment/admin-io';
import { validateCommentSettingsPatch } from '@/lib/validators/comment-settings';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';
import type { 
  CommentSettingsResponse, 
  CommentBlacklistItem,
  CommentBlacklistType 
} from '@/lib/types/comments';

export interface FetchCommentSettingsData {
  settings: Record<string, string>;
  blacklist: CommentBlacklistItem[];
  config: CommentSettingsResponse['config'];
}

// =============================================================================
// Fetch Actions
// =============================================================================

/**
 * Fetch comment settings and blacklist
 */
export async function fetchCommentSettingsAction(): Promise<ActionResult<FetchCommentSettingsData>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await getCommentSettingsAndBlacklist();
  return actionSuccess({
    settings: result.settings,
    blacklist: result.blacklist,
    config: result.config,
  });
}

// =============================================================================
// Update Actions
// =============================================================================

/**
 * Update comment settings
 */
export async function updateCommentSettingsAction(
  settings: Record<string, string>
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  // Validate settings using shared validator
  const validation = validateCommentSettingsPatch(settings);
  if (!validation.valid || !validation.validatedSettings) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await updateCommentSettings(validation.validatedSettings);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  return actionSuccess();
}

// =============================================================================
// Blacklist Actions
// =============================================================================

/**
 * Add item to blacklist
 */
export async function addBlacklistItemAction(input: {
  type: CommentBlacklistType;
  value: string;
  reason?: string | null;
}): Promise<ActionResult<{ item: CommentBlacklistItem }>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!input.value?.trim()) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await addCommentBlacklistItem({
    type: input.type,
    value: input.value.trim(),
    reason: input.reason || null,
  });

  if (!result.success || !result.item) {
    if (result.error?.includes('exists')) {
      return actionError(ADMIN_ERROR_CODES.RESOURCE_IN_USE);
    }
    return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
  }

  return actionSuccess({ item: result.item });
}

/**
 * Remove item from blacklist
 */
export async function removeBlacklistItemAction(
  id: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!id) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await removeCommentBlacklistItem(id);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
  }

  return actionSuccess();
}
