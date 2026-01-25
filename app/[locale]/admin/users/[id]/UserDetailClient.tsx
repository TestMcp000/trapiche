'use client';

/**
 * User Detail Client Component
 *
 * Orchestrates user detail page with tabs for profile/comments/schedule.
 * Route-local client component for UI state management only.
 * Uses admin i18n for UI text via NextIntlClientProvider.
 *
 * @see uiux_refactor.md §6.1 - Admin Notes Preview
 */

import { useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { UserDetail } from '@/lib/types/user';
import UserInfoCard from './components/UserInfoCard';
import UserSectionTabs, { type UserSection } from './components/UserSectionTabs';
import UserAdminNotesCard from './components/UserAdminNotesCard';
import UserCommentsList from './components/UserCommentsList';
import AppointmentCalendar from './components/AppointmentCalendar';

interface UserDetailClientProps {
  userDetail: UserDetail;
  routeLocale: string;
  notesPreview: boolean;
  adminNotesHtml?: string;
  isOwner: boolean;
  messages: AbstractIntlMessages;
}

function UserDetailClientContent({
  userDetail,
  routeLocale,
  notesPreview,
  adminNotesHtml,
  isOwner,
}: Omit<UserDetailClientProps, 'messages'>) {
  const [activeSection, setActiveSection] = useState<UserSection>('profile');

  const { directory, adminProfile, appointments, comments = [] } = userDetail;

  const adminNotesMd = adminProfile?.descriptionZhMd;

  const tags = adminProfile?.tagsZh;

  return (
    <div className="space-y-6">
      {/* User Info Header */}
      <UserInfoCard directory={directory} />

      {/* Section Tabs */}
      <UserSectionTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
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
  notesPreview,
  adminNotesHtml,
  isOwner,
  messages,
}: UserDetailClientProps) {
  return (
    <NextIntlClientProvider locale={routeLocale} messages={messages}>
      <UserDetailClientContent
        userDetail={userDetail}
        routeLocale={routeLocale}
        notesPreview={notesPreview}
        adminNotesHtml={adminNotesHtml}
        isOwner={isOwner}
      />
    </NextIntlClientProvider>
  );
}

