/**
 * Gallery Category Page (v2 Canonical)
 * 
 * Displays gallery items filtered by category at /gallery/categories/[slug]
 * with masonry layout and infinite scroll.
 */

import { notFound } from 'next/navigation';
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
import type { GalleryListSort, GalleryCategory } from '@/lib/types/gallery';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    q?: string;
    tag?: string;
    sort?: string;
  }>;
}

async function getCategoryBySlug(slug: string, categories: GalleryCategory[]): Promise<GalleryCategory | undefined> {
  return categories.find(c => c.slug === slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug: categorySlug } = await params;
  
  // Check if gallery is enabled
  const isEnabled = await isGalleryEnabledCached();
  if (!isEnabled) {
    return {};
  }
  
  const categories = await getVisibleGalleryCategoriesCached();
  const category = await getCategoryBySlug(categorySlug, categories);
  
  if (!category) {
    return {};
  }
  
  const title = category.name_zh;
  const description = `瀏覽「${category.name_zh}」分類的作品`;
  
  // v2 canonical URL
  return {
    title: `${title}｜畫廊`,
    description,
    alternates: getMetadataAlternates(`/gallery/categories/${categorySlug}`, locale),
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function GalleryCategoryPage({ params, searchParams }: PageProps) {
  const { locale, slug: categorySlug } = await params;
  const query = await searchParams;
  
  // Check if gallery is enabled
  const isEnabled = await isGalleryEnabledCached();
  if (!isEnabled) {
    notFound();
  }
  
  // Load categories and find the current one
  const categories = await getVisibleGalleryCategoriesCached();
  const category = await getCategoryBySlug(categorySlug, categories);
  
  // If category doesn't exist or isn't visible, return 404
  if (!category) {
    notFound();
  }
  
  // Load initial data
  const [pins, itemsResult] = await Promise.all([
    getVisibleGalleryPinsCached('gallery'),
    getVisibleGalleryItemsPageCached({
      limit: 24,
      offset: 0,
      categorySlug: categorySlug,
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
  
  const title = category.name_zh;
  
  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Breadcrumb (v2 canonical) */}
        <nav className="mb-4 text-sm text-secondary">
          <a href={`/${locale}/gallery`} className="hover:text-primary transition-colors">
            畫廊
          </a>
          <span className="mx-2">/</span>
          <span className="text-foreground">{title}</span>
        </nav>
        
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          {title}
        </h1>
        
        <GalleryMasonry
          initialItems={itemsWithLiked}
          initialTotal={itemsResult.total}
          initialQuery={{
            category: categorySlug,
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
