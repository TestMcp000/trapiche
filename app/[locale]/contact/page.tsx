import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  getPublishedSiteContentCached, 
  getCompanySettingsCached 
} from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import type { SiteContent, CompanySetting } from '@/lib/types/content';
import { ContactSection } from '@/components/sections';

// Helper to get localized content
function getContent<T>(content: SiteContent | undefined, locale: string): T | null {
  if (!content) return null;
  return (locale === 'zh' ? content.content_zh : content.content_en) as T;
}

// Helper to get setting value
function getSetting(settings: CompanySetting[], key: string): string {
  return settings.find(s => s.key === key)?.value || '';
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
  
  const title = locale === 'zh' ? '聯絡我們 | Quantum Nexus LNK' : 'Contact Us | Quantum Nexus LNK';
  const description = locale === 'zh' 
    ? '與 Quantum Nexus LNK 團隊取得聯繫，討論您的專案需求'
    : 'Get in touch with the Quantum Nexus LNK team to discuss your project needs';

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
  const emailAddress = getSetting(settings, 'email');
  const githubUrl = getSetting(settings, 'github_url');
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: locale === 'zh' ? '首頁' : 'Home', url: `${SITE_URL}/${locale}` },
    { name: locale === 'zh' ? '聯絡我們' : 'Contact', url: `${SITE_URL}/${locale}/contact` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (!contact) {
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
