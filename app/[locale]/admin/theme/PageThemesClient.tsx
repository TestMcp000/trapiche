'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { THEME_PRESETS } from '@/lib/modules/theme/presets';
import { buildThemeCssVars } from '@/lib/modules/theme/resolve';
import { updatePageThemesAction } from './actions';
import ThemePreviewIframe, { type ThemePreviewIframeRef } from './ThemePreviewIframe';
import type { ThemeKey, ThemeScopeKey, SiteConfigRow } from '@/lib/types/theme';
import { THEME_KEYS, THEME_SCOPE_KEYS } from '@/lib/types/theme';

interface PageThemesClientProps {
  config: SiteConfigRow | null;
  canEdit: boolean;
}

// Scope paths for URL display (data, not UI strings)
const SCOPE_PATHS: Record<ThemeScopeKey, string> = {
  home: '',
  blog: '/blog',
  gallery: '/gallery',
  shop: '/shop',
};

export default function PageThemesClient({ config, canEdit }: PageThemesClientProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const iframeRef = useRef<ThemePreviewIframeRef>(null);
  const [previewScope, setPreviewScope] = useState<ThemeScopeKey>('home');
  
  // Initialize page themes from config
  const [pageThemes, setPageThemes] = useState<Partial<Record<ThemeScopeKey, ThemeKey>>>(() => {
    const themes: Partial<Record<ThemeScopeKey, ThemeKey>> = {};
    for (const scope of THEME_SCOPE_KEYS) {
      const configTheme = config?.page_themes?.[scope];
      if (configTheme && THEME_KEYS.includes(configTheme as ThemeKey)) {
        themes[scope] = configTheme as ThemeKey;
      }
    }
    return themes;
  });

  const globalTheme = (config?.global_theme as ThemeKey) || 'tech-pro';

  // Calculate preview CSS variables based on selected scope
  const currentThemeKey = pageThemes[previewScope] || globalTheme;
  const previewCssVars = buildThemeCssVars({
    themeKey: currentThemeKey,
    themeOverrides: config?.theme_overrides,
  });

  const handleThemeChange = (scope: ThemeScopeKey, theme: ThemeKey | '') => {
    if (!canEdit) return;
    
    setPageThemes(prev => {
      const updated = { ...prev };
      if (theme === '') {
        delete updated[scope];
      } else {
        updated[scope] = theme;
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!canEdit) return;
    
    startTransition(async () => {
      setMessage(null);
      const result = await updatePageThemesAction(pageThemes);
      
      if (result.success) {
        setMessage({ type: 'success', text: t('theme.pageThemesUpdated') });
        router.refresh();
        // Reload iframe to reflect actual DB values
        iframeRef.current?.reload();
      } else {
        setMessage({ type: 'error', text: result.error || t('theme.failed') });
      }
    });
  };

  // Handle preview path change
  const handlePreviewPathChange = (path: string) => {
    // Find the scope that matches this path
    const scope = THEME_SCOPE_KEYS.find(s => SCOPE_PATHS[s] === path) || 'home';
    setPreviewScope(scope);
  };

  // Check if there are any changes
  const hasChanges = JSON.stringify(pageThemes) !== JSON.stringify(config?.page_themes || {});
  const isSaveDisabled = !canEdit || isPending || !hasChanges;

  return (
    <div className="space-y-6">
      {/* Two-column layout: Settings + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Column */}
        <div className="space-y-4">
          {/* Info box */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {t('theme.pages.description')}
            </p>
          </div>

          {/* Page Themes Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('theme.pageSection')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('theme.themeLabel')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('theme.color')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {THEME_SCOPE_KEYS.map((scope) => {
                  const currentTheme = pageThemes[scope] || globalTheme;
                  const preset = THEME_PRESETS[currentTheme];
                  const isUsingGlobal = !pageThemes[scope];
                  const isPreviewSelected = previewScope === scope;

                  return (
                    <tr 
                      key={scope}
                      className={`cursor-pointer transition-colors ${isPreviewSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      onClick={() => setPreviewScope(scope)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isPreviewSelected && (
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {t(`theme.scope.${scope}`)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              /{locale}{SCOPE_PATHS[scope]}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={pageThemes[scope] || ''}
                          onChange={(e) => handleThemeChange(scope, e.target.value as ThemeKey | '')}
                          disabled={!canEdit}
                          className={`
                            block w-full rounded-md border-gray-300 dark:border-gray-600 
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                            focus:border-blue-500 focus:ring-blue-500 text-sm
                            ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}
                          `}
                        >
                          <option value="">
                            {t('theme.useGlobal')} ({THEME_PRESETS[globalTheme].name})
                          </option>
                          {THEME_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {THEME_PRESETS[key].name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: preset.variables['--theme-bg'] }}
                            title="Background"
                          />
                          <div 
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: preset.variables['--theme-accent'] }}
                            title="Accent"
                          />
                          {isUsingGlobal && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              ({t('theme.global')})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('theme.livePreview')}
          </h3>
          <ThemePreviewIframe
            ref={iframeRef}
            themeKey={currentThemeKey}
            cssVars={previewCssVars}
            previewPath={SCOPE_PATHS[previewScope]}
            onPathChange={handlePreviewPathChange}
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
