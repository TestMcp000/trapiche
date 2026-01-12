/**
 * Shop Cart Page
 *
 * Client-side shopping cart page.
 * Uses CartContent component for all interactive functionality.
 */

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { isShopEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo/hreflang';
import { CartContent } from '@/components/shop/CartContent';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const title = locale === 'zh' ? '購物車' : 'Shopping Cart';
  const description =
    locale === 'zh' ? '查看您的購物車' : 'View your shopping cart';

  return {
    title,
    description,
    alternates: getMetadataAlternates('/shop/cart', locale),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function CartPage({ params }: PageProps) {
  const { locale } = await params;

  // Check if shop is enabled
  const isEnabled = await isShopEnabledCached();
  if (!isEnabled) {
    notFound();
  }

  const title = locale === 'zh' ? '購物車' : 'Shopping Cart';

  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          {title}
        </h1>

        <CartContent locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
