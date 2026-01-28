/**
 * Edit Event Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Uses lib/modules/events/admin-io.ts for IO operations
 */

import { notFound } from "next/navigation";
import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import {
  getAllEventTypesAdmin,
  getAllEventTagsAdmin,
  getEventByIdAdmin,
  getEventTagIdsAdmin,
} from "../../actions";
import EventFormClient from "../../components/EventFormClient";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: routeLocale, id } = await params;

  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.events",
  });

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const [event, eventTypes, eventTags, selectedTagIds] = await Promise.all([
    getEventByIdAdmin(id),
    getAllEventTypesAdmin(),
    getAllEventTagsAdmin(),
    getEventTagIdsAdmin(id),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("form.editEvent")}
        </h1>
      </div>

      {/* Form */}
      <EventFormClient
        event={event}
        eventTypes={eventTypes}
        eventTags={eventTags}
        selectedTagIds={selectedTagIds}
        messages={adminMessages}
        routeLocale={routeLocale}
      />
    </div>
  );
}
