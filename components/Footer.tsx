import Link from 'next/link';
import { getPublishedSiteContentCached, getHamburgerNavCached } from '@/lib/modules/content/cached';
import { isBlogEnabledCached, isGalleryEnabledCached } from '@/lib/features/cached';
import { getTranslations } from 'next-intl/server';
import { pickLocaleContent } from '@/lib/i18n/pick-locale';
import { resolveHamburgerNav } from '@/lib/site/nav-resolver';
import { filterHamburgerNavByFeatures } from '@/lib/site/hamburger-nav-filter';

interface FooterContent {
  tagline: string;
  companyName: string;
  rights: string;
}

interface FooterProps {
  locale: string;
}

// Fallback footer for build-time safety
function FallbackFooter({ locale = 'zh' }: { locale?: string }) {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-surface text-secondary border-t border-border-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-foreground">網站</p>
            <p className="text-xs mt-2">© {currentYear} 版權所有</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href={`/${locale}/contact`} className="hover:text-primary transition-colors">
              聯絡我們
            </Link>
            <Link href={`/${locale}/privacy`} className="hover:text-primary transition-colors">
              隱私權政策
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default async function Footer({ locale }: FooterProps) {
  const currentYear = new Date().getFullYear();

  let siteContents: Awaited<ReturnType<typeof getPublishedSiteContentCached>> = [];
  let hamburgerNav: Awaited<ReturnType<typeof getHamburgerNavCached>> = { version: 2, groups: [] };
  let blogEnabled = false;
  let galleryEnabled = false;

  try {
    [siteContents, hamburgerNav, blogEnabled, galleryEnabled] = await Promise.all([
      getPublishedSiteContentCached(),
      getHamburgerNavCached(),
      isBlogEnabledCached(),
      isGalleryEnabledCached(),
    ]);
  } catch (dataError) {
    console.error('[Footer] Error fetching data:', dataError);
  }

  let t: Awaited<ReturnType<typeof getTranslations>>;
  try {
    t = await getTranslations({ locale, namespace: 'footer' });
  } catch (error) {
    console.error('[Footer] Error fetching translations:', error);
    return <FallbackFooter locale={locale} />;
  }

  const footerContent = siteContents.find((c) => c.section_key === 'footer');
  const footer = pickLocaleContent<FooterContent>(footerContent, locale);

  const companyName = footer?.companyName || t('companyName');
  const rights = footer?.rights || t('rights');
  const tagline = footer?.tagline || t('tagline');

  const filteredNav = filterHamburgerNavByFeatures(hamburgerNav, {
    blogEnabled,
    galleryEnabled,
  });
  const resolvedNav = resolveHamburgerNav(filteredNav, locale);

  return (
    <footer className="bg-surface text-secondary border-t border-border-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          <div className="md:col-span-2 text-center md:text-left">
            <p className="text-sm font-medium text-foreground">{companyName}</p>
            <p className="text-xs mt-2">
              © {currentYear} {rights}
            </p>
            <p className="text-xs mt-1 text-secondary/70">{tagline}</p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm"
          >
            {resolvedNav.groups.length > 0 ? (
              resolvedNav.groups.map((group) => (
                <div key={group.id}>
                  <p className="text-xs font-semibold text-foreground/80 mb-2">
                    {group.label}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        {item.isExternal ? (
                          <a
                            href={item.href}
                            target={item.externalAttrs?.target}
                            rel={item.externalAttrs?.rel}
                            className="hover:text-primary transition-colors"
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link href={item.href} className="hover:text-primary transition-colors">
                            {item.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div>
                <p className="text-xs font-semibold text-foreground/80 mb-2">連結</p>
                <ul className="space-y-2">
                  <li>
                    <Link href={`/${locale}/contact`} className="hover:text-primary transition-colors">
                      聯絡方式
                    </Link>
                  </li>
                  <li>
                    <Link href={`/${locale}/privacy`} className="hover:text-primary transition-colors">
                      隱私權政策
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
