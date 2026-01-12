/**
 * Admin History Page (Server Component)
 *
 * Displays content modification history with server-side data fetching.
 * Client component handles filtering and restore actions.
 */
import { getAllRecentHistory } from '@/lib/modules/content/io';
import { getAdminLocale, getAdminMessages } from '@/lib/i18n/admin-locale.server';
import HistoryClient from './HistoryClient';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; id?: string }>;
}

export default async function HistoryPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const adminLocale = await getAdminLocale();
  const adminMessages = await getAdminMessages(adminLocale);

  // Server-side data fetching
  const history = await getAllRecentHistory(100);

  return (
    <HistoryClient
      initialHistory={history}
      routeLocale={locale}
      adminLocale={adminLocale}
      adminMessages={adminMessages}
      query={query}
    />
  );
}
