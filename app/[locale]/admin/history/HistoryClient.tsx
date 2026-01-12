'use client';

import { useState, useMemo } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { ContentHistory } from '@/lib/types/content';
import type { Locale } from '@/lib/i18n/locales';
import { restoreHistoryAction } from './actions';

interface HistoryClientProps {
  initialHistory: ContentHistory[];
  routeLocale: string;
  adminLocale: Locale;
  adminMessages: Record<string, unknown>;
  query: { type?: string; id?: string };
}

function HistoryClientInner({
  initialHistory,
  routeLocale,
  adminLocale,
  query,
}: {
  initialHistory: ContentHistory[];
  routeLocale: string;
  adminLocale: Locale;
  query: { type?: string; id?: string };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>(query.type || 'all');
  const [restoring, setRestoring] = useState<string | null>(null);
  const t = useTranslations('admin.system.history');

  // Filter history based on type
  const filteredHistory = useMemo(() => {
    if (filter === 'all' && !query.type && !query.id) {
      return initialHistory;
    }
    
    let result = initialHistory;
    
    if (query.type || (filter !== 'all')) {
      const typeFilter = query.type || filter;
      result = result.filter(item => item.content_type === typeFilter);
    }
    
    if (query.id) {
      result = result.filter(item => item.content_id === query.id);
    }
    
    return result;
  }, [initialHistory, filter, query.type, query.id]);

  const handleRestore = async (item: ContentHistory) => {
    if (!item.old_value) {
      alert(t('restoreNoValue'));
      return;
    }
    
    if (!confirm(t('restoreConfirm'))) {
      return;
    }
    
    setRestoring(item.id);
    
    const result = await restoreHistoryAction(item.id, routeLocale);
    
    setRestoring(null);
    
    if (result.success) {
      alert(t('restored'));
      router.refresh();
    } else {
      alert(t('restoreFailed'));
    }
  };

  // Date formatting uses adminLocale for display
  const dateLocale = adminLocale === 'zh' ? 'zh-TW' : 'en-US';

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        
        {/* Filter */}
        {!query.type && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('filterBy')}:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
            >
              <option value="all">{t('all')}</option>
              <option value="site_content">{t('siteContent')}</option>
              <option value="portfolio">{t('portfolio')}</option>
              <option value="service">{t('service')}</option>
              <option value="setting">{t('setting')}</option>
            </select>
          </div>
        )}
        
        {(query.type || query.id) && (
          <button
            onClick={() => router.push(`/${routeLocale}/admin/history`)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('clearFilter')}
          </button>
        )}
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t('noHistory')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('contentType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('action')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('time')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredHistory.map((item) => {
                const isRestoring = restoring === item.id;
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(`typeLabels.${item.content_type}` as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.action === 'create' ? 'bg-green-100 text-green-800' :
                        item.action === 'update' ? 'bg-blue-100 text-blue-800' :
                        item.action === 'publish' ? 'bg-purple-100 text-purple-800' :
                        item.action === 'unpublish' ? 'bg-yellow-100 text-yellow-800' :
                        item.action === 'delete' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {t(`actionLabels.${item.action}` as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.changed_at).toLocaleString(dateLocale)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {item.old_value && item.action !== 'create' && (
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isRestoring}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                        >
                          {isRestoring ? t('restoring') : t('restore')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HistoryClient({
  initialHistory,
  routeLocale,
  adminLocale,
  adminMessages,
  query,
}: HistoryClientProps) {
  return (
    <NextIntlClientProvider locale={adminLocale} messages={adminMessages}>
      <HistoryClientInner
        initialHistory={initialHistory}
        routeLocale={routeLocale}
        adminLocale={adminLocale}
        query={query}
      />
    </NextIntlClientProvider>
  );
}
