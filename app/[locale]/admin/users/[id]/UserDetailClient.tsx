'use client';

/**
 * User Detail Client Component
 *
 * Orchestrates user detail page with tabs for profile/orders/comments/schedule.
 * Route-local client component for UI state management only.
 * Uses admin i18n for UI text via NextIntlClientProvider.
 *
 * @see uiux_refactor.md §6.1 - Admin Notes Preview
 */

import { useState } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { UserDetail } from '@/lib/types/user';
import UserInfoCard from './components/UserInfoCard';
import UserSectionTabs, { type UserSection } from './components/UserSectionTabs';
import UserAdminNotesCard from './components/UserAdminNotesCard';
import UserOrdersTable from './components/UserOrdersTable';
import UserCommentsList from './components/UserCommentsList';
import AppointmentCalendar from './components/AppointmentCalendar';

interface UserDetailClientProps {
  userDetail: UserDetail;
  routeLocale: string;
  adminLocale: string;
  notesPreview: boolean;
  adminNotesHtml?: string;
  isOwner: boolean;
  messages: AbstractIntlMessages;
}

function UserDetailClientContent({
  userDetail,
  routeLocale,
  adminLocale,
  notesPreview,
  adminNotesHtml,
  isOwner,
}: Omit<UserDetailClientProps, 'messages'>) {
  const [activeSection, setActiveSection] = useState<UserSection>('profile');
  const t = useTranslations('admin.users');

  const { directory, adminProfile, appointments, orders = [], comments = [] } = userDetail;

  // Get locale-specific markdown for admin notes (based on admin UI locale)
  const adminNotesMd =
    adminLocale === 'zh'
      ? adminProfile?.descriptionZhMd
      : adminProfile?.descriptionEnMd;

  // Get locale-specific tags (based on admin UI locale)
  const tags = adminLocale === 'zh' ? adminProfile?.tagsZh : adminProfile?.tagsEn;

  return (
    <div className="space-y-6">
      {/* User Info Header */}
      <UserInfoCard directory={directory} />

      {/* Section Tabs */}
      <UserSectionTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        ordersCount={orders.length}
        commentsCount={comments.length}
      />

      {/* Section Content */}
      <div className="mt-6">
        {activeSection === 'profile' && (
          <UserAdminNotesCard
            userId={directory.userId}
            routeLocale={routeLocale}
            markdown={adminNotesMd ?? null}
            html={adminNotesHtml}
            notesPreview={notesPreview}
            tags={tags ?? []}
            isOwner={isOwner}
            adminProfile={adminProfile}
          />
        )}

        {activeSection === 'orders' && (
          <UserOrdersTable orders={orders} routeLocale={routeLocale} />
        )}

        {activeSection === 'comments' && (
          <UserCommentsList comments={comments} />
        )}

        {activeSection === 'schedule' && (
          <AppointmentCalendar
            userId={directory.userId}
            appointments={appointments}
            routeLocale={routeLocale}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
}

export default function UserDetailClient({
  userDetail,
  routeLocale,
  adminLocale,
  notesPreview,
  adminNotesHtml,
  isOwner,
  messages,
}: UserDetailClientProps) {
  return (
    <NextIntlClientProvider messages={messages}>
      <UserDetailClientContent
        userDetail={userDetail}
        routeLocale={routeLocale}
        adminLocale={adminLocale}
        notesPreview={notesPreview}
        adminNotesHtml={adminNotesHtml}
        isOwner={isOwner}
      />
    </NextIntlClientProvider>
  );
}

