/**
 * Gallery Section - Server Component
 *
 * Image grid component for gallery-type landing sections.
 * Displays items from a gallery category or featured pins.
 */

import Image from 'next/image';
import Link from 'next/link';
import { toWebp } from '@/lib/utils/cloudinary-url';
import type { GalleryItem, GalleryCategory } from '@/lib/types/gallery';

interface GallerySectionProps {
  id: string;
  title: string | null;
  subtitle: string | null;
  items: GalleryItem[];
  locale: string;
}

export default function GallerySection({
  id,
  title,
  subtitle,
  items,
  locale,
}: GallerySectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section id={id} className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {(title || subtitle) && (
          <div className="max-w-3xl mx-auto text-center mb-16">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-secondary">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const itemTitle = locale === 'zh' ? item.title_zh : item.title_en;
            const category = (item as GalleryItem & { category?: GalleryCategory }).category;
            const categorySlug = category?.slug || 'gallery';
            const imageUrl = toWebp(item.image_url);
            const aspectRatio = item.image_width && item.image_height
              ? `${item.image_width}/${item.image_height}`
              : '4/3';

            return (
              <Link
                key={item.id}
                href={`/${locale}/gallery/${categorySlug}/${item.slug}`}
                className="group relative block rounded-xl overflow-hidden bg-surface"
              >
                <div style={{ aspectRatio }} className="relative">
                  <Image
                    src={imageUrl}
                    alt={itemTitle || item.title_en || 'Gallery item'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <h3 className="text-white font-medium text-sm line-clamp-2">
                      {itemTitle}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
