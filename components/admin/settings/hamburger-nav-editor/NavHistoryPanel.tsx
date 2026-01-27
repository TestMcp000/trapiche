'use client';

/**
 * Nav History Panel Component
 *
 * Slide-over panel for viewing and restoring navigation history.
 *
 * @module components/admin/settings/hamburger-nav-editor/NavHistoryPanel
 */

import { useTranslations } from 'next-intl';
import type { ContentHistory } from '@/lib/types/content';

interface NavHistoryPanelProps {
  history: ContentHistory[];
  onRestore: (item: ContentHistory) => void;
  onClose: () => void;
}

export default function NavHistoryPanel({ history, onRestore, onClose }: NavHistoryPanelProps) {
  const t = useTranslations('admin.navigation');

  const actionLabels: Record<ContentHistory['action'], string> = {
    create: t('historyActions.create'),
    update: t('historyActions.update'),
    publish: t('historyActions.publish'),
    unpublish: t('historyActions.unpublish'),
    delete: t('historyActions.delete'),
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('history')}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* History List */}
      <div className="overflow-y-auto h-full pb-20">
        {history.length === 0 ? (
          <p className="p-4 text-gray-500 dark:text-gray-400">{t('noHistory')}</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((item) => (
              <li key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      item.action === 'publish'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : item.action === 'unpublish'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : item.action === 'update'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {actionLabels[item.action]}
                  </span>
                  {item.old_value && (
                    <button
                      onClick={() => onRestore(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {t('restore')}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.changed_at).toLocaleString('zh-TW')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
