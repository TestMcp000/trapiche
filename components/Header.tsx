import Link from 'next/link';
import { getPublishedSiteContentCached } from '@/lib/modules/content/cached';
import { isBlogEnabledCached, isGalleryEnabledCached } from '@/lib/features/cached';
import { buildBlogListUrl, buildGalleryListUrl } from '@/lib/seo/url-builders';
import { getVisibleLandingSectionsCached } from '@/lib/modules/landing/cached';
import { getTranslations } from 'next-intl/server';
import { pickLocaleContent } from '@/lib/i18n/pick-locale';
import HeaderClient from './HeaderClient';

interface NavContent {
  about: string;
  services: string;
  platforms: string;
  product_design: string;
  portfolio: string;
  gallery?: string;
  contact: string;
  blog: string;
}

interface CompanyContent {
  nameShort: string;
}

interface HeaderProps {
  locale: string;
}

// Section keys that should show as anchor links on landing page
const LANDING_SECTION_KEYS = ['about', 'services', 'platforms', 'product_design', 'portfolio', 'contact'];

// Fallback header for build-time safety
function FallbackHeader({ locale = 'zh' }: { locale?: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/10 shadow-soft">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-xl font-bold text-foreground">
          網站
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href={`/${locale}#about`} className="text-secondary hover:text-foreground transition-colors">關於我們</Link>
          <Link href={`/${locale}#services`} className="text-secondary hover:text-foreground transition-colors">服務項目</Link>
          <Link href={`/${locale}#contact`} className="text-secondary hover:text-foreground transition-colors">聯絡我們</Link>
        </div>
      </nav>
    </header>
  );
}

export default async function Header({ locale }: HeaderProps) {
  try {
    // Fetch data in parallel with error handling for build-time safety
    let siteContents: Awaited<ReturnType<typeof getPublishedSiteContentCached>> = [];
    let isBlogEnabled = false;
    let isGalleryEnabled = false;
    let landingSections: Awaited<ReturnType<typeof getVisibleLandingSectionsCached>> = [];

    try {
      [siteContents, isBlogEnabled, isGalleryEnabled, landingSections] = await Promise.all([
        getPublishedSiteContentCached(),
        isBlogEnabledCached(),
        isGalleryEnabledCached(),
        getVisibleLandingSectionsCached(),
      ]);
    } catch (dataError) {
      console.error('[Header] Error fetching data:', dataError);
      // Continue with empty/default values
    }
    
    const navContent = siteContents.find(c => c.section_key === 'nav');
    const companyContent = siteContents.find(c => c.section_key === 'company');
    
    let nav: NavContent | null = null;
    let company: CompanyContent | null = null;
    
    nav = pickLocaleContent<NavContent>(navContent, locale);
    company = pickLocaleContent<CompanyContent>(companyContent, locale);
    
    // Fallback to static translations
    const tNav = await getTranslations({ locale, namespace: 'nav' });
    const tCompany = await getTranslations({ locale, namespace: 'company' });
    
    const companyName = company?.nameShort || tCompany('nameShort');

    // Build label map for landing section anchors
    const sectionLabelMap: Record<string, string> = {
      about: nav?.about || tNav('about'),
      services: nav?.services || tNav('services'),
      platforms: nav?.platforms || tNav('platforms'),
      product_design: nav?.product_design || tNav('product_design'),
      portfolio: nav?.portfolio || tNav('portfolio'),
      contact: nav?.contact || tNav('contact'),
    };

    // Build nav items: landing section anchors (exclude hero) + page links
    const sectionNavItems = landingSections
      .filter(s => s.section_key !== 'hero' && LANDING_SECTION_KEYS.includes(s.section_key))
      .map(s => ({
        key: s.section_key,
        href: `/${locale}#${s.section_key}`,
        label: sectionLabelMap[s.section_key] || s.section_key,
      }));

    // Page links (blog, gallery) - only show if feature is enabled
    const pageNavItems = [
      ...(isBlogEnabled ? [{
        key: 'blog',
        href: buildBlogListUrl(locale),
        label: nav?.blog || tNav('blog')
      }] : []),
      ...(isGalleryEnabled ? [{ 
        key: 'gallery', 
        href: buildGalleryListUrl(locale), 
        label: nav?.gallery || tNav('gallery')
      }] : []),
    ];

    const navItems = [...sectionNavItems, ...pageNavItems];

    return <HeaderClient companyName={companyName} navItems={navItems} locale={locale} />;
  } catch (error) {
    // If anything fails (including getTranslations), render fallback
    console.error('[Header] Critical error, using fallback:', error);
    return <FallbackHeader locale={locale} />;
  }
}
