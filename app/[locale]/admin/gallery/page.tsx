/**
 * Admin Gallery Items Page (Server Component)
 *
 * Displays gallery items with server-side data fetching.
 * Client component handles CRUD operations via server actions.
 */
import { getAllGalleryItemsForAdmin, getAllGalleryCategories } from '@/lib/modules/gallery/admin-io';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import GalleryClient from './GalleryClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function GalleryItemsPage({ params }: PageProps) {
  const { locale: routeLocale } = await params;

  // Get admin UI locale (independent from route locale)
  const adminLocale = await getAdminLocale();

  // Get messages for admin locale and extract admin namespace
  const allMessages = await getMessages({ locale: adminLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  // Server-side data fetching
  const [items, categories] = await Promise.all([
    getAllGalleryItemsForAdmin(),
    getAllGalleryCategories(),
  ]);

  return (
    <GalleryClient
      initialItems={items}
      initialCategories={categories}
      routeLocale={routeLocale}
      messages={adminMessages}
    />
  );
}

