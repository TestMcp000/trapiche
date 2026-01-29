'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CompanySetting } from '@/lib/types/content';
import { getErrorLabel } from '@/lib/types/action-result';
import { saveSettingAction, purgeAllCache } from './actions';

interface SettingsClientProps {
  initialSettings: CompanySetting[];
  locale: string;
}

export default function SettingsClient({ initialSettings, locale }: SettingsClientProps) {
  const router = useRouter();
  const t = useTranslations('admin.settings');
  const tCategories = useTranslations('admin.settings.categories');
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
      setMessage({ type: 'success', text: t('saved') });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: getErrorLabel(result.errorCode, locale) });
    }
  };

  const handlePurgeCache = async () => {
    setPurging(true);
    setMessage(null);
    
    const result = await purgeAllCache();
    
    setPurging(false);
    
    if (result.success && result.data) {
      setMessage({
        type: 'success',
        text: t('purged', { version: result.data.newVersion })
      });
      router.refresh();
    } else {
      setMessage({
        type: 'error',
        text: result.success ? t('purgeFailed') : getErrorLabel(result.errorCode, locale),
      });
    }
  };

  const categoryLabels: Record<string, string> = {
    general: tCategories('general'),
    contact: tCategories('contact'),
    social: tCategories('social'),
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('description')}</p>
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
          <p className="text-gray-500 dark:text-gray-400">{t('noSettings')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([category, categorySettings]) => {
            const label = categoryLabels[category] || category;

            return (
              <div key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {label}
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categorySettings.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      saving={saving === setting.key}
                      onSave={(value) => handleSave(setting, value)}
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
            {t('system')}
          </h2>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('purgeCache')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('purgeCacheDesc')}
              </p>
            </div>
            <button
              onClick={handlePurgeCache}
              disabled={purging}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {purging 
                ? t('purging')
                : t('purgeCache')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  setting,
  saving,
  onSave,
}: {
  setting: CompanySetting;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  const t = useTranslations('admin.settings');
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
            {setting.label_zh || setting.key}
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
                {saving ? '...' : t('save')}
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
                {t('edit')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
