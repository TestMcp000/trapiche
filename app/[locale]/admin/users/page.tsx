/**
 * Admin Users Page (Server Component)
 *
 * Displays users list with server-side data fetching.
 * Supports:
 * - Tag filtering via ?tag=
 * - Search via ?q= (email/user_id text search or C123 short_id exact match)
 * - Pagination via ?page= and ?pageSize=
 *
 * Client component handles UI interactions.
 */
import { getUserListFilteredPaged } from '@/lib/modules/user/users-admin-io';
import { getUserTagSummary } from '@/lib/modules/user/user-tags-admin-io';
import { validateAdminUsersQuery } from '@/lib/validators/admin-users';
import { getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import UsersClient from './UsersClient';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tag?: string;
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function UsersPage({ params, searchParams }: PageProps) {
  const { locale: routeLocale } = await params;
  const rawParams = await searchParams;

  // Validate query parameters
  const validationResult = validateAdminUsersQuery(rawParams);
  const validatedParams = validationResult.data!;

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  // Server-side data fetching: users (paginated) + available tags (in parallel)
  const [usersResult, availableTags] = await Promise.all([
    getUserListFilteredPaged({
      tag: validatedParams.tag,
      q: validatedParams.q,
      qMode: validatedParams.qMode,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    }),
    getUserTagSummary(),
  ]);

  return (
    <UsersClient
      initialUsers={usersResult.users}
      routeLocale={routeLocale}
      activeTag={validatedParams.tag}
      activeQuery={validatedParams.q}
      availableTags={availableTags}
      messages={adminMessages}
      pagination={{
        page: validatedParams.page,
        pageSize: validatedParams.pageSize,
        total: usersResult.total,
      }}
    />
  );
}
