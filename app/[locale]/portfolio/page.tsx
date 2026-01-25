import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getVisiblePortfolioItemsCached } from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import { PortfolioSection } from '@/components/sections';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates('/portfolio', locale);
  
  const title = '精選內容';
  const description = '瀏覽本站精選內容';

  return {
    title,
    description,
    alternates,
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Load portfolio items from database
  const portfolioItems = await getVisiblePortfolioItemsCached();
  
  // Localized labels
  const labels = {
    title: '精選作品',
    intro: '打造有影響力的解決方案，解決社群和個人面臨的真實挑戰。',
    visit: '了解更多',
    inDevelopment: '開發中',
  };
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: '首頁', url: `${SITE_URL}/${locale}` },
    { name: '作品集', url: `${SITE_URL}/${locale}/portfolio` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (portfolioItems.length === 0) {
    return (
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-secondary">目前沒有可顯示的作品</p>
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
        <PortfolioSection
          portfolioItems={portfolioItems}
          locale={locale}
          labels={labels}
        />
      </main>
      <Footer locale={locale} />
    </>
  );
}
