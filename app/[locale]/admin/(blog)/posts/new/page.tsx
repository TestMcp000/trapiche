/**
 * New Post Page (Server Component)
 *
 * Located in (blog) route group for shared tabs layout.
 * Uses admin i18n via getTranslations.
 */

import { getCategories } from "@/lib/modules/blog/admin-io";
import {
  getAllBlogGroupsAdmin,
  getAllBlogTopicsAdmin,
  getAllBlogTagsAdmin,
} from "@/lib/modules/blog/taxonomy-admin-io";
import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import PostForm from "../components/PostForm";

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;

  // Get translations for admin blog namespace
  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.blog.postForm",
  });

  // Get messages for client component
  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const [categories, groups, topics, tags] = await Promise.all([
    getCategories(),
    getAllBlogGroupsAdmin(),
    getAllBlogTopicsAdmin(),
    getAllBlogTagsAdmin(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("newPost")}
        </h1>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <PostForm
          routeLocale={routeLocale}
          categories={categories}
          groups={groups}
          topics={topics}
          tags={tags}
          messages={adminMessages}
        />
      </div>
    </div>
  );
}
