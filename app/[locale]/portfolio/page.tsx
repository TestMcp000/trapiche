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
  
  const title = locale === 'zh' ? '精選作品 | Quantum Nexus LNK' : 'Portfolio | Quantum Nexus LNK';
  const description = locale === 'zh' 
    ? '瀏覽我們的精選作品和專案案例'
    : 'Browse our selected works and project portfolios';

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
    title: locale === 'zh' ? '精選作品' : 'Selected Work',
    intro: locale === 'zh' 
      ? '打造有影響力的解決方案，解決社群和個人面臨的真實挑戰。' 
      : 'Building impactful solutions that address real-world challenges across communities and individuals.',
    visit: locale === 'zh' ? '了解更多' : 'Learn More',
    inDevelopment: locale === 'zh' ? '開發中' : 'In Development',
  };
  
  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: locale === 'zh' ? '首頁' : 'Home', url: `${SITE_URL}/${locale}` },
    { name: locale === 'zh' ? '作品集' : 'Portfolio', url: `${SITE_URL}/${locale}/portfolio` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (portfolioItems.length === 0) {
    return (
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-secondary">No portfolio items available</p>
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
