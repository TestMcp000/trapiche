/**
 * Comment Public Settings IO
 *
 * Read operations for public comment settings (no auth required).
 * Uses anonymous Supabase client for caching-safe reads.
 *
 * @module lib/modules/comment/public-settings-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { CommentPublicSettingsResponse } from '@/lib/types/comments';

/**
 * Get public comment settings (no auth required)
 * Used by GET /api/comments/public-settings
 */
export async function getCommentPublicSettings(): Promise<CommentPublicSettingsResponse> {
  const supabase = createAnonClient();

  try {
    const { data, error } = await supabase
      .from('comment_public_settings')
      .select('key, value')
      .in('key', ['enable_recaptcha', 'max_content_length']);

    if (error) {
      console.warn('Failed to fetch public settings:', error.message);
      return { enable_recaptcha: false, max_content_length: 4000 };
    }

    // Transform array to object with defaults
    const settings: Record<string, string> = {};
    data?.forEach(row => {
      settings[row.key] = row.value;
    });

    return {
      enable_recaptcha: settings.enable_recaptcha === 'true',
      max_content_length: parseInt(settings.max_content_length, 10) || 4000,
    };
  } catch (error) {
    console.error('Error in getCommentPublicSettings:', error);
    return { enable_recaptcha: false, max_content_length: 4000 };
  }
}
