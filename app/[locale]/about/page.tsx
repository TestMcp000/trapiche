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
import { AboutSection } from '@/components/sections';

// Helper to get localized content
function getContent<T>(content: SiteContent | undefined, locale: string): T | null {
  if (!content) return null;
  return (locale === 'zh' ? content.content_zh : content.content_en) as T;
}

// Helper to get setting value
function getSetting(settings: CompanySetting[], key: string): string {
  return settings.find(s => s.key === key)?.value || '';
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
  
  const title = locale === 'zh' ? '關於我們 | Quantum Nexus LNK' : 'About Us | Quantum Nexus LNK';
  const description = locale === 'zh' 
    ? '了解 Quantum Nexus LNK 的願景、使命與創辦人'
    : 'Learn about Quantum Nexus LNK\'s vision, mission, and founder';

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
          <h1 className="text-2xl font-bold text-foreground mb-4">Content Temporarily Unavailable</h1>
          <p className="text-secondary">Please try again later.</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline">Return to Home</Link>
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
  const emailAddress = getSetting(settings, 'email');
  const domainUrl = getSetting(settings, 'domain');
  const founderName = getSetting(settings, 'founder_name');
  const founderGithub = getSetting(settings, 'founder_github');
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: locale === 'zh' ? '首頁' : 'Home', url: `${SITE_URL}/${locale}` },
    { name: locale === 'zh' ? '關於我們' : 'About', url: `${SITE_URL}/${locale}/about` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (!about) {
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
