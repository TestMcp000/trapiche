"use client";

/**
 * Nav Group Card Component
 *
 * A single navigation group with collapsible items and controls.
 *
 * @module components/admin/settings/hamburger-nav-editor/NavGroupCard
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import type {
  HamburgerNavGroup,
  HamburgerNavItem,
  NavTarget,
} from "@/lib/types/hamburger-nav";
import type { Category } from "@/lib/types/blog";
import type { GalleryCategory } from "@/lib/types/gallery";
import type { EventType } from "@/lib/types/events";
import NavItemRow from "./NavItemRow";

interface NavGroupCardProps {
  group: HamburgerNavGroup;
  index: number;
  totalGroups: number;
  onUpdate: (updates: Partial<HamburgerNavGroup>) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, updates: Partial<HamburgerNavItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: "up" | "down") => void;
  onUpdateItemTarget: (itemId: string, target: NavTarget) => void;
  blogCategories: Category[];
  galleryCategories: GalleryCategory[];
  eventTypes: EventType[];
  staticPages: Array<{ path: string; label: string }>;
}

export default function NavGroupCard({
  group,
  index,
  totalGroups,
  onUpdate,
  onDelete,
  onMove,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onUpdateItemTarget,
  blogCategories,
  galleryCategories,
  eventTypes,
  staticPages,
}: NavGroupCardProps) {
  const t = useTranslations("admin.navigation");
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(group.label);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveLabel = () => {
    if (editLabel.trim()) {
      onUpdate({ label: editLabel.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditLabel(group.label);
    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Group Header */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Label */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveLabel();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <button
                onClick={handleSaveLabel}
                className="text-green-600 hover:text-green-700"
                title={t("save")}>
                <svg
                  className="w-5 h-5"
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
                className="text-gray-500 hover:text-gray-700"
                title={t("cancel")}>
                <svg
                  className="w-5 h-5"
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
              className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
              {group.label}
            </button>
          )}

          {/* Item count */}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({group.items.length} {t("items")})
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Move up */}
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30"
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
            disabled={index === totalGroups - 1}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30"
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
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs text-red-600">{t("confirmDelete")}</span>
              <button
                onClick={handleDeleteConfirm}
                className="p-1 text-red-600 hover:text-red-700"
                title={t("yes")}>
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
                className="p-1 text-gray-500 hover:text-gray-700"
                title={t("no")}>
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
              className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              title={t("deleteGroup")}>
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
      </div>

      {/* Items */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {group.items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {t("noItems")}
            </p>
          ) : (
            <div className="space-y-2">
              {group.items.map((item, itemIndex) => (
                <NavItemRow
                  key={item.id}
                  item={item}
                  index={itemIndex}
                  totalItems={group.items.length}
                  onUpdate={(updates) => onUpdateItem(item.id, updates)}
                  onDelete={() => onDeleteItem(item.id)}
                  onMove={(direction) => onMoveItem(item.id, direction)}
                  onUpdateTarget={(target) =>
                    onUpdateItemTarget(item.id, target)
                  }
                  blogCategories={blogCategories}
                  galleryCategories={galleryCategories}
                  eventTypes={eventTypes}
                  staticPages={staticPages}
                />
              ))}
            </div>
          )}

          {/* Add Item Button */}
          <button
            onClick={onAddItem}
            className="mt-3 w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded text-sm text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1">
            <svg
              className="w-4 h-4"
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
            {t("addItem")}
          </button>
        </div>
      )}
    </div>
  );
}
