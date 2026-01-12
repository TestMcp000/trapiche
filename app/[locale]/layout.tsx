import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/lib/i18n/routing';
import { getSiteConfigCached } from '@/lib/modules/theme/cached';
import { buildThemeCssVars, isValidThemeKey } from '@/lib/modules/theme/resolve';
import { DEFAULT_THEME_KEY, type ThemeKey } from '@/lib/types/theme';
import { PageViewTrackerClient } from '@/components/analytics/PageViewTrackerClient';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering for next-intl
  // Required for useLocale() and other server-side i18n hooks to work during SSR prerendering
  // Note: NextIntlClientProvider is now scoped to specific client islands (e.g., ClientCommentSection)
  // to reduce initial bundle size. See ARCHITECTURE.md for i18n provider strategy.
  setRequestLocale(locale);

  // Fetch site config (Theme v2)
  const siteConfig = await getSiteConfigCached();

  // Resolve global theme key (note: home/blog/gallery/shop overrides are applied by ThemeScope wrappers)
  const themeKey: ThemeKey = siteConfig?.global_theme && isValidThemeKey(siteConfig.global_theme)
    ? (siteConfig.global_theme as ThemeKey)
    : DEFAULT_THEME_KEY;

  // Build CSS variables with Theme v2 tokens
  const cssVars = buildThemeCssVars({
    themeKey,
    themeOverrides: siteConfig?.theme_overrides,
  });

  // Convert to React CSSProperties
  const themeStyle = cssVars as React.CSSProperties;

  return (
    <html lang={locale}>
      <body
        className="font-sans antialiased"
        data-theme={themeKey}
        style={themeStyle}
      >
        <PageViewTrackerClient />
        {children}
      </body>
    </html>
  );
}
