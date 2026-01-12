import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getVisibleServicesCached } from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import { ServicesSection } from '@/components/sections';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates('/services', locale);
  
  const title = locale === 'zh' ? '我們的服務 | Quantum Nexus LNK' : 'Our Services | Quantum Nexus LNK';
  const description = locale === 'zh' 
    ? '探索我們提供的全端開發、雲端基礎設施和 AI 整合服務'
    : 'Explore our full-stack development, cloud infrastructure, and AI integration services';

  return {
    title,
    description,
    alternates,
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Load services from database
  const services = await getVisibleServicesCached();
  
  // Localized title
  const title = locale === 'zh' ? '我們的建構項目' : 'What We Build';
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: locale === 'zh' ? '首頁' : 'Home', url: `${SITE_URL}/${locale}` },
    { name: locale === 'zh' ? '服務' : 'Services', url: `${SITE_URL}/${locale}/services` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (services.length === 0) {
    return (
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-secondary">No services available</p>
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
        <ServicesSection
          services={services}
          locale={locale}
          title={title}
        />
      </main>
      <Footer locale={locale} />
    </>
  );
}
