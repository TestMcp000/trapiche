/**
 * Shop List Page
 *
 * Displays the main shop page with product listing.
 * Uses server-side rendering with cached data for performance.
 */

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { isShopEnabledCached } from '@/lib/features/cached';
import {
  getVisibleProductsCached,
  getVisibleProductCategoriesCached,
} from '@/lib/modules/shop/cached';
import { getMetadataAlternates } from '@/lib/seo/hreflang';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { ProductSummary } from '@/lib/types/shop';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const title = locale === 'zh' ? '商城' : 'Shop';
  const description =
    locale === 'zh' ? '探索我們的商品' : 'Explore our products';

  return {
    title,
    description,
    alternates: getMetadataAlternates('/shop', locale),
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

function formatPrice(cents: number, locale: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ProductCard({
  product,
  locale,
}: {
  product: ProductSummary;
  locale: string;
}) {
  const name = locale === 'zh' ? product.nameZh : product.nameEn;
  const description =
    locale === 'zh' ? product.descriptionShortZh : product.descriptionShortEn;

  // Category is required - all products must have a category (P0 route strategy)
  const productUrl = `/${locale}/shop/${product.category}/${product.slug}`;

  return (
    <Link
      href={productUrl}
      className="group block bg-surface rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Product Image */}
      <div className="aspect-square relative bg-surface-raised">
        {product.coverImageUrl ? (
          <Image
            src={product.coverImageUrl}
            alt={name || product.slug}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-secondary">
            <svg
              className="w-16 h-16 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {name || product.slug}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-secondary line-clamp-2">
            {description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-semibold text-primary">
            {product.minPriceCents === product.maxPriceCents
              ? formatPrice(product.minPriceCents, locale)
              : `${formatPrice(product.minPriceCents, locale)} - ${formatPrice(product.maxPriceCents, locale)}`}
          </span>
          {product.totalStock <= 0 && (
            <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
              {locale === 'zh' ? '缺貨' : 'Out of Stock'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function ShopPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;

  // Check if shop is enabled
  const isEnabled = await isShopEnabledCached();
  if (!isEnabled) {
    notFound();
  }

  // Load data
  const [productsResult, categories] = await Promise.all([
    getVisibleProductsCached({
      category: query.category,
      search: query.q,
      sort: (query.sort as 'newest' | 'popular' | 'price-asc' | 'price-desc') || 'newest',
      limit: 24,
      offset: 0,
    }),
    getVisibleProductCategoriesCached(),
  ]);

  const title = locale === 'zh' ? '商城' : 'Shop';
  const allLabel = locale === 'zh' ? '全部' : 'All';

  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          {title}
        </h1>

        {/* Category Filter */}
        {categories.length > 0 && (
          <nav className="mb-8">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/shop`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !query.category
                    ? 'bg-primary text-white'
                    : 'bg-surface-raised text-secondary hover:text-primary'
                }`}
              >
                {allLabel}
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/${locale}/shop/${cat.slug}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    query.category === cat.slug
                      ? 'bg-primary text-white'
                      : 'bg-surface-raised text-secondary hover:text-primary'
                  }`}
                >
                  {cat.slug} ({cat.productCount})
                </Link>
              ))}
            </div>
          </nav>
        )}

        {/* Product Grid */}
        {productsResult.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productsResult.items.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-secondary text-lg">
              {locale === 'zh' ? '目前沒有商品' : 'No products available'}
            </p>
          </div>
        )}

        {/* Total count */}
        {productsResult.total > 0 && (
          <p className="mt-8 text-center text-sm text-secondary">
            {locale === 'zh'
              ? `共 ${productsResult.total} 件商品`
              : `${productsResult.total} products`}
          </p>
        )}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
