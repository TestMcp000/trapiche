import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getPublishedSiteContentCached } from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import type { SiteContent } from '@/lib/types/content';
import { PlatformsSection } from '@/components/sections';

// Helper to get localized content
function getContent<T>(content: SiteContent | undefined, locale: string): T | null {
  if (!content) return null;
  return (locale === 'zh' ? content.content_zh : content.content_en) as T;
}

interface PlatformsContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  cardTitle: string;
  items: string[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates('/platforms', locale);
  
  const title = locale === 'zh' ? '技術平台 | Quantum Nexus LNK' : 'Platforms | Quantum Nexus LNK';
  const description = locale === 'zh' 
    ? '了解我們使用的現代技術平台和工具'
    : 'Learn about the modern technology platforms and tools we use';

  return {
    title,
    description,
    alternates,
  };
}

export default async function PlatformsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Load content from database
  const siteContents = await getPublishedSiteContentCached();
  
  // Map content by section
  const contentMap = new Map<string, SiteContent>();
  siteContents.forEach((c: SiteContent) => contentMap.set(c.section_key, c));
  
  // Get localized platforms content
  const platforms = getContent<PlatformsContent>(contentMap.get('platforms'), locale);
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: locale === 'zh' ? '首頁' : 'Home', url: `${SITE_URL}/${locale}` },
    { name: locale === 'zh' ? '技術平台' : 'Platforms', url: `${SITE_URL}/${locale}/platforms` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (!platforms) {
    return (
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-secondary">Content not available</p>
          </div>
        </main>
        <Footer locale={locale} />
      </>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header locale={locale} />
      <main className="pt-24 md:pt-32 pb-16">
        <PlatformsSection
          platforms={platforms}
          locale={locale}
        />
      </main>
      <Footer locale={locale} />
    </>
  );
}
