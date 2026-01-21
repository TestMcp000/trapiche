import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  getPublishedSiteContentCached, 
  getCompanySettingsCached 
} from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import type { SiteContent } from '@/lib/types/content';
import { getCompanySettingValue } from '@/lib/modules/content/company-settings';
import { ContactSection } from '@/components/sections';

// Helper to get localized content
function getContent<T>(content: SiteContent | undefined, _locale: string): T | null {
  if (!content) return null;
  return content.content_zh as T;
}

interface ContactContent {
  title: string;
  paragraph: string;
  email: string;
  github: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates('/contact', locale);
  
  const title = '聯絡我們｜Quantum Nexus LNK';
  const description = '與 Quantum Nexus LNK 團隊取得聯繫，討論您的專案需求';

  return {
    title,
    description,
    alternates,
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Load content from database
  const [siteContents, settings] = await Promise.all([
    getPublishedSiteContentCached(),
    getCompanySettingsCached(),
  ]);
  
  // Map content by section
  const contentMap = new Map<string, SiteContent>();
  siteContents.forEach((c: SiteContent) => contentMap.set(c.section_key, c));
  
  // Get localized contact content
  const contact = getContent<ContactContent>(contentMap.get('contact'), locale);
  
  // Get settings
  const emailAddress = getCompanySettingValue(settings, 'email');
  const githubUrl = getCompanySettingValue(settings, 'github_url');
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: '首頁', url: `${SITE_URL}/${locale}` },
    { name: '聯絡我們', url: `${SITE_URL}/${locale}/contact` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (!contact) {
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
        <ContactSection
          contact={contact}
          emailAddress={emailAddress}
          githubUrl={githubUrl}
        />
      </main>
      <Footer locale={locale} />
    </>
  );
}
