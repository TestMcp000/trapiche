'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireOwner } from '@/lib/modules/auth/admin-guard';
import { updateSiteConfig } from '@/lib/modules/theme/admin-io';
import { isValidThemeKey } from '@/lib/modules/theme/resolve';
import { getThemeFontStack, isValidThemeFontKey } from '@/lib/modules/theme/fonts';
import type { ThemeFontKey, ThemeKey, ThemeScopeKey } from '@/lib/types/theme';
import { THEME_SCOPE_KEYS } from '@/lib/types/theme';
import { LOCALES } from '@/lib/i18n/locales';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

function revalidateAllSiteConfigLayouts() {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}`, 'layout');
    revalidatePath(`/${locale}/blog`, 'layout');
    revalidatePath(`/${locale}/gallery`, 'layout');
  }
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
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!isValidThemeKey(theme)) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await updateSiteConfig({ global_theme: theme }, guard.userId);
    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    revalidateTag('site-config', { expire: 0 });
    revalidateAllSiteConfigLayouts();

    return actionSuccess();
  } catch (error) {
    console.error('[updateGlobalThemeAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Update per-page theme settings.
 * Owner-only action with cache invalidation.
 */
export async function updatePageThemesAction(
  pageThemes: Partial<Record<ThemeScopeKey, ThemeKey>>
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    for (const [scope, theme] of Object.entries(pageThemes)) {
      if (!THEME_SCOPE_KEYS.includes(scope as ThemeScopeKey)) {
        return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
      }
      if (theme && !isValidThemeKey(theme)) {
        return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
      }
    }

    const result = await updateSiteConfig({ page_themes: pageThemes }, guard.userId);
    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    revalidateTag('site-config', { expire: 0 });
    revalidateAllSiteConfigLayouts();

    return actionSuccess();
  } catch (error) {
    console.error('[updatePageThemesAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
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
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (fontKey !== null && !isValidThemeFontKey(fontKey)) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!isValidThemeKey(themeKey)) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const fontStack = fontKey === null ? null : getThemeFontStack(fontKey);
    const result = await updateSiteConfig(
      { theme_overrides: { [themeKey]: { '--theme-font': fontStack } } },
      guard.userId
    );
    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    revalidateTag('site-config', { expire: 0 });
    revalidateAllSiteConfigLayouts();

    return actionSuccess();
  } catch (error) {
    console.error('[updateThemeFontAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
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
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!isValidThemeKey(themeKey)) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const { isCustomizableCssVar } = await import('@/lib/types/theme');
    const { isValidCssLength, isValidShadowValue } = await import('@/lib/modules/theme/resolve');
    
    for (const [key, value] of Object.entries(overrides)) {
      if (!isCustomizableCssVar(key)) {
        return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
      }
      
      // Validate value format based on key type
      if (value !== null) {
        if (key.includes('radius') && !isValidCssLength(value)) {
          return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }
        if (key.includes('shadow') && !isValidShadowValue(value)) {
          return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }
        // Note: color validation is relaxed to allow hex and rgb values
        // Font validation is relaxed to allow any font-family string
      }
    }

    const result = await updateSiteConfig(
      { theme_overrides: { [themeKey]: overrides } },
      guard.userId
    );
    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    revalidateTag('site-config', { expire: 0 });
    revalidateAllSiteConfigLayouts();

    return actionSuccess();
  } catch (error) {
    console.error('[updateThemeOverridesAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
