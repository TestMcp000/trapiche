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
  
  const title = '服務方式';
  const description = '了解本站提供的服務內容與合作方式';

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
  const title = '我們的建構項目';
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: '首頁', url: `${SITE_URL}/${locale}` },
    { name: '服務', url: `${SITE_URL}/${locale}/services` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (services.length === 0) {
    return (
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-secondary">目前沒有可顯示的服務</p>
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
