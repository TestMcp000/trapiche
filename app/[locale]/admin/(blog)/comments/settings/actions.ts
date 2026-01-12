'use server';

/**
 * Comment Settings Server Actions
 * 
 * Server-side actions for comment settings management.
 * All actions perform permission check before calling lib IO.
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import {
  getCommentSettingsAndBlacklist,
  updateCommentSettings,
  addCommentBlacklistItem,
  removeCommentBlacklistItem,
} from '@/lib/modules/comment/admin-io';
import { validateCommentSettingsPatch } from '@/lib/validators/comment-settings';
import type { 
  CommentSettingsResponse, 
  CommentBlacklistItem,
  CommentBlacklistType 
} from '@/lib/types/comments';

// =============================================================================
// Types
// =============================================================================

export interface SettingsActionResult {
  success: boolean;
  error?: string;
}

export interface FetchSettingsResult {
  success: boolean;
  settings?: Record<string, string>;
  blacklist?: CommentBlacklistItem[];
  config?: CommentSettingsResponse['config'];
  error?: string;
}

export interface AddBlacklistResult {
  success: boolean;
  item?: CommentBlacklistItem;
  error?: string;
}

// =============================================================================
// Helper
// =============================================================================

async function checkAdmin(): Promise<boolean> {
  const supabase = await createClient();
  return isSiteAdmin(supabase);
}

// =============================================================================
// Fetch Actions
// =============================================================================

/**
 * Fetch comment settings and blacklist
 */
export async function fetchCommentSettingsAction(): Promise<FetchSettingsResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  const result = await getCommentSettingsAndBlacklist();
  return {
    success: true,
    settings: result.settings,
    blacklist: result.blacklist,
    config: result.config,
  };
}

// =============================================================================
// Update Actions
// =============================================================================

/**
 * Update comment settings
 */
export async function updateCommentSettingsAction(
  settings: Record<string, string>
): Promise<SettingsActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate settings using shared validator
  const validation = validateCommentSettingsPatch(settings);
  if (!validation.valid || !validation.validatedSettings) {
    const errorMessages = Object.values(validation.errors).join(', ');
    return { success: false, error: errorMessages || 'Validation failed' };
  }

  const result = await updateCommentSettings(validation.validatedSettings);
  return result;
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
}): Promise<AddBlacklistResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!input.value?.trim()) {
    return { success: false, error: 'Value is required' };
  }

  const result = await addCommentBlacklistItem({
    type: input.type,
    value: input.value.trim(),
    reason: input.reason || null,
  });

  return result;
}

/**
 * Remove item from blacklist
 */
export async function removeBlacklistItemAction(
  id: string
): Promise<SettingsActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!id) {
    return { success: false, error: 'ID is required' };
  }

  const result = await removeCommentBlacklistItem(id);
  return result;
}
