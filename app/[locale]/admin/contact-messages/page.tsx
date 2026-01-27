/**
 * Contact Messages Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Uses lib/modules/contact/admin-io.ts for IO operations
 *
 * @see lib/modules/contact/admin-io.ts - Data access layer
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { getContactMessagesAdmin, getUnreadCountAction } from "./actions";
import ContactMessagesListClient from "./components/ContactMessagesListClient";

export default async function ContactMessagesAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ archived?: string }>;
}) {
  const { locale: routeLocale } = await params;
  const { archived } = await searchParams;
  const showArchived = archived === "true";

  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.contactMessages",
  });

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const [{ data: messages, total }, unreadCount] = await Promise.all([
    getContactMessagesAdmin({ showArchived }),
    getUnreadCountAction(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { count: total, unread: unreadCount })}
          </p>
        </div>
      </div>

      {/* Messages List */}
      <ContactMessagesListClient
        initialMessages={messages}
        totalCount={total}
        unreadCount={unreadCount}
        showArchived={showArchived}
        routeLocale={routeLocale}
        messages={adminMessages}
      />
    </div>
  );
}
