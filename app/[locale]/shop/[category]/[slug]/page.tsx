/**
 * Shop Product Detail Page
 *
 * Displays a single product with variants, images, description, and JSON-LD.
 * Uses server-side rendering with cached data for performance.
 */

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  getVisibleProductByCategoryAndSlugCached,
} from '@/lib/modules/shop/cached';
import { isShopEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo/hreflang';
import {
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/seo/jsonld';
import { markdownToHtml } from '@/lib/markdown/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SimilarProducts from '@/components/shop/SimilarProducts';
import type { ProductDetail } from '@/lib/types/shop';

interface PageProps {
  params: Promise<{ locale: string; category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, category, slug } = await params;

  // Check if shop is enabled
  const isEnabled = await isShopEnabledCached();
  if (!isEnabled) {
    return {};
  }

  const product = await getVisibleProductByCategoryAndSlugCached(category, slug);
  if (!product) {
    return {};
  }

  const name = locale === 'zh' ? product.nameZh : product.nameEn;
  const description =
    locale === 'zh'
      ? product.seoDescriptionZh || product.descriptionShortZh
      : product.seoDescriptionEn || product.descriptionShortEn;
  const seoTitle = locale === 'zh' ? product.seoTitleZh : product.seoTitleEn;
  const title = seoTitle || name || product.slug;

  return {
    title: `${title} | ${locale === 'zh' ? '商城' : 'Shop'}`,
    description: description || undefined,
    alternates: getMetadataAlternates(`/shop/${category}/${slug}`, locale),
    openGraph: {
      title,
      description: description || undefined,
      type: 'website',
      images: product.coverImageUrl ? [{ url: product.coverImageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      images: product.coverImageUrl ? [product.coverImageUrl] : [],
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

function ProductImages({
  product,
  locale,
}: {
  product: ProductDetail;
  locale: string;
}) {
  const name = locale === 'zh' ? product.nameZh : product.nameEn;
  const allImages = [
    product.coverImageUrl,
    ...product.mediaUrls,
  ].filter(Boolean) as string[];

  if (allImages.length === 0) {
    return (
      <div className="aspect-square bg-surface-raised rounded-lg flex items-center justify-center">
        <svg
          className="w-24 h-24 text-secondary opacity-50"
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="aspect-square relative bg-surface-raised rounded-lg overflow-hidden">
        <Image
          src={allImages[0]}
          alt={name || product.slug}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {allImages.slice(1, 5).map((url, index) => (
            <div
              key={index}
              className="aspect-square relative bg-surface-raised rounded-md overflow-hidden"
            >
              <Image
                src={url}
                alt={`${name || product.slug} - ${index + 2}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 25vw, 12.5vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ShopProductPage({ params }: PageProps) {
  const { locale, category, slug } = await params;

  // Check if shop is enabled
  const isEnabled = await isShopEnabledCached();
  if (!isEnabled) {
    notFound();
  }

  // Get product
  const product = await getVisibleProductByCategoryAndSlugCached(category, slug);
  if (!product) {
    notFound();
  }

  // Localized content
  const name = locale === 'zh' ? product.nameZh : product.nameEn;
  const shortDescription =
    locale === 'zh' ? product.descriptionShortZh : product.descriptionShortEn;
  const fullDescription =
    locale === 'zh' ? product.descriptionFullZh : product.descriptionFullEn;
  const tags = locale === 'zh' ? product.tagsZh : product.tagsEn;

  // Render markdown description
  const descriptionHtml = fullDescription
    ? await markdownToHtml(fullDescription)
    : null;

  // Generate JSON-LD
  const productUrl = `${SITE_URL}/${locale}/shop/${category}/${slug}`;
  const productJsonLd = generateProductJsonLd({
    name: name || product.slug,
    description: shortDescription || undefined,
    image: product.coverImageUrl || undefined,
    url: productUrl,
    sku: product.variants[0]?.sku || undefined,
    category: product.category || undefined,
    priceCurrency: 'TWD',
    minPrice: product.minPriceCents / 100,
    maxPrice: product.maxPriceCents / 100,
    availability: product.totalStock > 0 ? 'InStock' : 'OutOfStock',
    locale,
  });

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    {
      name: locale === 'zh' ? '首頁' : 'Home',
      url: `${SITE_URL}/${locale}`,
    },
    {
      name: locale === 'zh' ? '商城' : 'Shop',
      url: `${SITE_URL}/${locale}/shop`,
    },
    {
      name: category,
      url: `${SITE_URL}/${locale}/shop/${category}`,
    },
    {
      name: name || product.slug,
      url: productUrl,
    },
  ]);

  const shopLabel = locale === 'zh' ? '商城' : 'Shop';
  const outOfStockLabel = locale === 'zh' ? '缺貨' : 'Out of Stock';
  const variantsLabel = locale === 'zh' ? '規格選項' : 'Variants';
  const tagsLabel = locale === 'zh' ? '標籤' : 'Tags';

  return (
    <div className="min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-secondary">
          <Link
            href={`/${locale}/shop`}
            className="hover:text-primary transition-colors"
          >
            {shopLabel}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/${locale}/shop/${category}`}
            className="hover:text-primary transition-colors"
          >
            {category}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{name || product.slug}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <ProductImages product={product} locale={locale} />

          {/* Product Info */}
          <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {name || product.slug}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-2xl md:text-3xl font-bold text-primary">
                {product.minPriceCents === product.maxPriceCents
                  ? formatPrice(product.minPriceCents, locale)
                  : `${formatPrice(product.minPriceCents, locale)} - ${formatPrice(product.maxPriceCents, locale)}`}
              </span>
              {product.totalStock <= 0 && (
                <span className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded">
                  {outOfStockLabel}
                </span>
              )}
            </div>

            {/* Short Description */}
            {shortDescription && (
              <p className="text-secondary leading-relaxed">{shortDescription}</p>
            )}

            {/* Variants */}
            {product.variants.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-secondary uppercase tracking-wide mb-3">
                  {variantsLabel}
                </h2>
                <div className="space-y-2">
                  {product.variants.map((variant) => {
                    const optionValues = Object.entries(
                      variant.option_values_json || {}
                    )
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ');

                    return (
                      <div
                        key={variant.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          variant.stock > 0
                            ? 'border-border-light bg-surface'
                            : 'border-border-light bg-surface-raised opacity-60'
                        }`}
                      >
                        <div>
                          <span className="text-foreground">
                            {optionValues || variant.variant_key}
                          </span>
                          {variant.sku && (
                            <span className="ml-2 text-xs text-secondary">
                              SKU: {variant.sku}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-primary">
                            {formatPrice(variant.price_cents, locale)}
                          </span>
                          {variant.stock <= 0 && (
                            <span className="ml-2 text-xs text-red-500">
                              {outOfStockLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-secondary uppercase tracking-wide mb-3">
                  {tagsLabel}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-surface-raised text-secondary rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Description */}
        {descriptionHtml && (
          <div className="mt-12 border-t border-border-light pt-8">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {locale === 'zh' ? '商品說明' : 'Product Description'}
            </h2>
            <article
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        )}

        {/* Similar Products (AI-based) */}
        <SimilarProducts productId={product.id} locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
