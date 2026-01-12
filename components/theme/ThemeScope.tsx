/**
 * Theme Scope Component (Server Component)
 *
 * Wraps page content with scoped theme CSS variables.
 * Used by page layouts (blog/gallery/shop) to apply per-page themes.
 *
 * @module components/theme/ThemeScope
 * @see ARCHITECTURE.md §3.2 - ThemeScope component
 */

import type { ThemeScopeKey } from '@/lib/types/theme';
import { getSiteConfigCached } from '@/lib/modules/theme/cached';
import { resolveTheme } from '@/lib/modules/theme/resolve';
import { ScrollytellingClient } from '@/components/theme/ScrollytellingClient';

interface ThemeScopeProps {
  /**
   * Page scope key for theme resolution.
   * Must be one of: 'blog' | 'gallery' | 'shop'
   * Note: 'home' is handled by the root layout, not ThemeScope.
   */
  scope: ThemeScopeKey;
  children: React.ReactNode;
}

/**
 * Server component that applies scoped theme to page content.
 *
 * - Reads site config from cache
 * - Resolves page-specific theme (falls back to global theme)
 * - Injects CSS variables via inline style
 * - Sets data-theme attribute for semantic/debug purposes
 */
export async function ThemeScope({ scope, children }: ThemeScopeProps) {
  const siteConfig = await getSiteConfigCached();

  // Resolve theme using Theme v2 (per-layout tokens)
  const resolved = resolveTheme(siteConfig, scope);
  const themeKey = resolved.themeKey;

  // Convert to React CSSProperties
  const style = resolved.variables as React.CSSProperties;

  const content = resolved.enableAnimations ? (
    <ScrollytellingClient>{children}</ScrollytellingClient>
  ) : (
    children
  );

  return (
    <div
      data-theme={themeKey}
      style={style}
      className="theme-scope"
    >
      {content}
    </div>
  );
}
