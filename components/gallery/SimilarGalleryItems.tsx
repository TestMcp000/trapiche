/**
 * Similar Gallery Items Component
 * @see uiux_refactor.md §6.3.2 item 3
 *
 * Server component rendering AI-based similar gallery items.
 * Returns null if feature disabled or no similar items found.
 */

import Image from 'next/image';
import Link from 'next/link';
import { getResolvedSimilarGalleryItems } from '@/lib/modules/embedding/similar-items-public-io';

interface SimilarGalleryItemsProps {
  galleryItemId: string;
  locale: string;
}

export default async function SimilarGalleryItems({
  galleryItemId,
  locale,
}: SimilarGalleryItemsProps) {
  const similarItems = await getResolvedSimilarGalleryItems(galleryItemId, 4);

  if (similarItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-border-light">
      <h2 className="text-xl font-bold text-foreground mb-6">
        {locale === 'zh' ? '相似作品' : 'Similar Works'}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {similarItems.map((item) => {
          const title = locale === 'zh' ? item.titleZh : item.titleEn;
          const categorySlug = item.category?.slug || 'uncategorized';
          const href = `/${locale}/gallery/${categorySlug}/${item.slug}`;

          return (
            <Link
              key={item.id}
              href={href}
              className="group bg-surface-raised rounded-theme overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border-light"
            >
              {/* Gallery Image */}
              <div className="aspect-square relative bg-surface">
                <Image
                  src={item.imageUrl}
                  alt={title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Item Info */}
              <div className="p-4">
                {item.category && (
                  <span className="inline-block text-xs font-medium text-primary mb-1">
                    {locale === 'zh' ? item.category.nameZh : item.category.nameEn}
                  </span>
                )}
                <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
