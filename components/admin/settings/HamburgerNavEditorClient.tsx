"use client";

/**
 * Hamburger Nav Editor Client Component
 *
 * Visual editor for hamburger navigation menu with drag-and-drop support.
 * Provides a non-JSON editor interface for site admins.
 *
 * @module components/admin/settings/HamburgerNavEditorClient
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-A1–A4)
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  HamburgerNavV2,
  HamburgerNavGroup,
  HamburgerNavItem,
  NavTarget,
} from "@/lib/types/hamburger-nav";
import type { ContentHistory } from "@/lib/types/content";
import type { Category } from "@/lib/types/blog";
import type { BlogGroup, BlogTopic, BlogTag } from "@/lib/types/blog-taxonomy";
import type { GalleryCategory } from "@/lib/types/gallery";
import type { EventType, EventTag } from "@/lib/types/events";
import {
  saveNavDraft,
  publishNav,
  unpublishNav,
} from "@/app/[locale]/admin/settings/navigation/actions";
import NavGroupList from "./hamburger-nav-editor/NavGroupList";
import NavValidationErrors from "./hamburger-nav-editor/NavValidationErrors";
import NavHistoryPanel from "./hamburger-nav-editor/NavHistoryPanel";

interface HamburgerNavEditorClientProps {
  initialNav: HamburgerNavV2;
  initialHistory: ContentHistory[];
  isPublished: boolean;
  locale: string;
  blogCategories: Category[];
  blogGroups: BlogGroup[];
  blogTopics: BlogTopic[];
  blogTags: BlogTag[];
  galleryCategories: GalleryCategory[];
  eventTypes: EventType[];
  eventTags: EventTag[];
  staticPages: Array<{ path: string; label: string }>;
}

export default function HamburgerNavEditorClient({
  initialNav,
  initialHistory,
  isPublished: initialIsPublished,
  locale,
  blogCategories,
  blogGroups,
  blogTopics,
  blogTags,
  galleryCategories,
  eventTypes,
  eventTags,
  staticPages,
}: HamburgerNavEditorClientProps) {
  const router = useRouter();
  const t = useTranslations("admin.navigation");

  // State
  const [nav, setNav] = useState<HamburgerNavV2>(initialNav);
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ path: string; message: string }>
  >([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Mark as changed
  const markChanged = useCallback(() => {
    setHasChanges(true);
    setMessage(null);
    setValidationErrors([]);
  }, []);

  // Group operations
  const addGroup = useCallback(() => {
    const newGroup: HamburgerNavGroup = {
      id: `group-${Date.now()}`,
      label: t("newGroup"),
      items: [],
    };
    setNav((prev) => ({
      ...prev,
      groups: [...prev.groups, newGroup],
    }));
    markChanged();
  }, [t, markChanged]);

  const updateGroup = useCallback(
    (groupId: string, updates: Partial<HamburgerNavGroup>) => {
      setNav((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId ? { ...g, ...updates } : g,
        ),
      }));
      markChanged();
    },
    [markChanged],
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      setNav((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== groupId),
      }));
      markChanged();
    },
    [markChanged],
  );

  const moveGroup = useCallback(
    (groupId: string, direction: "up" | "down") => {
      setNav((prev) => {
        const idx = prev.groups.findIndex((g) => g.id === groupId);
        if (idx === -1) return prev;
        if (direction === "up" && idx === 0) return prev;
        if (direction === "down" && idx === prev.groups.length - 1) return prev;

        const newGroups = [...prev.groups];
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        [newGroups[idx], newGroups[swapIdx]] = [
          newGroups[swapIdx],
          newGroups[idx],
        ];
        return { ...prev, groups: newGroups };
      });
      markChanged();
    },
    [markChanged],
  );

  // Item operations
  const addItem = useCallback(
    (groupId: string) => {
      const newItem: HamburgerNavItem = {
        id: `item-${Date.now()}`,
        label: t("newItem"),
        target: { type: "page", path: "/about" },
      };
      setNav((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId ? { ...g, items: [...g.items, newItem] } : g,
        ),
      }));
      markChanged();
    },
    [t, markChanged],
  );

  const updateItem = useCallback(
    (groupId: string, itemId: string, updates: Partial<HamburgerNavItem>) => {
      setNav((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                items: g.items.map((i) =>
                  i.id === itemId ? { ...i, ...updates } : i,
                ),
              }
            : g,
        ),
      }));
      markChanged();
    },
    [markChanged],
  );

  const deleteItem = useCallback(
    (groupId: string, itemId: string) => {
      setNav((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId
            ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
            : g,
        ),
      }));
      markChanged();
    },
    [markChanged],
  );

  const moveItem = useCallback(
    (groupId: string, itemId: string, direction: "up" | "down") => {
      setNav((prev) => ({
        ...prev,
        groups: prev.groups.map((g) => {
          if (g.id !== groupId) return g;
          const idx = g.items.findIndex((i) => i.id === itemId);
          if (idx === -1) return g;
          if (direction === "up" && idx === 0) return g;
          if (direction === "down" && idx === g.items.length - 1) return g;

          const newItems = [...g.items];
          const swapIdx = direction === "up" ? idx - 1 : idx + 1;
          [newItems[idx], newItems[swapIdx]] = [
            newItems[swapIdx],
            newItems[idx],
          ];
          return { ...g, items: newItems };
        }),
      }));
      markChanged();
    },
    [markChanged],
  );

  // Update item target
  const updateItemTarget = useCallback(
    (groupId: string, itemId: string, target: NavTarget) => {
      updateItem(groupId, itemId, { target });
    },
    [updateItem],
  );

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    setValidationErrors([]);

    const result = await saveNavDraft(nav, locale);

    if (!result.success) {
      if (result.validationErrors && result.validationErrors.length > 0) {
        setValidationErrors(result.validationErrors);
      }
      setMessage({ type: "error", text: result.error || t("saveFailed") });
    } else {
      setMessage({ type: "success", text: t("draftSaved") });
      setHasChanges(false);
      router.refresh();
    }

    setSaving(false);
  }, [nav, locale, t, router]);

  // Publish
  const handlePublish = useCallback(async () => {
    // If there are unsaved changes, save first
    if (hasChanges) {
      setSaving(true);
      const saveResult = await saveNavDraft(nav, locale);
      if (!saveResult.success) {
        if (saveResult.validationErrors) {
          setValidationErrors(saveResult.validationErrors);
        }
        setMessage({
          type: "error",
          text: saveResult.error || t("saveFailed"),
        });
        setSaving(false);
        return;
      }
    }

    setSaving(true);
    setMessage(null);
    setValidationErrors([]);

    const result = await publishNav(locale);

    if (!result.success) {
      if (result.validationErrors && result.validationErrors.length > 0) {
        setValidationErrors(result.validationErrors);
      }
      setMessage({ type: "error", text: result.error || t("publishFailed") });
    } else {
      setMessage({ type: "success", text: t("published") });
      setIsPublished(true);
      setHasChanges(false);
      router.refresh();
    }

    setSaving(false);
  }, [nav, locale, hasChanges, t, router]);

  // Unpublish
  const handleUnpublish = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    const result = await unpublishNav(locale);

    if (!result.success) {
      setMessage({ type: "error", text: result.error || t("unpublishFailed") });
    } else {
      setMessage({ type: "success", text: t("unpublished") });
      setIsPublished(false);
      router.refresh();
    }

    setSaving(false);
  }, [locale, t, router]);

  // Restore from history
  const handleRestore = useCallback(
    (historyItem: ContentHistory) => {
      if (!historyItem.old_value) {
        setMessage({ type: "error", text: t("noHistoryContent") });
        return;
      }

      const value = historyItem.old_value as {
        content_zh?: Record<string, unknown>;
      };

      if (value.content_zh) {
        // Cast to HamburgerNavV2
        setNav(value.content_zh as unknown as HamburgerNavV2);
        setMessage({ type: "success", text: t("historyLoaded") });
        setHasChanges(true);
        setShowHistory(false);
      }
    },
    [t],
  );

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("description")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              isPublished
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}>
            {isPublished ? t("statusPublished") : t("statusDraft")}
          </span>

          {/* History button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            {t("history")}
          </button>

          {/* Publish/Unpublish button */}
          {isPublished ? (
            <button
              onClick={handleUnpublish}
              disabled={saving}
              className="px-4 py-2 text-sm text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 disabled:opacity-50">
              {t("unpublish")}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-2 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50">
              {t("publish")}
            </button>
          )}

          {/* Save draft button */}
          <button
            onClick={handleSaveDraft}
            disabled={saving || !hasChanges}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? t("saving") : t("saveDraft")}
          </button>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-sm">
          {t("unsavedChanges")}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}>
          {message.text}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <NavValidationErrors errors={validationErrors} />
      )}

      {/* Group List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <NavGroupList
          groups={nav.groups}
          onAddGroup={addGroup}
          onUpdateGroup={updateGroup}
          onDeleteGroup={deleteGroup}
          onMoveGroup={moveGroup}
          onAddItem={addItem}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          onMoveItem={moveItem}
          onUpdateItemTarget={updateItemTarget}
          blogCategories={blogCategories}
          blogGroups={blogGroups}
          blogTopics={blogTopics}
          blogTags={blogTags}
          galleryCategories={galleryCategories}
          eventTypes={eventTypes}
          eventTags={eventTags}
          staticPages={staticPages}
        />
      </div>

      {/* History Panel */}
      {showHistory && (
        <NavHistoryPanel
          history={initialHistory}
          onRestore={handleRestore}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
