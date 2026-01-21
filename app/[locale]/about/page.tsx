import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  getPublishedSiteContentCached, 
  getCompanySettingsCached 
} from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import type { SiteContent, CompanySetting } from '@/lib/types/content';
import { getCompanySettingValue } from '@/lib/modules/content/company-settings';
import { AboutSection } from '@/components/sections';

// Helper to get localized content
function getContent<T>(content: SiteContent | undefined, _locale: string): T | null {
  if (!content) return null;
  return content.content_zh as T;
}

interface AboutContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  snapshot: string;
  founder: string;
  email: string;
  domain: string;
  focus: string;
  focusValue: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates('/about', locale);
  
  const title = '關於我們｜Quantum Nexus LNK';
  const description = '了解 Quantum Nexus LNK 的願景、使命與創辦人';

  return {
    title,
    description,
    alternates,
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  let siteContents: SiteContent[] = [];
  let settings: CompanySetting[] = [];
  
  // Load content from database with detailed error handling
  try {
    [siteContents, settings] = await Promise.all([
      getPublishedSiteContentCached(),
      getCompanySettingsCached(),
    ]);
  } catch (error) {
    console.error('[AboutPage] Error fetching data:', error);
    // Return a fully static fallback without Header/Footer to avoid secondary errors
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">內容暫時無法取得</h1>
          <p className="text-secondary">請稍後再試。</p>
          <Link href={`/${locale}`} className="mt-4 inline-block text-primary hover:underline">返回首頁</Link>
        </div>
      </div>
    );
  }
  
  // Map content by section
  const contentMap = new Map<string, SiteContent>();
  siteContents.forEach((c: SiteContent) => contentMap.set(c.section_key, c));
  
  // Get localized about content
  const about = getContent<AboutContent>(contentMap.get('about'), locale);
  
  // Get settings
  const emailAddress = getCompanySettingValue(settings, 'email');
  const domainUrl = getCompanySettingValue(settings, 'domain');
  const founderName = getCompanySettingValue(settings, 'founder_name');
  const founderGithub = getCompanySettingValue(settings, 'founder_github');
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: '首頁', url: `${SITE_URL}/${locale}` },
    { name: '關於我們', url: `${SITE_URL}/${locale}/about` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (!about) {
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
        <AboutSection
          about={about}
          locale={locale}
          founderName={founderName}
          founderGithub={founderGithub}
          emailAddress={emailAddress}
          domainUrl={domainUrl}
        />
      </main>
      <Footer locale={locale} />
    </>
  );
}
