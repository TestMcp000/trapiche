/**
 * Admin Users Page (Server Component)
 *
 * Displays users list with server-side data fetching.
 * Supports tag filtering via searchParams.
 * Client component handles UI interactions.
 */
import { getUserListFiltered } from '@/lib/modules/user/users-admin-io';
import { getUserTagSummary } from '@/lib/modules/user/user-tags-admin-io';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import UsersClient from './UsersClient';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string }>;
}

export default async function UsersPage({ params, searchParams }: PageProps) {
  const { locale: routeLocale } = await params;
  const { tag } = await searchParams;

  // Get admin UI locale (independent from route locale)
  const adminLocale = await getAdminLocale();

  // Get messages for admin locale and extract admin namespace
  const allMessages = await getMessages({ locale: adminLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  // Server-side data fetching: users + available tags (in parallel)
  const [users, availableTags] = await Promise.all([
    getUserListFiltered({ tag }),
    getUserTagSummary(),
  ]);

  return (
    <UsersClient
      initialUsers={users}
      routeLocale={routeLocale}
      activeTag={tag}
      availableTags={availableTags}
      messages={adminMessages}
    />
  );
}

