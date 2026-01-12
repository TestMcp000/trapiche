'use client';

/**
 * User Admin Notes Card Component
 *
 * Displays admin notes (description markdown) with optional preview mode.
 * Raw Markdown is shown by default; rendered HTML shown when notesPreview=1.
 * Toggle uses router.push to change query param (no client markdown processing).
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 *
 * @see uiux_refactor.md §6.1 - Admin Notes Preview
 */

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import MarkdownContent from '@/components/blog/MarkdownContent';
import type { UserAdminProfileDetail } from '@/lib/types/user';

interface UserAdminNotesCardProps {
  userId: string;
  routeLocale: string;
  markdown: string | null;
  html?: string;
  notesPreview: boolean;
  tags: string[];
  isOwner: boolean;
  adminProfile: UserAdminProfileDetail | null;
}

export default function UserAdminNotesCard({
  userId,
  routeLocale,
  markdown,
  html,
  notesPreview,
  tags,
  isOwner,
  adminProfile,
}: UserAdminNotesCardProps) {
  const router = useRouter();
  const t = useTranslations('admin.users.detail');

  // Toggle between Raw and Preview mode via query param
  const handleTogglePreview = () => {
    if (notesPreview) {
      // Switch to Raw mode: remove query param
      router.push(`/${routeLocale}/admin/users/${userId}`);
    } else {
      // Switch to Preview mode: add query param
      router.push(`/${routeLocale}/admin/users/${userId}?notesPreview=1`);
    }
  };

  const hasContent = markdown && markdown.trim().length > 0;

  // Format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      {/* Header with title and toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('adminNotes')}
        </h2>

        {/* Raw / Preview Toggle (only show if there's content) */}
        {hasContent && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePreview}
              className={`px-3 py-1.5 text-sm font-medium rounded-l-lg border transition-colors ${
                !notesPreview
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Raw
            </button>
            <button
              type="button"
              onClick={handleTogglePreview}
              className={`px-3 py-1.5 text-sm font-medium rounded-r-lg border transition-colors ${
                notesPreview
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Preview
            </button>
          </div>
        )}
      </div>

      {/* Tags display */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="mt-4">
        {hasContent ? (
          notesPreview && html ? (
            // Rendered HTML (server-processed Markdown)
            <MarkdownContent html={html} />
          ) : (
            // Raw Markdown display
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
              {markdown}
            </pre>
          )
        ) : (
          // Empty state
          <p className="text-gray-500 dark:text-gray-400 italic">
            {t('noNotes')}
          </p>
        )}
      </div>

      {/* Owner-only edit hint */}
      {isOwner && adminProfile && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('updatedAt')}: {formatDate(adminProfile.updatedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

