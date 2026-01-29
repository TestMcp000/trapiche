"use client";

/**
 * Blog Post Form Component (Single-language: zh-TW)
 *
 * Features:
 * - Markdown toolbar
 * - Auto-slug generation
 * - Cover image upload + alt text
 * - Reading time calculation
 * - Blog Taxonomy v2: Group selector + Topics multiselect + Tags input
 * - Uses admin i18n via useTranslations (wrapped in NextIntlClientProvider)
 *
 * @see ../actions.ts - Server actions (route-local)
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { Category, Visibility } from "@/lib/types/blog";
import type {
  BlogGroupWithCounts,
  BlogTopicWithCounts,
  BlogTagWithCounts,
} from "@/lib/types/blog-taxonomy";
import { calculateReadingTimeMinutes } from "@/lib/utils/reading-time";
import { generateSlug } from "@/lib/utils/slug";
import MarkdownToolbar from "@/components/admin/content/MarkdownToolbar";
import ImageUploader from "@/components/admin/common/ImageUploader";
import {
  createPostAction,
  updatePostAction,
  type PostActionInput,
} from "../actions";
import { ADMIN_ERROR_CODES, getErrorLabel } from "@/lib/types/action-result";

interface PostFormProps {
  routeLocale: string;
  categories: Category[];
  groups?: BlogGroupWithCounts[];
  topics?: BlogTopicWithCounts[];
  tags?: BlogTagWithCounts[];
  messages: AbstractIntlMessages;
  initialData?: {
    id?: string;
    title_zh: string;
    slug: string;
    content_zh: string;
    excerpt_zh: string;
    cover_image_url_zh: string;
    cover_image_alt_zh?: string;
    category_id: string;
    visibility: Visibility;
    reading_time_minutes: number | null;
    // Taxonomy v2
    group_id?: string;
    topic_ids?: string[];
    tag_ids?: string[];
  };
}

/** Wrapper that provides NextIntlClientProvider for admin translations */
export default function PostForm(props: PostFormProps) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <PostFormContent {...props} />
    </NextIntlClientProvider>
  );
}

function PostFormContent({
  routeLocale,
  categories,
  groups = [],
  topics = [],
  tags = [],
  initialData,
}: PostFormProps) {
  const router = useRouter();
  const t = useTranslations("admin.blog.postForm");
  const isEditing = !!initialData?.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState(() => ({
    title_zh: initialData?.title_zh || "",
    slug: initialData?.slug || "",
    content_zh: initialData?.content_zh || "",
    excerpt_zh: initialData?.excerpt_zh || "",
    cover_image_url_zh: initialData?.cover_image_url_zh || "",
    cover_image_alt_zh: initialData?.cover_image_alt_zh || "",
    category_id: initialData?.category_id || "",
    visibility: (initialData?.visibility || "draft") as Visibility,
    reading_time_minutes: (initialData?.reading_time_minutes ?? null) as
      | number
      | null,
    // Taxonomy v2
    group_id: initialData?.group_id || "",
    topic_ids: initialData?.topic_ids || ([] as string[]),
    tag_ids: initialData?.tag_ids || ([] as string[]),
  }));

  // Filter topics by selected group
  const filteredTopics = useMemo(() => {
    if (!formData.group_id) return topics;
    return topics.filter((topic) => topic.group_id === formData.group_id);
  }, [topics, formData.group_id]);

  // When group changes, clear selected topics that don't belong to new group
  useEffect(() => {
    if (formData.group_id) {
      const validTopicIds = filteredTopics.map((topic) => topic.id);
      const filteredTopicIds = formData.topic_ids.filter((id) =>
        validTopicIds.includes(id),
      );
      if (filteredTopicIds.length !== formData.topic_ids.length) {
        setFormData((prev) => ({ ...prev, topic_ids: filteredTopicIds }));
      }
    }
  }, [formData.group_id, filteredTopics, formData.topic_ids]);

  const handleToolbarInsert = (before: string, after: string = "") => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content_zh || "";

    const newText =
      text.substring(0, start) +
      before +
      text.substring(start, end) +
      after +
      text.substring(end);

    setFormData((prev) => ({ ...prev, content_zh: newText }));

    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  // Auto-generate slug from Chinese title
  useEffect(() => {
    if (isEditing || formData.slug) return;
    if (!formData.title_zh) return;

    const slug = generateSlug(formData.title_zh);
    setFormData((prev) => ({ ...prev, slug }));
  }, [formData.title_zh, formData.slug, isEditing]);

  const validateForm = (): string | null => {
    const hasChinese = formData.title_zh?.trim() && formData.content_zh?.trim();
    if (!hasChinese) {
      return t("validation.requireContent");
    }

    if (!formData.slug?.trim()) {
      return t("validation.requireSlug");
    }

    const hasCoverImage = !!formData.cover_image_url_zh?.trim();
    const hasAltText = !!formData.cover_image_alt_zh?.trim();
    if (hasCoverImage && !hasAltText) {
      return t("validation.requireAltText");
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const titleZh = formData.title_zh.trim();
      const contentZh = formData.content_zh.trim();
      const excerptZh = formData.excerpt_zh.trim();
      const coverUrlZh = formData.cover_image_url_zh.trim();
      const coverAltZh = formData.cover_image_alt_zh.trim();

      const input: PostActionInput = {
        // Keep title_en mirrored for legacy fields (single-language site still stores zh in DB)
        title_en: titleZh || null,
        title_zh: titleZh || null,
        slug: formData.slug.trim(),
        content_en: null,
        content_zh: contentZh || null,
        excerpt_en: null,
        excerpt_zh: excerptZh ? excerptZh : null,
        cover_image_url_en: null,
        cover_image_url_zh: coverUrlZh ? coverUrlZh : null,
        cover_image_alt_en: null,
        cover_image_alt_zh: coverAltZh ? coverAltZh : null,
        category_id: formData.category_id || null,
        visibility: formData.visibility,
        reading_time_minutes: formData.reading_time_minutes,
        // Taxonomy v2
        group_id: formData.group_id || null,
        topic_ids: formData.topic_ids,
        tag_ids: formData.tag_ids,
      };

      const result = isEditing
        ? await updatePostAction(initialData!.id!, input, routeLocale)
        : await createPostAction(input, routeLocale);

      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }

      router.push(`/${routeLocale}/admin/posts`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(getErrorLabel(ADMIN_ERROR_CODES.INTERNAL_ERROR, routeLocale));
    } finally {
      setLoading(false);
    }
  };

  const labels = {
    titleLabel: t("zh.titleLabel"),
    excerptLabel: t("zh.excerptLabel"),
    contentLabel: t("zh.contentLabel"),
    titlePlaceholder: t("zh.titlePlaceholder"),
    excerptPlaceholder: t("zh.excerptPlaceholder"),
    contentPlaceholder: t("zh.contentPlaceholder"),
  };

  // Toggle topic selection
  const toggleTopic = (topicId: string) => {
    setFormData((prev) => ({
      ...prev,
      topic_ids: prev.topic_ids.includes(topicId)
        ? prev.topic_ids.filter((id) => id !== topicId)
        : [...prev.topic_ids, topicId],
    }));
  };

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Hint */}
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("hint")}</p>

      {/* Content */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {labels.titleLabel}
          </label>
          <input
            type="text"
            value={formData.title_zh}
            onChange={(e) =>
              setFormData({ ...formData, title_zh: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={labels.titlePlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {labels.excerptLabel}
          </label>
          <textarea
            value={formData.excerpt_zh}
            onChange={(e) =>
              setFormData({ ...formData, excerpt_zh: e.target.value })
            }
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={labels.excerptPlaceholder}
          />
          <p
            className={`mt-1 text-xs ${formData.excerpt_zh.length > 3000 ? "text-red-500" : "text-gray-500"}`}>
            {formData.excerpt_zh.length}/3000 {t("characters")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {labels.contentLabel}
          </label>
          <MarkdownToolbar
            onInsert={(before, after) => handleToolbarInsert(before, after)}
            className="mb-[-1px] rounded-t-lg z-10 relative border-b-0"
          />
          <textarea
            ref={contentRef}
            value={formData.content_zh}
            onChange={(e) =>
              setFormData({ ...formData, content_zh: e.target.value })
            }
            rows={20}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-b-lg rounded-t-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder={labels.contentPlaceholder}
          />
          <p className="mt-2 text-xs text-gray-500">{t("zh.markdownHint")}</p>
        </div>

        {/* Cover Image */}
        <ImageUploader
          value={formData.cover_image_url_zh}
          onChange={(url) =>
            setFormData({ ...formData, cover_image_url_zh: url })
          }
          label={t("zh.coverImage")}
        />

        {/* Cover Image Alt Text */}
        {formData.cover_image_url_zh && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("zh.coverImageAlt")}
            </label>
            <input
              type="text"
              value={formData.cover_image_alt_zh}
              onChange={(e) =>
                setFormData({ ...formData, cover_image_alt_zh: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("zh.coverImageAltPlaceholder")}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("zh.coverImageAltHint")}
            </p>
          </div>
        )}
      </div>

      {/* Taxonomy v2 Section */}
      {(groups.length > 0 || topics.length > 0 || tags.length > 0) && (
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("taxonomy.title")}
          </h3>

          {/* Group Selector */}
          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("taxonomy.group")}
              </label>
              <select
                value={formData.group_id}
                onChange={(e) =>
                  setFormData({ ...formData, group_id: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">{t("taxonomy.noGroup")}</option>
                {groups
                  .filter((g) => g.is_visible)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name_zh}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {t("taxonomy.groupHint")}
              </p>
            </div>
          )}

          {/* Topics Multi-select */}
          {filteredTopics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("taxonomy.topics")}
                {formData.group_id && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({groups.find((g) => g.id === formData.group_id)?.name_zh})
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[60px]">
                {filteredTopics
                  .filter((topic) => topic.is_visible)
                  .map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        formData.topic_ids.includes(topic.id)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}>
                      {topic.name_zh}
                      {formData.topic_ids.includes(topic.id) && (
                        <span className="ml-1">✓</span>
                      )}
                    </button>
                  ))}
                {filteredTopics.filter((topic) => topic.is_visible).length ===
                  0 && (
                  <p className="text-sm text-gray-400">
                    {t("taxonomy.noTopicsInGroup")}
                  </p>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t("taxonomy.topicsHint")} ·{" "}
                {t("taxonomy.selectedCount", {
                  count: formData.topic_ids.length,
                })}
              </p>
            </div>
          )}

          {/* Tags Multi-select */}
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("taxonomy.tags")}
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[60px] max-h-[200px] overflow-y-auto">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      formData.tag_ids.includes(tag.id)
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}>
                    {tag.name_zh}
                    {formData.tag_ids.includes(tag.id) && (
                      <span className="ml-1">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t("taxonomy.tagsHint")} ·{" "}
                {t("taxonomy.selectedCount", {
                  count: formData.tag_ids.length,
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Meta Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("slug")} *
          </label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t("slugPlaceholder")}
          />
          <p className="mt-1 text-xs text-gray-500">{t("slugHint")}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("category")}
          </label>
          <select
            value={formData.category_id}
            onChange={(e) =>
              setFormData({ ...formData, category_id: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">{t("noCategory")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_zh}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("visibilityLabel")}
          </label>
          <select
            value={formData.visibility}
            onChange={(e) =>
              setFormData({
                ...formData,
                visibility: e.target.value as Visibility,
              })
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="draft">草稿</option>
            <option value="private">私人</option>
            <option value="public">公開</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("readingTime")}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="60"
              value={formData.reading_time_minutes ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reading_time_minutes: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("readingTimePlaceholder")}
            />
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  reading_time_minutes: calculateReadingTimeMinutes(
                    null,
                    formData.content_zh,
                  ),
                })
              }
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm whitespace-nowrap">
              {t("calculate")}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">{t("readingTimeHint")}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {loading
            ? t("saving")
            : isEditing
              ? t("updatePost")
              : t("createPost")}
        </button>
      </div>
    </form>
  );
}
