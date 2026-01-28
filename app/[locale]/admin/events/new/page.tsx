/**
 * New Event Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Uses lib/modules/events/admin-io.ts for IO operations
 */

import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { getAllEventTypesAdmin, getAllEventTagsAdmin } from "../actions";
import EventFormClient from "../components/EventFormClient";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;

  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.events",
  });

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const [eventTypes, eventTags] = await Promise.all([
    getAllEventTypesAdmin(),
    getAllEventTagsAdmin(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("form.newEvent")}
        </h1>
      </div>

      {/* Form */}
      <EventFormClient
        eventTypes={eventTypes}
        eventTags={eventTags}
        messages={adminMessages}
        routeLocale={routeLocale}
      />
    </div>
  );
}
