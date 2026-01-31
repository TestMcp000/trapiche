/**
 * Events Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Uses lib/modules/events/admin-io.ts for IO operations
 *
 * @see lib/modules/events/admin-io.ts - Data access layer
 */

import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { getAllEventsAdmin, getAllEventTypesAdmin, getAllEventTagsAdmin } from "./actions";
import EventsListClient from "./components/EventsListClient";

export default async function EventsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;

  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.blog.events",
  });

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const [events, eventTypes, eventTags] = await Promise.all([
    getAllEventsAdmin(),
    getAllEventTypesAdmin(),
    getAllEventTagsAdmin(),
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
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Events List */}
      <EventsListClient
        initialEvents={events}
        eventTypes={eventTypes}
        eventTags={eventTags}
        routeLocale={routeLocale}
        messages={adminMessages}
      />
    </div>
  );
}
