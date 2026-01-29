'use client';

/**
 * Comment Settings Client Component
 * 
 * Manage:
 * - Moderation mode
 * - Spam protection toggles
 * - Blacklist management
 * - Uses admin i18n via useTranslations (wrapped in NextIntlClientProvider)
 * 
 * Uses server actions instead of API fetch per ARCHITECTURE.md.
 * 
 * @see ./actions.ts - Server actions (route-local)
 */

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { getErrorLabel } from '@/lib/types/action-result';
import { validateCommentSettingsPatch } from '@/lib/validators/comment-settings';
import type { 
  CommentBlacklistItem, 
  CommentBlacklistType,
  CommentSettingsConfig 
} from '@/lib/types/comments';
import {
  fetchCommentSettingsAction,
  updateCommentSettingsAction,
  addBlacklistItemAction,
  removeBlacklistItemAction,
} from './actions';

// =============================================================================
// Types
// =============================================================================

interface CommentSettingsClientProps {
  routeLocale: string;
  messages: AbstractIntlMessages;
}

/**
 * Local Settings type for form state
 * Uses string values for form inputs
 */
interface Settings {
  moderation_mode: string;
  max_links_before_moderation: string;
  enable_honeypot: string;
  enable_akismet: string;
  enable_recaptcha: string;
  recaptcha_threshold: string;
  rate_limit_per_minute: string;
  max_content_length: string;
}

// =============================================================================
// Component
// =============================================================================

/** Wrapper that provides NextIntlClientProvider for admin translations */
export default function CommentSettingsClient(props: CommentSettingsClientProps) {
  return (
    <NextIntlClientProvider locale={props.routeLocale} messages={props.messages}>
      <CommentSettingsClientContent {...props} />
    </NextIntlClientProvider>
  );
}

function CommentSettingsClientContent({ routeLocale }: CommentSettingsClientProps) {
  const t = useTranslations('admin.blog.commentSettings');
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<Settings>({
    moderation_mode: 'auto',
    max_links_before_moderation: '2',
    enable_honeypot: 'true',
    enable_akismet: 'true',
    enable_recaptcha: 'false',
    recaptcha_threshold: '0.5',
    rate_limit_per_minute: '3',
    max_content_length: '4000',
  });
  const [blacklist, setBlacklist] = useState<CommentBlacklistItem[]>([]);
  const [config, setConfig] = useState<CommentSettingsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // New blacklist item form
  const [newType, setNewType] = useState<CommentBlacklistType>('keyword');
  const [newValue, setNewValue] = useState('');
  const [newReason, setNewReason] = useState('');


  // Fetch settings and blacklist using server action
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchCommentSettingsAction();
        if (result.success && result.data) {
          setSettings(prev => ({ ...prev, ...result.data.settings }));
          setBlacklist(result.data.blacklist || []);
          setConfig(result.data.config || null);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Save settings with client-side validation
  const handleSave = async () => {
    // Client-side validation using shared validator
    const validation = validateCommentSettingsPatch(settings);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors({});

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await updateCommentSettingsAction(validation.validatedSettings ?? {});
      if (result.success) {
        setSaveMessage(t('saved'));
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage(getErrorLabel(result.errorCode, routeLocale));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Add blacklist item
  const handleAddBlacklist = async () => {
    if (!newValue.trim()) return;

    startTransition(async () => {
      try {
        const result = await addBlacklistItemAction({
          type: newType,
          value: newValue.trim(),
          reason: newReason.trim() || null,
        });

        if (result.success && result.data?.item) {
          setBlacklist([result.data.item, ...blacklist]);
          setNewValue('');
          setNewReason('');
        }
      } catch (error) {
        console.error('Failed to add blacklist item:', error);
      }
    });
  };

  // Remove blacklist item
  const handleRemoveBlacklist = async (id: string) => {
    startTransition(async () => {
      try {
        const result = await removeBlacklistItemAction(id);
        if (result.success) {
          setBlacklist(blacklist.filter(item => item.id !== id));
        }
      } catch (error) {
        console.error('Failed to remove blacklist item:', error);
      }
    });
  };

  // Update setting
  const updateSetting = (key: keyof Settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/${routeLocale}/admin/comments`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('back')}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          {saveMessage && (
            <span className={saveMessage === t('saved') ? "text-green-600 dark:text-green-400 text-sm" : "text-red-600 dark:text-red-400 text-sm"}>{saveMessage}</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 font-medium mb-2">
            {t('validationError')}
          </p>
          <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
            {Object.entries(validationErrors).map(([key, error]) => (
              <li key={key}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {/* Moderation Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('moderationTitle')}</h2>
          <div className="space-y-3">
            {[
              { value: 'auto', label: t('modeAuto'), desc: t('modeAutoDesc') },
              { value: 'all', label: t('modeAll'), desc: t('modeAllDesc') },
              { value: 'first_time', label: t('modeFirst'), desc: t('modeFirstDesc') },
            ].map((mode) => (
              <label key={mode.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="moderation_mode"
                  value={mode.value}
                  checked={settings.moderation_mode === mode.value}
                  onChange={(e) => updateSetting('moderation_mode', e.target.value)}
                  className="mt-1"
                />
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">{mode.label}</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{mode.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Protection Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('protectionTitle')}</h2>
          <div className="space-y-4">
            {[
              { key: 'enable_honeypot', label: t('honeypot'), desc: t('honeypotDesc'), configKey: null },
              { key: 'enable_akismet', label: t('akismet'), desc: t('akismetDesc'), configKey: 'akismet_configured' as const },
              { key: 'enable_recaptcha', label: t('recaptcha'), desc: t('recaptchaDesc'), configKey: 'recaptcha_secret_configured' as const },
            ].map((item) => {
              const isEnabled = settings[item.key as keyof Settings] === 'true';
              const isNotConfigured = item.configKey && config && !config[item.configKey];
              const showRecaptchaSiteKeyWarning = item.key === 'enable_recaptcha' && isEnabled && config && !config.recaptcha_site_key_configured;
              
              return (
                <div key={item.key}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => updateSetting(item.key as keyof Settings, e.target.checked ? 'true' : 'false')}
                      className="mt-1 rounded"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">{item.label}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </label>
                  {/* Warning: enabled but not configured */}
                  {isEnabled && isNotConfigured && (
                    <div className="mt-2 ml-7 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
                      {t('notConfigured', { name: item.label })}
                    </div>
                  )}
                  {showRecaptchaSiteKeyWarning && (
                    <div className="mt-2 ml-7 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
                      {t('recaptchaSiteKeyNotConfigured')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('limitsTitle')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('maxLinks')}
              </label>
              <input
                type="number"
                value={settings.max_links_before_moderation}
                onChange={(e) => updateSetting('max_links_before_moderation', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                min="0"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('rateLimit')}
              </label>
              <input
                type="number"
                value={settings.rate_limit_per_minute}
                onChange={(e) => updateSetting('rate_limit_per_minute', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                min="1"
                max="20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('maxLength')}
              </label>
              <input
                type="number"
                value={settings.max_content_length}
                onChange={(e) => updateSetting('max_content_length', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                min="100"
                max="10000"
                step="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('recaptchaThreshold')}
              </label>
              <input
                type="number"
                value={settings.recaptcha_threshold}
                onChange={(e) => updateSetting('recaptcha_threshold', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                min="0"
                max="1"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Blacklist */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('blacklistTitle')}</h2>
          
          {/* Add new item */}
          <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CommentBlacklistType)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <option value="keyword">{t('keyword')}</option>
              <option value="ip">{t('ip')}</option>
              <option value="email">{t('email')}</option>
              <option value="domain">{t('domain')}</option>
            </select>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={t('value')}
              className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder={t('reason')}
              className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
            <button
              onClick={handleAddBlacklist}
              disabled={isPending}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {t('add')}
            </button>
          </div>

          {/* Blacklist items */}
          <div className="space-y-2">
            {blacklist.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {t('blacklistEmpty')}
              </p>
            ) : (
              blacklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {item.type}
                    </span>
                    <span className="text-gray-900 dark:text-white">{item.value}</span>
                    {item.reason && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">({item.reason})</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveBlacklist(item.id)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                  >
                    {t('remove')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Spam Decision Log Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('spamLogTitle')}
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              {t('spamLogDesc')}
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>{t('spamLogHoneypot')}</li>
              <li>{t('spamLogAkismet')}</li>
              <li>{t('spamLogRecaptcha')}</li>
              <li>{t('spamLogLinks')}</li>
              <li>{t('spamLogBlacklist')}</li>
            </ul>
            <p className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {t('spamLogView')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
