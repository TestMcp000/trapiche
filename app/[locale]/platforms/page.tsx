import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getPublishedSiteContentCached } from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import type { SiteContent } from '@/lib/types/content';
import { PlatformsSection } from '@/components/sections';

// Helper to get localized content
function getContent<T>(content: SiteContent | undefined, _locale: string): T | null {
  if (!content) return null;
  return content.content_zh as T;
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
  
  const title = '講座／活動';
  const description = '查看近期活動與相關資訊';

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
    { name: '首頁', url: `${SITE_URL}/${locale}` },
    { name: '技術平台', url: `${SITE_URL}/${locale}/platforms` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (!platforms) {
    return (
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-secondary">內容不存在</p>
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
