'use client';

/**
 * Nav Group List Component
 *
 * Displays all navigation groups with add/edit/delete/reorder capabilities.
 *
 * @module components/admin/settings/hamburger-nav-editor/NavGroupList
 */

import { useTranslations } from 'next-intl';
import type { HamburgerNavGroup, HamburgerNavItem, NavTarget } from '@/lib/types/hamburger-nav';
import type { Category } from '@/lib/types/blog';
import type { GalleryCategory } from '@/lib/types/gallery';
import type { EventType } from '@/lib/types/events';
import NavGroupCard from './NavGroupCard';

interface NavGroupListProps {
  groups: HamburgerNavGroup[];
  onAddGroup: () => void;
  onUpdateGroup: (groupId: string, updates: Partial<HamburgerNavGroup>) => void;
  onDeleteGroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void;
  onAddItem: (groupId: string) => void;
  onUpdateItem: (groupId: string, itemId: string, updates: Partial<HamburgerNavItem>) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onMoveItem: (groupId: string, itemId: string, direction: 'up' | 'down') => void;
  onUpdateItemTarget: (groupId: string, itemId: string, target: NavTarget) => void;
  blogCategories: Category[];
  galleryCategories: GalleryCategory[];
  eventTypes: EventType[];
  staticPages: Array<{ path: string; label: string }>;
}

export default function NavGroupList({
  groups,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onMoveGroup,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onUpdateItemTarget,
  blogCategories,
  galleryCategories,
  eventTypes,
  staticPages,
}: NavGroupListProps) {
  const t = useTranslations('admin.navigation');

  return (
    <div className="p-6">
      {/* Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
          <p className="mt-4 text-sm">{t('noGroups')}</p>
          <button
            onClick={onAddGroup}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('addFirstGroup')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, index) => (
            <NavGroupCard
              key={group.id}
              group={group}
              index={index}
              totalGroups={groups.length}
              onUpdate={(updates) => onUpdateGroup(group.id, updates)}
              onDelete={() => onDeleteGroup(group.id)}
              onMove={(direction) => onMoveGroup(group.id, direction)}
              onAddItem={() => onAddItem(group.id)}
              onUpdateItem={(itemId, updates) => onUpdateItem(group.id, itemId, updates)}
              onDeleteItem={(itemId) => onDeleteItem(group.id, itemId)}
              onMoveItem={(itemId, direction) => onMoveItem(group.id, itemId, direction)}
              onUpdateItemTarget={(itemId, target) => onUpdateItemTarget(group.id, itemId, target)}
              blogCategories={blogCategories}
              galleryCategories={galleryCategories}
              eventTypes={eventTypes}
              staticPages={staticPages}
            />
          ))}
        </div>
      )}

      {/* Add Group Button */}
      {groups.length > 0 && (
        <button
          onClick={onAddGroup}
          className="mt-6 w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addGroup')}
        </button>
      )}
    </div>
  );
}
