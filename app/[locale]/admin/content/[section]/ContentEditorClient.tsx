'use client';

/**
 * Content Editor Client Component
 *
 * Client-side UI for editing site content sections.
 * Receives initial data from server component, uses server actions for mutations.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { SiteContent, ContentHistory } from '@/lib/types/content';
import { getErrorLabel } from '@/lib/types/action-result';
import { saveSiteContent, publishSiteContent, unpublishSiteContent } from './actions';

interface ContentEditorClientProps {
  initialContent: SiteContent | null;
  initialHistory: ContentHistory[];
  locale: string;
  sectionKey: string;
}

export default function ContentEditorClient({
  initialContent,
  initialHistory,
  locale,
  sectionKey,
}: ContentEditorClientProps) {
  const router = useRouter();
  const tEditor = useTranslations('admin.content.editor');
  const tSections = useTranslations('admin.content.sections');
  const tHistory = useTranslations('admin.system.history');
  const tHistoryActions = useTranslations('admin.system.history.actionLabels');
  const [contentJson, setContentJson] = useState<string>(
    initialContent ? JSON.stringify(initialContent.content_zh, null, 2) : '{}'
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{ path: string; message: string }>>([]);

  const isPublished = initialContent?.is_published ?? false;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setValidationErrors([]);

    try {
      const parsed = JSON.parse(contentJson);

      const result = await saveSiteContent(sectionKey, parsed, locale);

      if (!result.success) {
        // Check for validation errors
        const details = result.details as { validationErrors?: Array<{ path: string; message: string }> } | undefined;
        if (details?.validationErrors && details.validationErrors.length > 0) {
          setValidationErrors(details.validationErrors);
        }
        setMessage({
          type: 'error',
          text: getErrorLabel(result.errorCode, locale),
        });
        setSaving(false);
        return;
      }

      setMessage({
        type: 'success',
        text: tEditor('saved'),
      });

      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      setMessage({
        type: 'error',
        text: tEditor('saveFailed'),
      });
    }

    setSaving(false);
  };

  const handlePublish = async () => {
    setSaving(true);
    setMessage(null);
    setValidationErrors([]);

    try {
      const result = await publishSiteContent(sectionKey, locale);

      if (!result.success) {
        // Check for validation errors
        const details = result.details as { validationErrors?: Array<{ path: string; message: string }> } | undefined;
        if (details?.validationErrors && details.validationErrors.length > 0) {
          setValidationErrors(details.validationErrors);
        }
        setMessage({
          type: 'error',
          text: getErrorLabel(result.errorCode, locale),
        });
        setSaving(false);
        return;
      }

      setMessage({
        type: 'success',
        text: tEditor('published'),
      });

      router.refresh();
    } catch (err) {
      console.error('Publish error:', err);
      setMessage({
        type: 'error',
        text: tEditor('publishFailed'),
      });
    }

    setSaving(false);
  };

  const handleUnpublish = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const result = await unpublishSiteContent(sectionKey, locale);

      if (!result.success) {
        setMessage({
          type: 'error',
          text: getErrorLabel(result.errorCode, locale),
        });
        setSaving(false);
        return;
      }

      setMessage({
        type: 'success',
        text: tEditor('unpublished'),
      });

      router.refresh();
    } catch (err) {
      console.error('Unpublish error:', err);
      setMessage({
        type: 'error',
        text: tEditor('unpublishFailed'),
      });
    }

    setSaving(false);
  };

  const handleRestore = (historyItem: ContentHistory) => {
    if (!historyItem.old_value) {
      setMessage({ type: 'error', text: tHistory('restoreNoValue') });
      return;
    }

    const value = historyItem.old_value as {
      content_en?: Record<string, unknown>;
      content_zh?: Record<string, unknown>;
    };
    const next = value.content_zh ?? value.content_en;
    if (next) setContentJson(JSON.stringify(next, null, 2));

    setMessage({
      type: 'success',
      text: tEditor('loadedHistorical'),
    });
    setShowHistory(false);
  };

  const sectionLabels: Record<string, string> = {
    hero: tSections('hero'),
    about: tSections('about'),
    platforms: tSections('platforms'),
    contact: tSections('contact'),
    footer: tSections('footer'),
    metadata: tSections('metadata'),
    gallery: tSections('gallery'),
    collaboration: tSections('collaboration'),
  };

  const label = sectionLabels[sectionKey] || sectionKey;

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/${locale}/admin/content`)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {tEditor('back')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tEditor('title')}: {label}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {tEditor('history')}
          </button>
          {isPublished ? (
            <button
              onClick={handleUnpublish}
              disabled={saving}
              className="px-4 py-2 text-sm text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
            >
              {tEditor('unpublish')}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-2 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50"
            >
              {tEditor('publish')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? tEditor('saving') : tEditor('save')}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
            {tEditor('validationErrors')} ({validationErrors.length})
          </h3>
          <ul className="space-y-2">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="text-sm">
                <code className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-mono text-xs">
                  {err.path || tEditor('rootPath')}
                </code>
                <span className="ml-2 text-red-600 dark:text-red-400">
                  {err.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content Editors */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {tEditor('contentJson')}
          </h2>
          <textarea
            value={contentJson}
            onChange={(e) => setContentJson(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            spellCheck={false}
          />
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tEditor('history')}</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto h-full pb-20">
            {initialHistory.length === 0 ? (
              <p className="p-4 text-gray-500 dark:text-gray-400">{tEditor('noHistory')}</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {initialHistory.map((item) => (
                  <li key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          item.action === 'publish'
                            ? 'bg-green-100 text-green-700'
                            : item.action === 'unpublish'
                            ? 'bg-yellow-100 text-yellow-700'
                            : item.action === 'update'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tHistoryActions(item.action)}
                      </span>
                      {item.old_value && (
                        <button
                          onClick={() => handleRestore(item)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {tEditor('restore')}
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
      )}
    </div>
  );
}
