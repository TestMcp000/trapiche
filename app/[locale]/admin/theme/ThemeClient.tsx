'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { THEME_PRESETS } from '@/lib/modules/theme/presets';
import { buildThemeCssVars } from '@/lib/modules/theme/resolve';
import { updateGlobalThemeAction } from './actions';
import ThemePreviewIframe, { type ThemePreviewIframeRef } from './ThemePreviewIframe';
import type { ThemeKey, SiteConfigRow } from '@/lib/types/theme';
import { THEME_KEYS } from '@/lib/types/theme';

interface ThemeClientProps {
  config: SiteConfigRow | null;
  canEdit: boolean;
}

export default function ThemeClient({ config, canEdit }: ThemeClientProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const [isPending, startTransition] = useTransition();
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(
    (config?.global_theme as ThemeKey) || 'tech-pro'
  );
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const iframeRef = useRef<ThemePreviewIframeRef>(null);

  // Calculate preview CSS variables
  const previewCssVars = buildThemeCssVars({
    themeKey: selectedTheme,
    themeOverrides: config?.theme_overrides,
  });

  const handleSave = () => {
    if (!canEdit) return;
    
    startTransition(async () => {
      setMessage(null);
      const result = await updateGlobalThemeAction(selectedTheme);
      
      if (result.success) {
        setMessage({ type: 'success', text: t('theme.updated') });
        router.refresh();
        // Reload iframe to reflect actual DB values
        iframeRef.current?.reload();
      } else {
        setMessage({ type: 'error', text: result.error || t('theme.failed') });
      }
    });
  };

  const hasChanges = selectedTheme !== (config?.global_theme || 'tech-pro');
  const isSaveDisabled = !canEdit || isPending || !hasChanges;

  return (
    <div className="space-y-6">
      {/* Two-column layout: Theme Cards + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Cards Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('theme.selectTheme')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            {THEME_KEYS.map((key) => {
              const preset = THEME_PRESETS[key];
              const isSelected = selectedTheme === key;
              const vars = preset.variables;

              return (
                <button
                  key={key}
                  onClick={() => canEdit && setSelectedTheme(key)}
                  disabled={!canEdit}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${isSelected 
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                    ${!canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                  `}
                >
                  {/* Preview Colors */}
                  <div 
                    className="h-16 rounded-md mb-3 flex items-center justify-center"
                    style={{ 
                      backgroundColor: vars['--theme-bg'],
                      color: vars['--theme-text'],
                    }}
                  >
                    <div 
                      className="w-12 h-6 rounded"
                      style={{ backgroundColor: vars['--theme-accent'] }}
                    />
                  </div>
                  
                  {/* Theme Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {preset.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0 ml-2">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Animation badge */}
                  {preset.enableAnimations && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        ✨ {t('theme.animations')}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('theme.livePreview')}
          </h3>
          <ThemePreviewIframe
            ref={iframeRef}
            themeKey={selectedTheme}
            cssVars={previewCssVars}
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Save Button (disabled for non-owners) */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaveDisabled}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${canEdit && hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
            }
            ${isPending ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          {isPending ? t('theme.saving') : t('theme.save')}
        </button>
      </div>
    </div>
  );
}
