/**
 * Similar Products Component
 * @see uiux_refactor.md §6.3.2 item 3
 *
 * Server component rendering AI-based similar products.
 * Returns null if feature disabled or no similar items found.
 */

import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { getResolvedSimilarProducts } from '@/lib/modules/embedding/similar-items-public-io';

interface SimilarProductsProps {
  productId: string;
  locale: string;
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

export default async function SimilarProducts({
  productId,
  locale,
}: SimilarProductsProps) {
  const _t = await getTranslations({ locale, namespace: 'shop' });
  const similarProducts = await getResolvedSimilarProducts(productId, 4);

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-border-light">
      <h2 className="text-xl font-bold text-foreground mb-6">
        {locale === 'zh' ? '相似商品' : 'Similar Products'}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {similarProducts.map((product) => {
          const name = locale === 'zh' ? product.nameZh : product.nameEn;
          const href = product.category
            ? `/${locale}/shop/${product.category}/${product.slug}`
            : `/${locale}/shop/uncategorized/${product.slug}`;

          return (
            <Link
              key={product.id}
              href={href}
              className="group bg-surface-raised rounded-theme overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border-light"
            >
              {/* Product Image */}
              <div className="aspect-square relative bg-surface">
                {product.coverImageUrl ? (
                  <Image
                    src={product.coverImageUrl}
                    alt={name || product.slug}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-secondary">
                    <svg
                      className="w-12 h-12 opacity-30"
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
                <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {name || product.slug}
                </h3>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {formatPrice(product.minPriceCents, locale)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
