"use client";

/**
 * Blog Groups List Client Component
 *
 * Interactive list with create/edit/delete/reorder functionality.
 * Uses drag-and-drop for reordering (HTML5 native, no extra deps).
 *
 * @see ../actions.ts - Server actions
 */

import { useState } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { BlogGroupWithCounts } from "@/lib/types/blog-taxonomy";
import { getErrorLabel } from "@/lib/types/action-result";
import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  reorderGroupsAction,
  toggleGroupVisibilityAction,
  type GroupActionInput,
} from "../actions";

interface GroupsListClientProps {
  initialGroups: BlogGroupWithCounts[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

export default function GroupsListClient(props: GroupsListClientProps) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <GroupsListContent {...props} />
    </NextIntlClientProvider>
  );
}

function GroupsListContent({
  initialGroups,
  routeLocale,
}: GroupsListClientProps) {
  const t = useTranslations("admin.blog.taxonomy");

  const [groups, setGroups] = useState(initialGroups);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit/Create modal state
  const [editingGroup, setEditingGroup] = useState<BlogGroupWithCounts | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<GroupActionInput>({
    name_zh: "",
    slug: "",
    is_visible: true,
  });

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // ==========================================================================
  // Form handlers
  // ==========================================================================

  const openCreateModal = () => {
    setFormData({ name_zh: "", slug: "", is_visible: true });
    setIsCreating(true);
    setEditingGroup(null);
    setError(null);
  };

  const openEditModal = (group: BlogGroupWithCounts) => {
    setFormData({
      name_zh: group.name_zh,
      slug: group.slug,
      is_visible: group.is_visible,
    });
    setEditingGroup(group);
    setIsCreating(false);
    setError(null);
  };

  const closeModal = () => {
    setEditingGroup(null);
    setIsCreating(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreating) {
        const result = await createGroupAction(formData, routeLocale);
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setGroups((prev) => [
            ...prev,
            { ...result.data!, topic_count: 0, post_count: 0 },
          ]);
        }
      } else if (editingGroup) {
        const result = await updateGroupAction(
          editingGroup.id,
          formData,
          routeLocale,
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === editingGroup.id
                ? {
                    ...result.data!,
                    topic_count: g.topic_count,
                    post_count: g.post_count,
                  }
                : g,
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

  const handleDelete = async (group: BlogGroupWithCounts) => {
    if (group.topic_count > 0 || group.post_count > 0) {
      setError(t("groups.cannotDeleteWithContent"));
      return;
    }

    if (!confirm(t("groups.confirmDelete", { name: group.name_zh }))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await deleteGroupAction(group.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Visibility toggle
  // ==========================================================================

  const handleToggleVisibility = async (group: BlogGroupWithCounts) => {
    setLoading(true);
    setError(null);

    try {
      const result = await toggleGroupVisibilityAction(
        group.id,
        !group.is_visible,
        routeLocale,
      );
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      if (result.data) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? { ...g, is_visible: result.data!.is_visible }
              : g,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Drag and drop reorder
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

    const draggedIndex = groups.findIndex((g) => g.id === draggedId);
    const targetIndex = groups.findIndex((g) => g.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newGroups = [...groups];
    const [removed] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, removed);

    setGroups(newGroups);
    setDraggedId(null);

    // Save new order
    const orderedIds = newGroups.map((g) => g.id);
    const result = await reorderGroupsAction(orderedIds, routeLocale);
    if (!result.success) {
      setError(getErrorLabel(result.errorCode, routeLocale));
      // Revert on error
      setGroups(groups);
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
      // Only auto-generate slug if creating and slug is empty or matches previous auto-slug
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

      {/* Add Button */}
      <div className="mb-4">
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
          {t("groups.add")}
        </button>
      </div>

      {/* Groups Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {groups.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("groups.name")}
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("groups.slug")}
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("groups.topics")}
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("groups.posts")}
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("common.visible")}
                </th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {groups.map((group) => (
                <tr
                  key={group.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, group.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, group.id)}
                  onDragEnd={handleDragEnd}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-move ${
                    draggedId === group.id ? "opacity-50" : ""
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
                    {group.name_zh}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {group.slug}
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    {group.topic_count}
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    {group.post_count}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => handleToggleVisibility(group)}
                      disabled={loading}
                      className={`px-2 py-1 text-xs rounded-full ${
                        group.is_visible
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                      {group.is_visible
                        ? t("common.visible")
                        : t("common.hidden")}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(group)}
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
                        onClick={() => handleDelete(group)}
                        disabled={
                          loading ||
                          group.topic_count > 0 ||
                          group.post_count > 0
                        }
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
            <p>{t("groups.noGroups")}</p>
            <p className="text-sm mt-2">{t("groups.noGroupsDesc")}</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingGroup) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {isCreating ? t("groups.createTitle") : t("groups.editTitle")}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("groups.nameLabel")} *
                </label>
                <input
                  type="text"
                  value={formData.name_zh}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={t("groups.namePlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("groups.slugLabel")} *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder={t("groups.slugPlaceholder")}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("groups.slugHint")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_visible"
                  checked={formData.is_visible}
                  onChange={(e) =>
                    setFormData({ ...formData, is_visible: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="is_visible"
                  className="text-sm text-gray-700 dark:text-gray-300">
                  {t("groups.visibleLabel")}
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
