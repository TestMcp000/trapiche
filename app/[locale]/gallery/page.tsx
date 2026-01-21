/**
 * Gallery List Page
 * 
 * Displays the Pinterest-style gallery with masonry layout and infinite scroll.
 * Shows all visible gallery items with filtering by category, tag, and search.
 */

import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { 
  getVisibleGalleryCategoriesCached, 
  getVisibleGalleryPinsCached,
  getVisibleGalleryItemsPageCached,
} from '@/lib/modules/gallery/cached';
import { isGalleryEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo/hreflang';
import { getLikedGalleryItemIds } from '@/lib/modules/gallery/liked-by-me-io';
import { ANON_ID_COOKIE_NAME } from '@/lib/utils/anon-id';
import GalleryMasonry from '@/components/gallery/GalleryMasonry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { GalleryListSort } from '@/lib/types/gallery';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
    tag?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  
  const title = '畫廊';
  const description = '探索我們的作品集';
  
  return {
    title,
    description,
    alternates: getMetadataAlternates('/gallery', locale),
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function GalleryPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  
  // Check if gallery is enabled
  const isEnabled = await isGalleryEnabledCached();
  if (!isEnabled) {
    notFound();
  }
  
  // PR-6B: Redirect ?category= to canonical /gallery/categories/* path
  if (query.category) {
    const redirectParams = new URLSearchParams();
    if (query.q) redirectParams.set('q', query.q);
    if (query.tag) redirectParams.set('tag', query.tag);
    if (query.sort) redirectParams.set('sort', query.sort);
    const queryString = redirectParams.toString();
    const canonicalUrl = `/${locale}/gallery/categories/${query.category}${queryString ? `?${queryString}` : ''}`;
    permanentRedirect(canonicalUrl);
  }
  
  // Load initial data
  const [categories, pins, itemsResult] = await Promise.all([
    getVisibleGalleryCategoriesCached(),
    getVisibleGalleryPinsCached('gallery'),
    getVisibleGalleryItemsPageCached({
      limit: 24,
      offset: 0,
      categorySlug: query.category,
      q: query.q,
      tag: query.tag,
      sort: (query.sort as GalleryListSort) || 'newest',
    }),
  ]);
  
  // Get liked status for initial items
  const cookieStore = await cookies();
  const anonId = cookieStore.get(ANON_ID_COOKIE_NAME)?.value;
  
  const pinItemIds = pins
    .map((p) => p.item?.id)
    .filter((id): id is string => Boolean(id));
  const allItemIds = Array.from(new Set([
    ...itemsResult.items.map((item) => item.id),
    ...pinItemIds,
  ]));

  const likedItemIds = await getLikedGalleryItemIds(anonId, allItemIds);
  
  // Add likedByMe to items
  const itemsWithLiked = itemsResult.items.map(item => ({
    ...item,
    likedByMe: likedItemIds.has(item.id),
  }));

  const pinsWithLiked = pins.map((pin) => {
    if (!pin.item) return pin;
    return {
      ...pin,
      item: {
        ...pin.item,
        likedByMe: likedItemIds.has(pin.item.id),
      },
    };
  });
  
  const title = '畫廊';
  
  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          {title}
        </h1>
        
        <GalleryMasonry
          initialItems={itemsWithLiked}
          initialTotal={itemsResult.total}
          initialQuery={{
            category: query.category,
            q: query.q,
            tag: query.tag,
            sort: (query.sort as GalleryListSort) || 'newest',
          }}
          categories={categories}
          pins={pinsWithLiked}
          locale={locale}
        />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
