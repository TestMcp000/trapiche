/**
 * Admin User Detail Page (Server Component)
 *
 * Displays user details with profile, orders, comments, and appointments.
 * Supports optional Markdown preview via ?notesPreview=1 query param.
 *
 * @see uiux_refactor.md §6.1 - Admin Notes Preview
 */

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin, isOwner } from '@/lib/modules/auth';
import { getUserById } from '@/lib/modules/user/users-admin-io';
import { getOrdersByUserId } from '@/lib/modules/user/user-orders-io';
import { getCommentsByUserId } from '@/lib/modules/user/user-comments-io';
import { markdownToHtml } from '@/lib/markdown/server';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import UserDetailClient from './UserDetailClient';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ notesPreview?: string }>;
}

export default async function UserDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { locale: routeLocale, id: userId } = await params;
  const { notesPreview: notesPreviewParam } = await searchParams;
  const notesPreview = notesPreviewParam === '1';

  const supabase = await createClient();

  // Permission gate: must be site admin to view
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    notFound();
  }

  // Check if current user is Owner (for edit permissions)
  const ownerRole = await isOwner(supabase);

  // Get admin UI locale (independent from route locale)
  const adminLocale = await getAdminLocale();

  // Get messages for admin locale and extract admin namespace
  const allMessages = await getMessages({ locale: adminLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  // Fetch user detail and cross-domain data in parallel
  const [userDetail, orders, comments] = await Promise.all([
    getUserById(userId),
    getOrdersByUserId(userId),
    getCommentsByUserId(userId),
  ]);

  if (!userDetail) {
    notFound();
  }

  // Merge cross-domain data into userDetail
  const enrichedUserDetail = {
    ...userDetail,
    orders,
    comments,
  };

  // Optional: Server-side Markdown to HTML conversion for preview mode
  // Note: For markdown preview, use adminLocale to determine which description to render
  let adminNotesHtml: string | undefined;
  if (notesPreview) {
    const markdown =
      adminLocale === 'zh'
        ? userDetail.adminProfile?.descriptionZhMd
        : userDetail.adminProfile?.descriptionEnMd;

    if (markdown) {
      adminNotesHtml = await markdownToHtml(markdown);
    }
  }

  return (
    <UserDetailClient
      userDetail={enrichedUserDetail}
      routeLocale={routeLocale}
      adminLocale={adminLocale}
      notesPreview={notesPreview}
      adminNotesHtml={adminNotesHtml}
      isOwner={ownerRole}
      messages={adminMessages}
    />
  );
}

