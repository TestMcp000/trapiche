/**
 * Theme Preview Scope Component (Server Component)
 *
 * Similar to ThemeScope, but accepts the theme key as a prop for preview purposes.
 * Used by the admin preview route to render content with a specified theme
 * without reading from the database.
 *
 * @module components/theme/ThemePreviewScope
 * @see uiux_refactor.md Step 5.2
 */

import type { ThemeKey, ThemeScopeKey } from '@/lib/types/theme';
import { buildThemeCssVars } from '@/lib/modules/theme/resolve';
import { THEME_PRESETS } from '@/lib/modules/theme/presets';
import { ScrollytellingClient } from '@/components/theme/ScrollytellingClient';

interface ThemePreviewScopeProps {
  /**
   * Page scope key for theme application.
   * 'home' | 'blog' | 'gallery' | 'shop'
   */
  scope: ThemeScopeKey | 'home';
  /**
   * Theme key to apply (overrides DB config).
   */
  themeKey: ThemeKey;
  children: React.ReactNode;
}

/**
 * Server component that applies a specified theme to page content.
 *
 * Unlike ThemeScope, this component:
 * - Accepts themeKey as a prop (no DB read)
 * - Is used only for admin preview purposes
 * - Enables layout-level preview including animations
 */
export async function ThemePreviewScope({
  scope: _scope,
  themeKey,
  children,
}: ThemePreviewScopeProps) {
  // Build CSS variables for the specified theme (no overrides for pure preview)
  const cssVars = buildThemeCssVars({
    themeKey,
  });

  // Convert to React CSSProperties
  const style = cssVars as React.CSSProperties;

  // Check if this theme enables animations
  const preset = THEME_PRESETS[themeKey];
  const enableAnimations = preset?.enableAnimations ?? false;

  const content = enableAnimations ? (
    <ScrollytellingClient>{children}</ScrollytellingClient>
  ) : (
    children
  );

  return (
    <div data-theme={themeKey} style={style} className="theme-scope">
      {content}
    </div>
  );
}
