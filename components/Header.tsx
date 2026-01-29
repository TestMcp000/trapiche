import Link from 'next/link';
import { getCompanySettingsCached, getHamburgerNavCached } from '@/lib/modules/content/cached';
import { isBlogEnabledCached, isGalleryEnabledCached } from '@/lib/features/cached';
import { resolveHamburgerNav } from '@/lib/site/nav-resolver';
import { filterHamburgerNavByFeatures } from '@/lib/site/hamburger-nav-filter';
import { getCompanySettingValue } from '@/lib/modules/content/company-settings';

interface HeaderProps {
  locale: string;
}

// Fallback header for build-time safety (no DB reads)
function FallbackHeader({ locale = 'zh' }: { locale?: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/10 shadow-soft">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-xl font-bold text-foreground">
          網站
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link
            href={`/${locale}#about`}
            className="text-secondary hover:text-foreground transition-colors"
          >
            關於我們
          </Link>
          <Link
            href={`/${locale}#services`}
            className="text-secondary hover:text-foreground transition-colors"
          >
            服務項目
          </Link>
          <Link
            href={`/${locale}#contact`}
            className="text-secondary hover:text-foreground transition-colors"
          >
            聯絡我們
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default async function Header({ locale }: HeaderProps) {
  let settings: Awaited<ReturnType<typeof getCompanySettingsCached>> = [];
  let hamburgerNav: Awaited<ReturnType<typeof getHamburgerNavCached>> = { version: 2, groups: [] };
  let blogEnabled = false;
  let galleryEnabled = false;

  try {
    [settings, hamburgerNav, blogEnabled, galleryEnabled] = await Promise.all([
      getCompanySettingsCached(),
      getHamburgerNavCached(),
      isBlogEnabledCached(),
      isGalleryEnabledCached(),
    ]);
  } catch (error) {
    console.error('[Header] Error fetching header data:', error);
    return <FallbackHeader locale={locale} />;
  }

  const siteName =
    getCompanySettingValue(settings, 'company_name_short') ||
    getCompanySettingValue(settings, 'company_name') ||
    '網站';

  const filteredNav = filterHamburgerNavByFeatures(hamburgerNav, {
    blogEnabled,
    galleryEnabled,
  });
  const resolvedNav = resolveHamburgerNav(filteredNav, locale);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="text-lg font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          {siteName}
        </Link>

        <details className="relative">
          <summary
            className="list-none [&::-webkit-details-marker]:hidden p-2 rounded-full text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
            aria-label="主選單"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>

          <div className="absolute right-0 mt-2 w-80 max-w-[85vw] max-h-[calc(100vh-5rem)] overflow-y-auto bg-surface-raised border border-border-light rounded-xl shadow-lg p-4">
            <nav aria-label="網站導覽" className="space-y-4">
              {resolvedNav.groups.map((group) => (
                <div key={group.id}>
                  <p className="text-xs font-semibold text-foreground/80 mb-2">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        {item.isExternal ? (
                          <a
                            href={item.href}
                            target={item.externalAttrs?.target}
                            rel={item.externalAttrs?.rel}
                            className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-foreground hover:bg-foreground/5 transition-colors"
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-foreground hover:bg-foreground/5 transition-colors"
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {resolvedNav.groups.length === 0 && (
                <p className="text-sm text-secondary">尚未設定導覽選單。</p>
              )}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
