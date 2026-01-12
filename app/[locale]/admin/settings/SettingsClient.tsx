'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanySetting } from '@/lib/types/content';
import { saveSettingAction, purgeAllCache } from './actions';

interface SettingsClientProps {
  initialSettings: CompanySetting[];
  locale: string;
}

export default function SettingsClient({ initialSettings, locale }: SettingsClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (setting: CompanySetting, newValue: string) => {
    if (newValue === setting.value) return;
    
    setSaving(setting.key);
    setMessage(null);
    
    const result = await saveSettingAction(setting.key, newValue, locale);
    
    setSaving(null);
    
    if (result.success) {
      setMessage({ type: 'success', text: locale === 'zh' ? '已儲存' : 'Saved' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: locale === 'zh' ? '儲存失敗' : 'Save failed' });
    }
  };

  const handlePurgeCache = async () => {
    setPurging(true);
    setMessage(null);
    
    const result = await purgeAllCache();
    
    setPurging(false);
    
    if (result.success) {
      setMessage({
        type: 'success',
        text: locale === 'zh'
          ? `快取已清除 (版本: ${result.newVersion})`
          : `Cache purged successfully (version: ${result.newVersion})`
      });
      router.refresh();
    } else {
      setMessage({
        type: 'error',
        text: locale === 'zh' ? '清除快取失敗' : 'Failed to purge cache'
      });
    }
  };

  const t = {
    title: locale === 'zh' ? '公司設定' : 'Company Settings',
    description: locale === 'zh' ? '管理公司基本資訊和聯絡方式' : 'Manage company information and contact details',
    noSettings: locale === 'zh' ? '尚無設定' : 'No settings found',
    save: locale === 'zh' ? '儲存' : 'Save',
    system: locale === 'zh' ? '系統' : 'System',
    purgeCache: locale === 'zh' ? '清除所有快取' : 'Purge All Cache',
    purgeCacheDesc: locale === 'zh' 
      ? '清除所有已快取的內容，強制重新載入所有資料。' 
      : 'Clear all cached content and force reload of all data.',
  };

  const categoryLabels: Record<string, { en: string; zh: string }> = {
    general: { en: 'General', zh: '一般設定' },
    contact: { en: 'Contact', zh: '聯絡資訊' },
    social: { en: 'Social Links', zh: '社群連結' },
  };

  // Group settings by category
  const groupedSettings = initialSettings.reduce((acc, setting) => {
    const category = setting.category || 'general';
    // Theme settings are managed by /admin/theme (Theme v2) and should not appear here.
    if (category === 'theme') return acc;
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, CompanySetting[]>);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t.description}</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Settings Groups */}
      {Object.keys(groupedSettings).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t.noSettings}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([category, categorySettings]) => {
            const label = categoryLabels[category] || { en: category, zh: category };

            return (
              <div key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {locale === 'zh' ? label.zh : label.en}
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categorySettings.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      locale={locale}
                      saving={saving === setting.key}
                      onSave={(value) => handleSave(setting, value)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* System Section */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t.system}
          </h2>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t.purgeCache}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t.purgeCacheDesc}
              </p>
            </div>
            <button
              onClick={handlePurgeCache}
              disabled={purging}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {purging 
                ? (locale === 'zh' ? '清除中...' : 'Purging...') 
                : t.purgeCache}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  setting,
  locale,
  saving,
  onSave,
  t,
}: {
  setting: CompanySetting;
  locale: string;
  saving: boolean;
  onSave: (value: string) => void;
  t: Record<string, string>;
}) {
  const [value, setValue] = useState(setting.value);
  const [editing, setEditing] = useState(false);

  const handleSubmit = () => {
    onSave(value);
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(setting.value);
    setEditing(false);
  };

  // Determine input type based on setting key
  const isColor = setting.key.includes('color');

  const renderInput = () => {
    if (isColor) {
      // Color picker with text input
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-10 h-8 p-0 border-0 rounded cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 w-28 font-mono"
          />
        </div>
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 w-64"
        autoFocus
      />
    );
  };

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            {locale === 'zh' ? setting.label_zh || setting.key : setting.label_en || setting.key}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{setting.key}</p>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {editing ? (
            <>
              {renderInput()}
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-3 py-1.5 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? '...' : t.save}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              {isColor && (
                <div 
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: setting.value }}
                />
              )}
              <span 
                className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs"
              >
                {setting.value}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg"
              >
                {locale === 'zh' ? '編輯' : 'Edit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
