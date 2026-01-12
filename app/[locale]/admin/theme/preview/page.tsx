/**
 * Admin Theme Preview Route (Server Component)
 *
 * Admin-only preview route that renders public page components with a specified theme.
 * This enables layout-level preview (including enableAnimations) without polluting
 * public cache or affecting SEO.
 *
 * SearchParams:
 * - path: 'home' | 'blog' | 'gallery' | 'shop' (default: 'home')
 * - theme: ThemeKey (default: from site_config)
 *
 * @module app/[locale]/admin/theme/preview/page
 * @see uiux_refactor.md Step 5.2
 */

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ThemePreviewScope } from '@/components/theme/ThemePreviewScope';
import { isValidThemeKey } from '@/lib/modules/theme/resolve';
import { DEFAULT_THEME_KEY, type ThemeKey, type ThemeScopeKey } from '@/lib/types/theme';

// Force noindex to prevent SEO pollution
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// Valid preview paths
const VALID_PATHS = ['home', 'blog', 'gallery', 'shop'] as const;
type PreviewPath = (typeof VALID_PATHS)[number];

function isValidPath(value: unknown): value is PreviewPath {
  return typeof value === 'string' && VALID_PATHS.includes(value as PreviewPath);
}

/**
 * Map preview path to ThemeScopeKey.
 * 'home' is a special case that uses 'home' scope in ThemeScope.
 */
function pathToScope(path: PreviewPath): ThemeScopeKey | 'home' {
  return path;
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ path?: string; theme?: string }>;
}

export default async function ThemePreviewPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { path: rawPath, theme: rawTheme } = await searchParams;
  const t = await getTranslations('admin');

  // Validate and normalize path
  const path: PreviewPath = isValidPath(rawPath) ? rawPath : 'home';
  const scope = pathToScope(path);

  // Validate and normalize theme
  const themeKey: ThemeKey = isValidThemeKey(rawTheme) ? (rawTheme as ThemeKey) : DEFAULT_THEME_KEY;

  // Get translated page name using theme.scope keys
  const pageName = t(`theme.scope.${path}`);

  return (
    <ThemePreviewScope scope={scope} themeKey={themeKey}>
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16 min-h-screen">
          <div className="container mx-auto px-4">
            {/* Preview content placeholder - shows current preview state */}
            <div className="text-center py-20">
              <p className="text-lg text-secondary mb-4">
                {t('theme.preview.title')}
              </p>
              <h1 className="text-4xl font-bold text-foreground mb-6">
                {pageName}
              </h1>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border">
                <span className="text-sm text-secondary">Theme:</span>
                <code className="text-sm font-mono text-primary">{themeKey}</code>
              </div>
            </div>

            {/* Sample content to demonstrate theme colors */}
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Surface cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-lg bg-surface border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('theme.surfaceCard')}
                  </h3>
                  <p className="text-sm text-secondary">
                    {t('theme.surfaceCardDesc')}
                  </p>
                </div>
                <div className="p-6 rounded-lg bg-surface-raised border border-border shadow-md">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('theme.raisedCard')}
                  </h3>
                  <p className="text-sm text-secondary">
                    {t('theme.raisedCardDesc')}
                  </p>
                </div>
              </div>

              {/* Button samples */}
              <div className="flex flex-wrap gap-4 justify-center">
                <button className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors">
                  {t('theme.primaryButton')}
                </button>
                <button className="px-6 py-2 rounded-lg bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors">
                  {t('theme.secondaryButton')}
                </button>
              </div>

              {/* Typography samples */}
              <div className="p-6 rounded-lg bg-surface border border-border space-y-4">
                <h2 className="text-2xl font-bold text-foreground">
                  {t('theme.typography')}
                </h2>
                <p className="text-foreground">
                  {t('theme.typographyHeading')}
                </p>
                <p className="text-secondary">
                  {t('theme.typographyBody')}
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer locale={locale} />
      </>
    </ThemePreviewScope>
  );
}
