/**
 * Blog Tags Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Located in (blog) route group for shared tabs layout
 * - Uses lib/modules/blog/taxonomy-admin-io.ts for IO operations
 *
 * @see lib/modules/blog/taxonomy-admin-io.ts - Data access layer
 */

import { getAllBlogTagsAdmin } from "@/lib/modules/blog/taxonomy-admin-io";
import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import TagsListClient from "./components/TagsListClient";

export default async function TagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;

  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.taxonomy",
  });

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const tags = await getAllBlogTagsAdmin();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("tags.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("tags.subtitle")}
          </p>
        </div>
      </div>

      {/* Tags List */}
      <TagsListClient
        initialTags={tags}
        routeLocale={routeLocale}
        messages={adminMessages}
      />
    </div>
  );
}
