'use client';

/**
 * Content Editor Client Component
 *
 * Client-side UI for editing site content sections.
 * Receives initial data from server component, uses server actions for mutations.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteContent, ContentHistory } from '@/lib/types/content';
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
  const [contentEn, setContentEn] = useState<string>(
    initialContent ? JSON.stringify(initialContent.content_en, null, 2) : '{}'
  );
  const [contentZh, setContentZh] = useState<string>(
    initialContent ? JSON.stringify(initialContent.content_zh, null, 2) : '{}'
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const isPublished = initialContent?.is_published ?? false;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const parsedEn = JSON.parse(contentEn);
      const parsedZh = JSON.parse(contentZh);

      const result = await saveSiteContent(sectionKey, parsedEn, parsedZh, locale);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      setMessage({
        type: 'success',
        text: locale === 'zh' ? '已儲存' : 'Saved',
      });

      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      setMessage({
        type: 'error',
        text: locale === 'zh' ? '儲存失敗，請檢查 JSON 格式' : 'Save failed. Please check JSON format.',
      });
    }

    setSaving(false);
  };

  const handlePublish = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const result = await publishSiteContent(sectionKey, locale);

      if (!result.success) {
        throw new Error(result.error || 'Failed to publish');
      }

      setMessage({
        type: 'success',
        text: locale === 'zh' ? '已發布' : 'Published',
      });

      router.refresh();
    } catch (err) {
      console.error('Publish error:', err);
      setMessage({
        type: 'error',
        text: locale === 'zh' ? '發布失敗' : 'Publish failed.',
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
        throw new Error(result.error || 'Failed to unpublish');
      }

      setMessage({
        type: 'success',
        text: locale === 'zh' ? '已取消發布' : 'Unpublished',
      });

      router.refresh();
    } catch (err) {
      console.error('Unpublish error:', err);
      setMessage({
        type: 'error',
        text: locale === 'zh' ? '取消發布失敗' : 'Unpublish failed.',
      });
    }

    setSaving(false);
  };

  const handleRestore = (historyItem: ContentHistory) => {
    if (!historyItem.old_value) {
      setMessage({ type: 'error', text: 'No previous value to restore' });
      return;
    }

    const value = historyItem.old_value as {
      content_en?: Record<string, unknown>;
      content_zh?: Record<string, unknown>;
    };
    if (value.content_en) {
      setContentEn(JSON.stringify(value.content_en, null, 2));
    }
    if (value.content_zh) {
      setContentZh(JSON.stringify(value.content_zh, null, 2));
    }

    setMessage({
      type: 'success',
      text:
        locale === 'zh'
          ? '已載入歷史版本，請點擊儲存以套用'
          : 'Loaded historical version. Click Save to apply.',
    });
    setShowHistory(false);
  };

  const t = {
    title: locale === 'zh' ? '編輯內容' : 'Edit Content',
    back: locale === 'zh' ? '返回' : 'Back',
    english: locale === 'zh' ? '英文內容' : 'English Content',
    chinese: locale === 'zh' ? '中文內容' : 'Chinese Content',
    save: locale === 'zh' ? '儲存草稿' : 'Save Draft',
    publish: locale === 'zh' ? '發布' : 'Publish',
    unpublish: locale === 'zh' ? '取消發布' : 'Unpublish',
    history: locale === 'zh' ? '歷史記錄' : 'History',
    restore: locale === 'zh' ? '還原' : 'Restore',
    noHistory: locale === 'zh' ? '無歷史記錄' : 'No history',
    close: locale === 'zh' ? '關閉' : 'Close',
  };

  const sectionLabels: Record<string, { en: string; zh: string }> = {
    hero: { en: 'Hero Section', zh: '首頁主視覺' },
    about: { en: 'About Section', zh: '關於我們' },
    platforms: { en: 'Platforms Section', zh: '技術平台' },
    contact: { en: 'Contact Section', zh: '聯絡資訊' },
    footer: { en: 'Footer', zh: '頁尾' },
    metadata: { en: 'Site Metadata', zh: '網站中繼資料' },
    nav: { en: 'Navigation', zh: '導航選單' },
    company: { en: 'Company Info', zh: '公司資訊' },
    gallery: { en: 'Gallery', zh: '畫廊' },
  };

  const label = sectionLabels[sectionKey] || { en: sectionKey, zh: sectionKey };

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
            {t.back}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.title}: {locale === 'zh' ? label.zh : label.en}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t.history}
          </button>
          {isPublished ? (
            <button
              onClick={handleUnpublish}
              disabled={saving}
              className="px-4 py-2 text-sm text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
            >
              {t.unpublish}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-2 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50"
            >
              {t.publish}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '...' : t.save}
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

      {/* Content Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* English */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.english}</h2>
          <textarea
            value={contentEn}
            onChange={(e) => setContentEn(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            spellCheck={false}
          />
        </div>

        {/* Chinese */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.chinese}</h2>
          <textarea
            value={contentZh}
            onChange={(e) => setContentZh(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            spellCheck={false}
          />
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.history}</h3>
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
              <p className="p-4 text-gray-500 dark:text-gray-400">{t.noHistory}</p>
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
                        {item.action}
                      </span>
                      {item.old_value && (
                        <button
                          onClick={() => handleRestore(item)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {t.restore}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.changed_at).toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US')}
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
