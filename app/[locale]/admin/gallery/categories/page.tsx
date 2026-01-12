/**
 * Admin Gallery Categories Page (Server Component)
 *
 * Server-first pattern: fetches initial data on the server
 * and delegates interactive UI to the client component.
 */

import { getGalleryCategoriesWithCounts } from '@/lib/modules/gallery/admin-io';
import GalleryCategoriesClient from './GalleryCategoriesClient';

export default async function GalleryCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Fetch initial data on the server
  const initialCategories = await getGalleryCategoriesWithCounts();

  return <GalleryCategoriesClient initialCategories={initialCategories} locale={locale} />;
}
