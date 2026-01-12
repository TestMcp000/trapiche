/**
 * Admin Reports Page (Server Component)
 *
 * Server-first pattern: fetches initial data on the server
 * and delegates interactive UI to the client component.
 */

import { getRecentReports } from '@/lib/modules/reports/admin-io';
import { getAdminLocale, getAdminMessages } from '@/lib/i18n/admin-locale.server';
import ReportsClient from './ReportsClient';

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const adminLocale = await getAdminLocale();
  const adminMessages = await getAdminMessages(adminLocale);

  // Fetch initial data on the server
  const initialReports = await getRecentReports(50);

  return (
    <ReportsClient
      initialReports={initialReports}
      routeLocale={locale}
      adminLocale={adminLocale}
      adminMessages={adminMessages}
    />
  );
}
