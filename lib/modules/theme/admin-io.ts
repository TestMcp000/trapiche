/**
 * Theme Admin IO Module
 *
 * Server-side IO for admin theme configuration operations.
 * Uses authenticated server client (cookie-based, RLS-aware).
 *
 * @module lib/modules/theme/admin-io
 * @see ARCHITECTURE.md section 5 (Supabase Client Selection)
 */

import 'server-only';
import { createClient } from '@/lib/infrastructure/supabase/server';
import type { SiteConfigRow, UpdateThemeRequest } from '@/lib/types/theme';

/**
 * Get site configuration for admin pages.
 *
 * Non-cached read for admin UI to ensure fresh data.
 * Uses authenticated server client for RLS enforcement.
 *
 * @returns Site configuration row or null if not found/error
 */
export async function getSiteConfigAdmin(): Promise<SiteConfigRow | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('[getSiteConfigAdmin] Error:', error.message);
      return null;
    }

    return data as SiteConfigRow;
  } catch (error) {
    console.error('[getSiteConfigAdmin] Unexpected error:', error);
    return null;
  }
}

/**
 * Update site configuration.
 *
 * Performs partial update on site_config row id=1.
 * Automatically sets updated_at and updated_by fields.
 * RLS policy requires owner role for write access.
 *
 * @param updates - Partial update request (only specified fields are updated)
 * @param userId - User ID making the update (for audit trail)
 * @returns Success status and optional error message
 */
export async function updateSiteConfig(
  updates: UpdateThemeRequest,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    // Apply provided updates
    if (updates.global_theme !== undefined) {
      updatePayload.global_theme = updates.global_theme;
    }
    if (updates.page_themes !== undefined) {
      // Merge with existing page_themes (get current first)
      const { data: current } = await supabase
        .from('site_config')
        .select('page_themes')
        .eq('id', 1)
        .single();

      updatePayload.page_themes = {
        ...(current?.page_themes ?? {}),
        ...updates.page_themes,
      };
    }

    if (updates.theme_overrides !== undefined) {
      // Deep merge with existing theme_overrides (Theme v2)
      // Each ThemeKey's overrides are merged independently
      const { data: current } = await supabase
        .from('site_config')
        .select('theme_overrides')
        .eq('id', 1)
        .single();

      const existingOverrides = (current?.theme_overrides ?? {}) as Record<
        string,
        Record<string, string | null>
      >;
      const newOverrides = updates.theme_overrides;
      const merged: Record<string, Record<string, string | null>> = { ...existingOverrides };

      // Merge each theme key's overrides
      for (const [themeKey, overrides] of Object.entries(newOverrides)) {
        if (overrides) {
          merged[themeKey] = {
            ...(existingOverrides[themeKey] ?? {}),
            ...overrides,
          };
        }
      }

      updatePayload.theme_overrides = merged;
    }

    const { error } = await supabase
      .from('site_config')
      .update(updatePayload)
      .eq('id', 1);

    if (error) {
      console.error('[updateSiteConfig] Error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[updateSiteConfig] Unexpected error:', message);
    return { success: false, error: message };
  }
}
