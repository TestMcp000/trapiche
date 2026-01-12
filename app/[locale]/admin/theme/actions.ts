'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import { updateSiteConfig } from '@/lib/modules/theme/admin-io';
import { isValidThemeKey } from '@/lib/modules/theme/resolve';
import { getThemeFontStack, isValidThemeFontKey } from '@/lib/modules/theme/fonts';
import type { ThemeFontKey, ThemeKey, ThemeScopeKey } from '@/lib/types/theme';
import { THEME_SCOPE_KEYS } from '@/lib/types/theme';

// =============================================================================
// Type Definitions
// =============================================================================

export interface ThemeActionResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// Server Actions
// =============================================================================

/**
 * Update global theme preset.
 * Owner-only action with cache invalidation.
 */
export async function updateGlobalThemeAction(
  theme: ThemeKey
): Promise<ThemeActionResult> {
  try {
    // 1. Verify owner
    const supabase = await createClient();
    const ownerCheck = await isOwner(supabase);
    if (!ownerCheck) {
      return { success: false, error: 'Owner required' };
    }

    // 2. Validate input
    if (!isValidThemeKey(theme)) {
      return { success: false, error: 'Invalid theme key' };
    }

    // 3. Get user ID for audit
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 4. Update site config
    const result = await updateSiteConfig({ global_theme: theme }, user.id);
    if (!result.success) {
      return { success: false, error: result.error || 'Update failed' };
    }

    // 5. Invalidate cache
    revalidateTag('site-config', { expire: 0 });
    revalidatePath('/en', 'layout');
    revalidatePath('/zh', 'layout');

    return { success: true };
  } catch (error) {
    console.error('[updateGlobalThemeAction] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update per-page theme settings.
 * Owner-only action with cache invalidation.
 */
export async function updatePageThemesAction(
  pageThemes: Partial<Record<ThemeScopeKey, ThemeKey>>
): Promise<ThemeActionResult> {
  try {
    // 1. Verify owner
    const supabase = await createClient();
    const ownerCheck = await isOwner(supabase);
    if (!ownerCheck) {
      return { success: false, error: 'Owner required' };
    }

    // 2. Validate input - check all theme keys are valid
    for (const [scope, theme] of Object.entries(pageThemes)) {
      if (!THEME_SCOPE_KEYS.includes(scope as ThemeScopeKey)) {
        return { success: false, error: `Invalid scope: ${scope}` };
      }
      if (theme && !isValidThemeKey(theme)) {
        return { success: false, error: `Invalid theme key for ${scope}: ${theme}` };
      }
    }

    // 3. Get user ID for audit
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 4. Update site config
    const result = await updateSiteConfig({ page_themes: pageThemes }, user.id);
    if (!result.success) {
      return { success: false, error: result.error || 'Update failed' };
    }

    // 5. Invalidate cache
    revalidateTag('site-config', { expire: 0 });
    revalidatePath('/en', 'layout');
    revalidatePath('/zh', 'layout');
    // Also invalidate specific page layouts
    revalidatePath('/en/blog', 'layout');
    revalidatePath('/zh/blog', 'layout');
    revalidatePath('/en/gallery', 'layout');
    revalidatePath('/zh/gallery', 'layout');
    revalidatePath('/en/shop', 'layout');
    revalidatePath('/zh/shop', 'layout');

    return { success: true };
  } catch (error) {
    console.error('[updatePageThemesAction] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update global font stack (system fonts only).
 * Owner-only action with cache invalidation.
 * Pass null to reset to preset default.
 * 
 * Note: Font is stored in theme_overrides to allow per-layout font customization.
 */
export async function updateThemeFontAction(
  fontKey: ThemeFontKey | null,
  themeKey: ThemeKey = 'tech-pro'
): Promise<ThemeActionResult> {
  try {
    // 1. Verify owner
    const supabase = await createClient();
    const ownerCheck = await isOwner(supabase);
    if (!ownerCheck) {
      return { success: false, error: 'Owner required' };
    }

    // 2. Validate input (null is valid for reset)
    if (fontKey !== null && !isValidThemeFontKey(fontKey)) {
      return { success: false, error: 'Invalid font key' };
    }

    // 3. Validate theme key
    if (!isValidThemeKey(themeKey)) {
      return { success: false, error: 'Invalid theme key' };
    }

    // 4. Get user ID for audit
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 5. Update site config using theme_overrides (Theme v2)
    const fontStack = fontKey === null ? null : getThemeFontStack(fontKey);
    const result = await updateSiteConfig(
      { theme_overrides: { [themeKey]: { '--theme-font': fontStack } } },
      user.id
    );
    if (!result.success) {
      return { success: false, error: result.error || 'Update failed' };
    }

    // 6. Invalidate cache
    revalidateTag('site-config', { expire: 0 });
    revalidatePath('/en', 'layout');
    revalidatePath('/zh', 'layout');

    return { success: true };
  } catch (error) {
    console.error('[updateThemeFontAction] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update per-layout theme overrides (Theme v2).
 * Owner-only action with cache invalidation.
 * 
 * @param themeKey - The layout type to update overrides for
 * @param overrides - CSS variable overrides (will be merged with existing)
 */
export async function updateThemeOverridesAction(
  themeKey: ThemeKey,
  overrides: Record<string, string | null>
): Promise<ThemeActionResult> {
  try {
    // 1. Verify owner
    const supabase = await createClient();
    const ownerCheck = await isOwner(supabase);
    if (!ownerCheck) {
      return { success: false, error: 'Owner required' };
    }

    // 2. Validate theme key
    if (!isValidThemeKey(themeKey)) {
      return { success: false, error: 'Invalid theme key' };
    }

    // 3. Validate override keys (whitelist check)
    const { isCustomizableCssVar } = await import('@/lib/types/theme');
    const { isValidCssLength, isValidShadowValue } = await import('@/lib/modules/theme/resolve');
    
    for (const [key, value] of Object.entries(overrides)) {
      if (!isCustomizableCssVar(key)) {
        return { success: false, error: `Invalid CSS variable key: ${key}` };
      }
      
      // Validate value format based on key type
      if (value !== null) {
        if (key.includes('radius') && !isValidCssLength(value)) {
          return { success: false, error: `Invalid length value for ${key}: ${value}` };
        }
        if (key.includes('shadow') && !isValidShadowValue(value)) {
          return { success: false, error: `Invalid shadow value for ${key}: ${value}` };
        }
        // Note: color validation is relaxed to allow hex and rgb values
        // Font validation is relaxed to allow any font-family string
      }
    }

    // 4. Get user ID for audit
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 5. Update site config
    const result = await updateSiteConfig(
      { theme_overrides: { [themeKey]: overrides } },
      user.id
    );
    if (!result.success) {
      return { success: false, error: result.error || 'Update failed' };
    }

    // 6. Invalidate cache
    revalidateTag('site-config', { expire: 0 });
    revalidatePath('/en', 'layout');
    revalidatePath('/zh', 'layout');
    revalidatePath('/en/blog', 'layout');
    revalidatePath('/zh/blog', 'layout');
    revalidatePath('/en/gallery', 'layout');
    revalidatePath('/zh/gallery', 'layout');
    revalidatePath('/en/shop', 'layout');
    revalidatePath('/zh/shop', 'layout');

    return { success: true };
  } catch (error) {
    console.error('[updateThemeOverridesAction] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
