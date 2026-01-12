/**
 * Comment Settings Admin IO
 *
 * Admin-only operations for comment settings and blacklist management.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/comment/settings-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { CommentBlacklistItem, CommentBlacklistType, CommentSettingsResponse } from '@/lib/types/comments';

// =============================================================================
// Settings Read Operations
// =============================================================================

/**
 * Get comment settings and blacklist for admin UI
 * Used by GET /api/comments/settings
 */
export async function getCommentSettingsAndBlacklist(): Promise<CommentSettingsResponse> {
  const supabase = await createClient();

  // Get settings
  const { data: settingsRows } = await supabase
    .from('comment_settings')
    .select('key, value');

  // Get blacklist
  const { data: blacklistRows } = await supabase
    .from('comment_blacklist')
    .select('id, type, value, reason, created_at')
    .order('created_at', { ascending: false });

  // Transform settings to object
  const settings: Record<string, string> = {};
  settingsRows?.forEach(row => {
    settings[row.key] = row.value;
  });

  // Transform blacklist rows
  const blacklist: CommentBlacklistItem[] = (blacklistRows || []).map(row => ({
    id: row.id,
    type: row.type as CommentBlacklistType,
    value: row.value,
    reason: row.reason,
    created_at: row.created_at,
  }));

  return {
    settings,
    blacklist,
    config: {
      akismet_configured: !!process.env.AKISMET_API_KEY,
      recaptcha_site_key_configured: !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      recaptcha_secret_configured: !!process.env.RECAPTCHA_SECRET_KEY,
    },
  };
}

// =============================================================================
// Settings Write Operations
// =============================================================================

/**
 * Update comment settings
 * Used by PATCH /api/comments/settings
 *
 * @param validatedSettings - Settings object already validated by comment-settings validator
 */
export async function updateCommentSettings(
  validatedSettings: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Update each validated setting in comment_settings
    const updatePromises = Object.entries(validatedSettings).map(([key, value]) =>
      supabase
        .from('comment_settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
    );

    await Promise.all(updatePromises);

    // Sync enable_recaptcha to comment_public_settings (for frontend access)
    if ('enable_recaptcha' in validatedSettings) {
      const { error: syncError } = await supabase
        .from('comment_public_settings')
        .upsert(
          {
            key: 'enable_recaptcha',
            value: validatedSettings.enable_recaptcha,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );

      if (syncError) {
        console.error('Failed to sync public settings:', syncError);
        return { success: false, error: 'Settings saved but failed to sync public settings. Please try again.' };
      }
    }

    // Sync max_content_length to comment_public_settings (for frontend access)
    if ('max_content_length' in validatedSettings) {
      const { error: syncError } = await supabase
        .from('comment_public_settings')
        .upsert(
          {
            key: 'max_content_length',
            value: validatedSettings.max_content_length,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );

      if (syncError) {
        console.error('Failed to sync max_content_length to public settings:', syncError);
        // Non-critical, log but don't fail the request
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

// =============================================================================
// Blacklist Operations
// =============================================================================

/**
 * Add item to comment blacklist
 * Used by POST /api/comments/settings
 */
export async function addCommentBlacklistItem(input: {
  type: CommentBlacklistType;
  value: string;
  reason?: string | null;
}): Promise<{ success: boolean; item?: CommentBlacklistItem; error?: string }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('comment_blacklist')
      .insert({
        type: input.type,
        value: input.value.toLowerCase(),
        reason: input.reason || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Item already exists' };
      }
      throw error;
    }

    return {
      success: true,
      item: {
        id: data.id,
        type: data.type as CommentBlacklistType,
        value: data.value,
        reason: data.reason,
        created_at: data.created_at,
      },
    };
  } catch (error) {
    console.error('Error adding blacklist item:', error);
    return { success: false, error: 'Failed to add item' };
  }
}

/**
 * Remove item from comment blacklist
 * Used by DELETE /api/comments/settings
 */
export async function removeCommentBlacklistItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('comment_blacklist')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting blacklist item:', error);
    return { success: false, error: 'Failed to delete item' };
  }
}
