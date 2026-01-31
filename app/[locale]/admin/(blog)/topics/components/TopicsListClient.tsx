"use client";

/**
 * Blog Topics List Client Component
 *
 * Interactive list with create/edit/delete/reorder functionality.
 * Topics are organized by groups.
 *
 * @see ../actions.ts - Server actions
 */

import { useState, useMemo } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type {
  BlogTopicWithCounts,
  BlogGroupWithCounts,
} from "@/lib/types/blog-taxonomy";
import { getErrorLabel } from "@/lib/types/action-result";
import {
  createTopicAction,
  updateTopicAction,
  deleteTopicAction,
  reorderTopicsAction,
  toggleTopicVisibilityAction,
  toggleTopicShowInNavAction,
  type TopicActionInput,
} from "../actions";

interface TopicsListClientProps {
  initialTopics: BlogTopicWithCounts[];
  groups: BlogGroupWithCounts[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

export default function TopicsListClient(props: TopicsListClientProps) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <TopicsListContent {...props} />
    </NextIntlClientProvider>
  );
}

function TopicsListContent({
  initialTopics,
  groups,
  routeLocale,
}: TopicsListClientProps) {
  const t = useTranslations("admin.blog.taxonomy");

  const [topics, setTopics] = useState(initialTopics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterGroupId, setFilterGroupId] = useState<string>("");

  // Edit/Create modal state
  const [editingTopic, setEditingTopic] = useState<BlogTopicWithCounts | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<TopicActionInput>({
    group_id: "",
    name_zh: "",
    slug: "",
    is_visible: true,
  });

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Group topics by group_id for display
  const topicsByGroup = useMemo(() => {
    const map = new Map<string, BlogTopicWithCounts[]>();
    for (const topic of topics) {
      const existing = map.get(topic.group_id) ?? [];
      existing.push(topic);
      map.set(topic.group_id, existing);
    }
    return map;
  }, [topics]);

  // Filtered topics
  const filteredTopics = useMemo(() => {
    if (!filterGroupId) return topics;
    return topics.filter((t) => t.group_id === filterGroupId);
  }, [topics, filterGroupId]);

  // Get group name by ID
  const getGroupName = (groupId: string): string => {
    return (
      groups.find((g) => g.id === groupId)?.name_zh ?? t("topics.unknownGroup")
    );
  };

  // ==========================================================================
  // Form handlers
  // ==========================================================================

  const openCreateModal = () => {
    setFormData({
      group_id: filterGroupId || (groups[0]?.id ?? ""),
      name_zh: "",
      slug: "",
      is_visible: true,
    });
    setIsCreating(true);
    setEditingTopic(null);
    setError(null);
  };

  const openEditModal = (topic: BlogTopicWithCounts) => {
    setFormData({
      group_id: topic.group_id,
      name_zh: topic.name_zh,
      slug: topic.slug,
      is_visible: topic.is_visible,
    });
    setEditingTopic(topic);
    setIsCreating(false);
    setError(null);
  };

  const closeModal = () => {
    setEditingTopic(null);
    setIsCreating(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreating) {
        const result = await createTopicAction(formData, routeLocale);
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setTopics((prev) => [...prev, { ...result.data!, post_count: 0 }]);
        }
      } else if (editingTopic) {
        const result = await updateTopicAction(
          editingTopic.id,
          formData,
          routeLocale,
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setTopics((prev) =>
            prev.map((t) =>
              t.id === editingTopic.id
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

  const handleDelete = async (topic: BlogTopicWithCounts) => {
    if (topic.post_count > 0) {
      setError(t("topics.cannotDeleteWithPosts"));
      return;
    }

    if (!confirm(t("topics.confirmDelete", { name: topic.name_zh }))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await deleteTopicAction(topic.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Visibility toggle
  // ==========================================================================

  const handleToggleVisibility = async (topic: BlogTopicWithCounts) => {
    setLoading(true);
    setError(null);

    try {
      const result = await toggleTopicVisibilityAction(
        topic.id,
        !topic.is_visible,
        routeLocale,
      );
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      if (result.data) {
        setTopics((prev) =>
          prev.map((t) =>
            t.id === topic.id
              ? { ...t, is_visible: result.data!.is_visible }
              : t,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Hamburger nav toggle
  // ==========================================================================

  const handleToggleShowInNav = async (topic: BlogTopicWithCounts) => {
    setLoading(true);
    setError(null);

    try {
      const result = await toggleTopicShowInNavAction(
        topic.id,
        !topic.show_in_nav,
        routeLocale,
      );
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      if (result.data) {
        setTopics((prev) =>
          prev.map((t) =>
            t.id === topic.id
              ? { ...t, show_in_nav: result.data!.show_in_nav }
              : t,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Drag and drop reorder (within same group)
  // ==========================================================================

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedTopic = topics.find((t) => t.id === draggedId);
    const targetTopic = topics.find((t) => t.id === targetId);

    // Only allow reorder within same group
    if (
      !draggedTopic ||
      !targetTopic ||
      draggedTopic.group_id !== targetTopic.group_id
    ) {
      setDraggedId(null);
      return;
    }

    const groupTopics = topicsByGroup.get(draggedTopic.group_id) ?? [];
    const draggedIndex = groupTopics.findIndex((t) => t.id === draggedId);
    const targetIndex = groupTopics.findIndex((t) => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newGroupTopics = [...groupTopics];
    const [removed] = newGroupTopics.splice(draggedIndex, 1);
    newGroupTopics.splice(targetIndex, 0, removed);

    // Update local state
    const newTopics = topics.map((t) => {
      if (t.group_id !== draggedTopic.group_id) return t;
      const idx = newGroupTopics.findIndex((gt) => gt.id === t.id);
      return idx >= 0 ? newGroupTopics[idx] : t;
    });
    setTopics(newTopics);
    setDraggedId(null);

    // Save new order
    const orderedIds = newGroupTopics.map((t) => t.id);
    const result = await reorderTopicsAction(orderedIds, routeLocale);
    if (!result.success) {
      setError(getErrorLabel(result.errorCode, routeLocale));
      setTopics(topics); // Revert
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
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

      {/* Filters and Add Button */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <select
          value={filterGroupId}
          onChange={(e) => setFilterGroupId(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
          <option value="">{t("topics.allGroups")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name_zh}
            </option>
          ))}
        </select>

        <button
          onClick={openCreateModal}
          disabled={groups.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
          {t("topics.add")}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-700 dark:text-yellow-400">
            {t("topics.noGroupsYet")}
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
            {t("topics.createGroupFirst")}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {filteredTopics.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="w-10 px-4 py-3"></th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("topics.name")}
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("topics.group")}
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("topics.slug")}
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("topics.posts")}
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("common.visible")}
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("common.showInNav")}
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTopics.map((topic) => (
                  <tr
                    key={topic.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, topic.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, topic.id)}
                    onDragEnd={handleDragEnd}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-move ${
                      draggedId === topic.id ? "opacity-50" : ""
                    }`}>
                    <td className="px-4 py-3 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                      {topic.name_zh}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {getGroupName(topic.group_id)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {topic.slug}
                    </td>
                    <td className="px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                      {topic.post_count}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleToggleVisibility(topic)}
                        disabled={loading}
                        className={`px-2 py-1 text-xs rounded-full ${
                          topic.is_visible
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                        {topic.is_visible
                          ? t("common.visible")
                          : t("common.hidden")}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleToggleShowInNav(topic)}
                        disabled={loading}
                        className={`px-2 py-1 text-xs rounded-full ${
                          topic.show_in_nav
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                        title={t("common.showInNav")}
                      >
                        {topic.show_in_nav ? t("common.inNav") : t("common.notInNav")}
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(topic)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title={t("common.edit")}>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(topic)}
                          disabled={loading || topic.post_count > 0}
                          className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={t("common.delete")}>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>{t("topics.noTopics")}</p>
              <p className="text-sm mt-2">{t("topics.noTopicsDesc")}</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingTopic) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {isCreating ? t("topics.createTitle") : t("topics.editTitle")}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("topics.groupLabel")} *
                </label>
                <select
                  value={formData.group_id}
                  onChange={(e) =>
                    setFormData({ ...formData, group_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required>
                  <option value="">{t("topics.selectGroup")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name_zh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("topics.nameLabel")} *
                </label>
                <input
                  type="text"
                  value={formData.name_zh}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={t("topics.namePlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("topics.slugLabel")} *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder={t("topics.slugPlaceholder")}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("topics.slugHint")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="topic_is_visible"
                  checked={formData.is_visible}
                  onChange={(e) =>
                    setFormData({ ...formData, is_visible: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="topic_is_visible"
                  className="text-sm text-gray-700 dark:text-gray-300">
                  {t("topics.visibleLabel")}
                </label>
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
