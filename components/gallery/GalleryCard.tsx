/**
 * GalleryCard Component (Server Component)
 * 
 * Pure presentational server component for gallery item cards.
 * Renders image, title, and links without client-side hydration.
 * 
 * For interactive features (like button), wrap with GalleryCardClient.
 * This pattern optimizes hydration by keeping presentation server-rendered.
 */

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toWebp } from '@/lib/utils/cloudinary-url';
import type { GalleryItem, GalleryCategory } from '@/lib/types/gallery';
import GalleryCardClient from './GalleryCardClient';

interface GalleryCardProps {
  item: GalleryItem & { 
    category?: GalleryCategory;
    likedByMe?: boolean;
  };
  locale: string;
}

export default function GalleryCard({ item, locale }: GalleryCardProps) {
  const title = locale === 'zh' ? item.title_zh : item.title_en;
  const categorySlug = item.category?.slug || '';
  const imageAlt = (locale === 'zh' ? item.image_alt_zh : item.image_alt_en) || title;
  
  // Build the link to the item detail page
  const href = `/${locale}/gallery/${categorySlug}/${item.slug}`;
  
  // Convert image URL to WebP for optimal delivery
  const imageUrl = toWebp(item.image_url);

  const aspectRatio =
    item.image_width && item.image_height && item.image_width > 0 && item.image_height > 0
      ? `${item.image_width}/${item.image_height}`
      : '4/3';

  return (
    <GalleryCardClient
      itemId={item.id}
      likedByMe={item.likedByMe ?? false}
      likeCount={item.like_count}
    >
      <Link href={href} className="block">
        <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio }}>
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 motion-reduce:transition-none" />
        </div>
      </Link>
      
      <div className="p-3 flex items-center">
        <Link 
          href={href}
          className="flex-1 min-w-0 mr-2"
        >
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors motion-reduce:transition-none">
            {title}
          </h3>
        </Link>
      </div>
    </GalleryCardClient>
  );
}
