/**
 * Blog Categories Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Client component for interactive UI
 * - Located in (blog) route group for shared tabs layout
 * - Uses admin i18n via getTranslations
 *
 * @see ./CategoriesClient.tsx - Interactive UI (route-local)
 * @see lib/blog/admin-io.ts - Data access layer
 */

import { getCategoriesWithPostCount } from '@/lib/modules/blog/admin-io';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import CategoriesClient from './CategoriesClient';

interface CategoriesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { locale: routeLocale } = await params;
  
  // Get admin UI locale and messages
  const adminLocale = await getAdminLocale();
  const allMessages = await getMessages({ locale: adminLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const initialCategories = await getCategoriesWithPostCount();

  return (
    <CategoriesClient 
      initialCategories={initialCategories} 
      routeLocale={routeLocale}
      messages={adminMessages}
    />
  );
}

