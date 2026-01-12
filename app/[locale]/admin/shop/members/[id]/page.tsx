/**
 * Shop Member Detail Page - Redirect to Admin Users
 *
 * This page redirects to the unified /admin/users/[id] page.
 * Keeping this route prevents 404s from old bookmarks/links.
 *
 * PR-6: Users becomes the unified entry point for user details.
 */

import { redirect } from 'next/navigation';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  // Redirect to unified users page
  redirect(`/${locale}/admin/users/${id}`);
}
