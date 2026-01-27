"use client";

/**
 * Nav Item Row Component
 *
 * A single navigation item with label editing and target picker.
 *
 * @module components/admin/settings/hamburger-nav-editor/NavItemRow
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HamburgerNavItem, NavTarget } from "@/lib/types/hamburger-nav";
import type { Category } from "@/lib/types/blog";
import type { GalleryCategory } from "@/lib/types/gallery";
import type { EventType } from "@/lib/types/events";
import NavTargetPicker from "./NavTargetPicker";

interface NavItemRowProps {
  item: HamburgerNavItem;
  index: number;
  totalItems: number;
  onUpdate: (updates: Partial<HamburgerNavItem>) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onUpdateTarget: (target: NavTarget) => void;
  blogCategories: Category[];
  galleryCategories: GalleryCategory[];
  eventTypes: EventType[];
  staticPages: Array<{ path: string; label: string }>;
}

export default function NavItemRow({
  item,
  index,
  totalItems,
  onUpdate,
  onDelete,
  onMove,
  onUpdateTarget,
  blogCategories,
  galleryCategories,
  eventTypes,
  staticPages,
}: NavItemRowProps) {
  const t = useTranslations("admin.navigation");
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveLabel = () => {
    if (editLabel.trim()) {
      onUpdate({ label: editLabel.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditLabel(item.label);
    setIsEditing(false);
  };

  // Get target type display label
  const getTargetTypeLabel = (target: NavTarget): string => {
    switch (target.type) {
      case "blog_index":
        return t("targetTypes.blogIndex");
      case "blog_category":
        return t("targetTypes.blogCategory");
      case "blog_post":
        return t("targetTypes.blogPost");
      case "gallery_index":
        return t("targetTypes.galleryIndex");
      case "gallery_category":
        return t("targetTypes.galleryCategory");
      case "gallery_item":
        return t("targetTypes.galleryItem");
      case "events_index":
        return t("targetTypes.eventsIndex");
      case "event_detail":
        return t("targetTypes.eventDetail");
      case "page":
        return t("targetTypes.page");
      case "anchor":
        return t("targetTypes.anchor");
      case "external":
        return t("targetTypes.external");
      default:
        return t("targetTypes.unknown");
    }
  };

  // Get target detail string
  const getTargetDetail = (target: NavTarget): string => {
    switch (target.type) {
      case "blog_index":
        return target.q ? `?q=${target.q}` : "";
      case "blog_category":
        return target.categorySlug;
      case "blog_post":
        return target.postSlug;
      case "gallery_index":
        return target.q ? `?q=${target.q}` : "";
      case "gallery_category":
        return target.categorySlug;
      case "gallery_item":
        return `${target.categorySlug}/${target.itemSlug}`;
      case "events_index":
        return target.eventType ? `?type=${target.eventType}` : "";
      case "event_detail":
        return target.eventSlug;
      case "page":
        return target.path + (target.hash ? `#${target.hash}` : "");
      case "anchor":
        return `#${target.hash}`;
      case "external":
        return target.url;
      default:
        return "";
    }
  };

  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
      {/* Drag handle (visual only for now) */}
      <div className="text-gray-400 cursor-move">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-8 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
        </svg>
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLabel();
                if (e.key === "Escape") handleCancelEdit();
              }}
            />
            <button
              onClick={handleSaveLabel}
              className="text-green-600 hover:text-green-700">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-gray-500 hover:text-gray-700">
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
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block">
            {item.label}
          </button>
        )}
      </div>

      {/* Target Badge */}
      <button
        onClick={() => setShowTargetPicker(true)}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 max-w-[200px] truncate"
        title={getTargetDetail(item.target)}>
        <span className="font-medium">{getTargetTypeLabel(item.target)}</span>
        {getTargetDetail(item.target) && (
          <span className="text-gray-400 dark:text-gray-500 truncate">
            {getTargetDetail(item.target)}
          </span>
        )}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move up */}
        <button
          onClick={() => onMove("up")}
          disabled={index === 0}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30"
          title={t("moveUp")}>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        {/* Move down */}
        <button
          onClick={() => onMove("down")}
          disabled={index === totalItems - 1}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30"
          title={t("moveDown")}>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Delete */}
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="p-1 text-red-600 hover:text-red-700">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="p-1 text-gray-500 hover:text-gray-700">
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
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            title={t("deleteItem")}>
            <svg
              className="w-4 h-4"
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
        )}
      </div>

      {/* Target Picker Modal */}
      {showTargetPicker && (
        <NavTargetPicker
          currentTarget={item.target}
          onSelect={(target) => {
            onUpdateTarget(target);
            setShowTargetPicker(false);
          }}
          onClose={() => setShowTargetPicker(false)}
          blogCategories={blogCategories}
          galleryCategories={galleryCategories}
          eventTypes={eventTypes}
          staticPages={staticPages}
        />
      )}
    </div>
  );
}
