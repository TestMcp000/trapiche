"use client";

/**
 * Blog Tags List Client Component
 *
 * Interactive list with create/edit/delete/merge functionality.
 * Tags are free-form labels that can be applied to posts.
 *
 * @see ../actions.ts - Server actions
 */

import { useState, useMemo } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { BlogTagWithCounts } from "@/lib/types/blog-taxonomy";
import { getErrorLabel } from "@/lib/types/action-result";
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
  mergeTagsAction,
  type TagActionInput,
} from "../actions";

interface TagsListClientProps {
  initialTags: BlogTagWithCounts[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

export default function TagsListClient(props: TagsListClientProps) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <TagsListContent {...props} />
    </NextIntlClientProvider>
  );
}

function TagsListContent({ initialTags, routeLocale }: TagsListClientProps) {
  const t = useTranslations("admin.blog.taxonomy");

  const [tags, setTags] = useState(initialTags);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Edit/Create modal state
  const [editingTag, setEditingTag] = useState<BlogTagWithCounts | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<TagActionInput>({
    name_zh: "",
    slug: "",
  });

  // Merge state
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);

  // Filtered tags
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter(
      (t) =>
        t.name_zh.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query),
    );
  }, [tags, searchQuery]);

  // ==========================================================================
  // Form handlers
  // ==========================================================================

  const openCreateModal = () => {
    setFormData({ name_zh: "", slug: "" });
    setIsCreating(true);
    setEditingTag(null);
    setError(null);
  };

  const openEditModal = (tag: BlogTagWithCounts) => {
    setFormData({
      name_zh: tag.name_zh,
      slug: tag.slug,
    });
    setEditingTag(tag);
    setIsCreating(false);
    setError(null);
  };

  const closeModal = () => {
    setEditingTag(null);
    setIsCreating(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreating) {
        const result = await createTagAction(formData, routeLocale);
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setTags((prev) => [...prev, { ...result.data!, post_count: 0 }]);
        }
      } else if (editingTag) {
        const result = await updateTagAction(
          editingTag.id,
          formData,
          routeLocale,
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setTags((prev) =>
            prev.map((t) =>
              t.id === editingTag.id
                ? { ...result.data!, post_count: t.post_count }
                : t,
            ),
          );
        }
      }
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Delete handler
  // ==========================================================================

  const handleDelete = async (tag: BlogTagWithCounts) => {
    if (!confirm(t("tags.confirmDelete", { name: tag.name_zh }))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await deleteTagAction(tag.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Merge handlers
  // ==========================================================================

  const toggleMergeSelection = (tagId: string) => {
    setSelectedForMerge((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const startMerge = () => {
    if (selectedForMerge.length < 2) {
      setError(t("tags.mergeNeedAtLeastTwo"));
      return;
    }
    setIsMerging(true);
    setMergeTargetId(selectedForMerge[0]); // Default to first selected
    setError(null);
  };

  const cancelMerge = () => {
    setIsMerging(false);
    setSelectedForMerge([]);
    setMergeTargetId("");
    setError(null);
  };

  const handleMerge = async () => {
    if (!mergeTargetId) {
      setError(t("tags.mergeSelectTarget"));
      return;
    }

    const sourceIds = selectedForMerge.filter((id) => id !== mergeTargetId);
    if (sourceIds.length === 0) {
      setError(t("tags.mergeSelectTarget"));
      return;
    }

    const targetTag = tags.find((t) => t.id === mergeTargetId);
    if (
      !confirm(
        t("tags.confirmMerge", {
          target: targetTag?.name_zh ?? "",
          count: sourceIds.length,
        }),
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await mergeTagsAction(
        sourceIds,
        mergeTargetId,
        routeLocale,
      );
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }

      // Update local state: remove merged tags, update target count
      setTags((prev) => {
        const mergedPostCount = sourceIds.reduce((sum, id) => {
          const tag = prev.find((t) => t.id === id);
          return sum + (tag?.post_count ?? 0);
        }, 0);

        return prev
          .filter((t) => !sourceIds.includes(t.id))
          .map((t) =>
            t.id === mergeTargetId
              ? { ...t, post_count: t.post_count + mergedPostCount }
              : t,
          );
      });

      cancelMerge();
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Auto-generate slug from name
  // ==========================================================================

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const newData = { ...prev, name_zh: name };
      if (
        isCreating &&
        (!prev.slug || prev.slug === generateSlug(prev.name_zh))
      ) {
        newData.slug = generateSlug(name);
      }
      return newData;
    });
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}_-]/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div>
      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search and Actions */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("tags.searchPlaceholder")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("tags.add")}
        </button>

        {selectedForMerge.length >= 2 && !isMerging && (
          <button
            onClick={startMerge}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            {t("tags.merge")} ({selectedForMerge.length})
          </button>
        )}

        {selectedForMerge.length > 0 && !isMerging && (
          <button
            onClick={() => setSelectedForMerge([])}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            {t("tags.clearSelection")}
          </button>
        )}
      </div>

      {/* Merge Panel */}
      {isMerging && (
        <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <h3 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
            {t("tags.mergeTitle")}
          </h3>
          <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
            {t("tags.mergeDescription")}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="px-4 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-800">
              {selectedForMerge.map((id) => {
                const tag = tags.find((t) => t.id === id);
                return (
                  <option key={id} value={id}>
                    {tag?.name_zh} ({tag?.post_count ?? 0}{" "}
                    {t("tags.postsCount")})
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleMerge}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
              {loading ? t("common.saving") : t("tags.confirmMergeButton")}
            </button>
            <button
              onClick={cancelMerge}
              className="px-4 py-2 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Tags Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        {filteredTags.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                  selectedForMerge.includes(tag.id)
                    ? "bg-orange-100 border-orange-400 dark:bg-orange-900/30 dark:border-orange-600"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}>
                {/* Merge checkbox */}
                <input
                  type="checkbox"
                  checked={selectedForMerge.includes(tag.id)}
                  onChange={() => toggleMergeSelection(tag.id)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />

                {/* Tag name */}
                <span className="text-gray-900 dark:text-white font-medium">
                  {tag.name_zh}
                </span>

                {/* Post count badge */}
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                  {tag.post_count}
                </span>

                {/* Actions (on hover) */}
                <div className="hidden group-hover:flex items-center gap-1 ml-1">
                  <button
                    onClick={() => openEditModal(tag)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title={t("common.edit")}>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    disabled={loading}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title={t("common.delete")}>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>{searchQuery ? t("tags.noSearchResults") : t("tags.noTags")}</p>
            {!searchQuery && (
              <p className="text-sm mt-2">{t("tags.noTagsDesc")}</p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {t("tags.totalCount", { count: tags.length })}
        {selectedForMerge.length > 0 &&
          ` · ${t("tags.selectedCount", { count: selectedForMerge.length })}`}
      </p>

      {/* Create/Edit Modal */}
      {(isCreating || editingTag) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {isCreating ? t("tags.createTitle") : t("tags.editTitle")}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("tags.nameLabel")} *
                </label>
                <input
                  type="text"
                  value={formData.name_zh}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={t("tags.namePlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("tags.slugLabel")} *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder={t("tags.slugPlaceholder")}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("tags.slugHint")}
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading
                    ? t("common.saving")
                    : isCreating
                      ? t("common.create")
                      : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
