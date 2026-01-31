/**
 * Blog Groups Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Located in (blog) route group for shared tabs layout
 * - Uses lib/modules/blog/taxonomy-admin-io.ts for IO operations
 *
 * @see lib/modules/blog/taxonomy-admin-io.ts - Data access layer
 */

import { getAllBlogGroupsAdmin } from "@/lib/modules/blog/taxonomy-admin-io";
import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import GroupsListClient from "./components/GroupsListClient";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;

  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.blog.taxonomy",
  });

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const groups = await getAllBlogGroupsAdmin();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("groups.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("groups.subtitle")}
          </p>
        </div>
      </div>

      {/* Groups List */}
      <GroupsListClient
        initialGroups={groups}
        routeLocale={routeLocale}
        messages={adminMessages}
      />
    </div>
  );
}
