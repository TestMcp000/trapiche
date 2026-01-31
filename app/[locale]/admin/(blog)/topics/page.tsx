/**
 * Blog Topics Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Located in (blog) route group for shared tabs layout
 * - Uses lib/modules/blog/taxonomy-admin-io.ts for IO operations
 *
 * @see lib/modules/blog/taxonomy-admin-io.ts - Data access layer
 */

import {
  getAllBlogTopicsAdmin,
  getAllBlogGroupsAdmin,
} from "@/lib/modules/blog/taxonomy-admin-io";
import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import TopicsListClient from "./components/TopicsListClient";

export default async function TopicsPage({
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

  const [topics, groups] = await Promise.all([
    getAllBlogTopicsAdmin(),
    getAllBlogGroupsAdmin(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("topics.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("topics.subtitle")}
          </p>
        </div>
      </div>

      {/* Topics List */}
      <TopicsListClient
        initialTopics={topics}
        groups={groups}
        routeLocale={routeLocale}
        messages={adminMessages}
      />
    </div>
  );
}
