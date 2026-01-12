import Link from 'next/link';
import { getPublishedSiteContentCached } from '@/lib/modules/content/cached';
import { isBlogEnabledCached, isGalleryEnabledCached, isShopEnabledCached } from '@/lib/features/cached';
import { getTranslations } from 'next-intl/server';
import { pickLocaleContent } from '@/lib/i18n/pick-locale';

interface FooterContent {
  tagline: string;
  companyName: string;
  rights: string;
}

interface NavContent {
  blog: string;
  gallery?: string;
  shop?: string;
  contact: string;
  privacy: string;
}

interface FooterProps {
  locale: string;
}

// Fallback footer for build-time safety
function FallbackFooter({ locale = 'en' }: { locale?: string }) {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-surface text-secondary border-t border-border-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-foreground">
              Quantum Nexus LNK
            </p>
            <p className="text-xs mt-2">
              © {currentYear} All rights reserved
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href={`/${locale}/contact`} className="hover:text-primary transition-colors">Contact</Link>
            <Link href={`/${locale}/privacy`} className="hover:text-primary transition-colors">Privacy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default async function Footer({ locale }: FooterProps) {
  try {
    const currentYear = new Date().getFullYear();
    
    // Fetch data in parallel with error handling for build-time safety
    let siteContents: Awaited<ReturnType<typeof getPublishedSiteContentCached>> = [];
    let isBlogEnabled = false;
    let isGalleryEnabled = false;
    let isShopEnabled = false;

    try {
      [siteContents, isBlogEnabled, isGalleryEnabled, isShopEnabled] = await Promise.all([
        getPublishedSiteContentCached(),
        isBlogEnabledCached(),
        isGalleryEnabledCached(),
        isShopEnabledCached(),
      ]);
    } catch (dataError) {
      console.error('[Footer] Error fetching data:', dataError);
      // Continue with empty/default values
    }
    
    const footerContent = siteContents.find(c => c.section_key === 'footer');
    const navContent = siteContents.find(c => c.section_key === 'nav');
    
    let footer: FooterContent | null = null;
    let nav: NavContent | null = null;
    
    footer = pickLocaleContent<FooterContent>(footerContent, locale);
    nav = pickLocaleContent<NavContent>(navContent, locale);
    
    // Fallback to static translations
    const t = await getTranslations({ locale, namespace: 'footer' });
    const tNav = await getTranslations({ locale, namespace: 'nav' });
    
    const companyName = footer?.companyName || t('companyName');
    const rights = footer?.rights || t('rights');
    const tagline = footer?.tagline || t('tagline');
    
    // Build page links - only show enabled features
    const pageLinks = [
      ...(isBlogEnabled ? [{
        key: 'blog',
        href: `/${locale}/blog`,
        label: nav?.blog || tNav('blog')
      }] : []),
      ...(isGalleryEnabled ? [{ 
        key: 'gallery', 
        href: `/${locale}/gallery`, 
        label: nav?.gallery || tNav('gallery')
      }] : []),
      ...(isShopEnabled ? [{ 
        key: 'shop', 
        href: `/${locale}/shop`, 
        label: nav?.shop || tNav('shop')
      }] : []),
      { key: 'contact', href: `/${locale}/contact`, label: nav?.contact || tNav('contact') },
      { key: 'privacy', href: `/${locale}/privacy`, label: nav?.privacy || tNav('privacy') },
    ];

    return (
      <footer className="bg-surface text-secondary border-t border-border-light">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm font-medium text-foreground">
                {companyName}
              </p>
              <p className="text-xs mt-2">
                © {currentYear} {rights}
              </p>
              <p className="text-xs mt-1 text-secondary/70">{tagline}</p>
            </div>
            
            <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-4 text-sm">
              {pageLinks.map(link => (
                <Link 
                  key={link.key}
                  href={link.href}
                  className="hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    );
  } catch (error) {
    // If anything fails (including getTranslations), render fallback
    console.error('[Footer] Critical error, using fallback:', error);
    return <FallbackFooter locale={locale} />;
  }
}
