'use client';

/**
 * User Comments List Component
 *
 * Displays user's comment history.
 * Route-local presentational component.
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 */

import { useTranslations } from 'next-intl';
import type { AdminComment } from '@/lib/modules/comment/moderation-transform';

interface UserCommentsListProps {
  comments: AdminComment[];
}

export default function UserCommentsList({ comments }: UserCommentsListProps) {
  const t = useTranslations('admin.users.detail');

  // Format dates with browser locale
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('commentHistory')}
        </h2>
      </div>
      {comments.length > 0 ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {comment.userDisplayName}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        comment.isSpam
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : comment.isApproved
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {comment.isSpam
                        ? t('spam')
                        : comment.isApproved
                        ? t('approved')
                        : t('pending')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {comment.content}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(comment.createdAt)} · {comment.targetType}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          {t('noComments')}
        </div>
      )}
    </div>
  );
}

