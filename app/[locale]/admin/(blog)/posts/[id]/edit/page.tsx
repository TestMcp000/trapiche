/**
 * Edit Post Page (Server Component)
 *
 * Located in (blog) route group for shared tabs layout.
 * Uses admin i18n via getTranslations.
 */

import { notFound } from "next/navigation";
import { getCategories, getPostById } from "@/lib/modules/blog/admin-io";
import {
  getAllBlogGroupsAdmin,
  getAllBlogTopicsAdmin,
  getAllBlogTagsAdmin,
} from "@/lib/modules/blog/taxonomy-admin-io";
import { getPostTaxonomySummary } from "@/lib/modules/blog/taxonomy-post-relations-io";
import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import PostForm from "../../components/PostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: routeLocale, id } = await params;

  // Get translations for admin blog namespace
  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.blog.postForm",
  });

  // Get messages for client component
  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  let post;
  let categories;
  let groups;
  let topics;
  let tags;
  let taxonomySummary;

  try {
    [post, categories, groups, topics, tags] = await Promise.all([
      getPostById(id),
      getCategories(),
      getAllBlogGroupsAdmin(),
      getAllBlogTopicsAdmin(),
      getAllBlogTagsAdmin(),
    ]);

    if (post) {
      taxonomySummary = await getPostTaxonomySummary(post.id);
    }
  } catch (error) {
    console.error("Error loading edit post page:", error);
    return (
      <div className="p-8 text-red-600">
        <h1>載入文章失敗</h1>
        <p>載入文章資料時發生錯誤，請稍後再試。</p>
        <pre className="mt-4 text-sm">{String(error)}</pre>
      </div>
    );
  }

  if (!post) {
    notFound();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("editPost")}
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
          initialData={{
            id: post.id,
            slug: post.slug,
            title_zh: post.title_zh || "",
            content_zh: post.content_zh || "",
            excerpt_zh: post.excerpt_zh || "",
            cover_image_url_zh:
              post.cover_image_url_zh || post.cover_image_url || "",
            cover_image_alt_zh: post.cover_image_alt_zh || "",
            category_id: post.category_id || "",
            visibility: post.visibility,
            reading_time_minutes: post.reading_time_minutes,
            group_id: taxonomySummary?.group_id || "",
            topic_ids: taxonomySummary?.topic_ids || [],
            tag_ids: taxonomySummary?.tag_ids || [],
          }}
        />
      </div>
    </div>
  );
}
