/**
 * Gallery List Page
 *
 * Displays the main gallery grid at /gallery
 * with filtering, sorting, and infinite scroll support.
 *
 * @see doc/SPEC.md #gallery (Gallery routes + legacy redirects)
 * @see ARCHITECTURE.md §3.11 (v2 canonical path builders)
 */

import { notFound, permanentRedirect } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import {
  getVisibleGalleryCategoriesCached,
  getVisibleGalleryPinsCached,
  getVisibleGalleryItemsPageCached,
} from "@/lib/modules/gallery/cached";
import { isGalleryEnabledCached } from "@/lib/features/cached";
import { getMetadataAlternates } from "@/lib/seo/hreflang";
import { buildGalleryCategoryUrl } from "@/lib/seo/url-builders";
import { getLikedGalleryItemIds } from "@/lib/modules/gallery/liked-by-me-io";
import { ANON_ID_COOKIE_NAME } from "@/lib/utils/anon-id";
import GalleryMasonry from "@/components/gallery/GalleryMasonry";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { GalleryListSort } from "@/lib/types/gallery";

interface GalleryPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
    tag?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({
  params,
}: GalleryPageProps): Promise<Metadata> {
  const { locale } = await params;

  const enabled = await isGalleryEnabledCached();
  if (!enabled) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "gallery" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: getMetadataAlternates("/gallery", locale),
  };
}

export default async function GalleryPage({
  params,
  searchParams,
}: GalleryPageProps) {
  const { locale } = await params;
  const {
    category: categorySlug,
    q,
    tag,
    sort: sortParam,
  } = await searchParams;

  // Feature gate
  const enabled = await isGalleryEnabledCached();
  if (!enabled) {
    notFound();
  }

  // Legacy redirect: ?category= → /gallery/categories/[slug]
  if (categorySlug) {
    const canonicalUrl = buildGalleryCategoryUrl(locale, categorySlug, {
      q,
      tag,
      sort: sortParam,
    });
    permanentRedirect(canonicalUrl);
  }

  // Parse sort parameter
  const sort = (sortParam as GalleryListSort) || "newest";

  // Fetch data in parallel
  const [categories, pins, initialData] = await Promise.all([
    getVisibleGalleryCategoriesCached(),
    getVisibleGalleryPinsCached("gallery"),
    getVisibleGalleryItemsPageCached({
      limit: 24,
      offset: 0,
      q,
      tag,
      sort,
    }),
  ]);

  const { items: initialItems, total: initialTotal } = initialData;

  // Get liked status for initial items and pins (non-cached, user-specific)
  const cookieStore = await cookies();
  const anonId = cookieStore.get(ANON_ID_COOKIE_NAME)?.value;

  const allItemIds = [
    ...initialItems.map((item) => item.id),
    ...pins.filter((pin) => pin.item).map((pin) => pin.item!.id),
  ];

  const likedIds = await getLikedGalleryItemIds(anonId, allItemIds);

  // Merge likedByMe into items
  const itemsWithLiked = initialItems.map((item) => ({
    ...item,
    likedByMe: likedIds.has(item.id),
  }));

  // Merge likedByMe into pins
  const pinsWithLiked = pins.map((pin) => ({
    ...pin,
    item: pin.item
      ? { ...pin.item, likedByMe: likedIds.has(pin.item.id) }
      : undefined,
  }));

  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="pt-24 pb-16">
        <GalleryMasonry
          initialItems={itemsWithLiked}
          initialTotal={initialTotal}
          initialQuery={{ q, tag, sort }}
          categories={categories}
          pins={pinsWithLiked}
          locale={locale}
        />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
