/**
 * Admin Gallery Featured Pins Page (Server Component)
 * 
 * Server-first pattern: fetches initial data on the server
 * and delegates interactive UI to the client component.
 */

import { getFeaturedPinsBySurface, getGalleryFeaturedLimits } from '@/lib/modules/gallery/admin-io';
import GalleryFeaturedClient from './GalleryFeaturedClient';

export default async function GalleryFeaturedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Fetch initial data on the server
  const [pinsHome, pinsGallery, limits] = await Promise.all([
    getFeaturedPinsBySurface('home'),
    getFeaturedPinsBySurface('gallery'),
    getGalleryFeaturedLimits(),
  ]);

  return (
    <GalleryFeaturedClient
      initialPins={{
        home: pinsHome,
        gallery: pinsGallery,
      }}
      limits={limits}
      locale={locale}
    />
  );
}
