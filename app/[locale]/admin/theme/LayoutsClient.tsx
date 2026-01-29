'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { getErrorLabel } from '@/lib/types/action-result';
import { THEME_PRESETS } from '@/lib/modules/theme/presets';
import { buildThemeCssVars } from '@/lib/modules/theme/resolve';
import { updateThemeOverridesAction } from './actions';
import ThemePreviewIframe, { type ThemePreviewIframeRef } from './ThemePreviewIframe';
import type {
  ThemeKey,
  SiteConfigRow,
  CustomizableCssVar,
} from '@/lib/types/theme';
import { THEME_KEYS, BASE_CUSTOMIZABLE_VARS, DERIVED_CUSTOMIZABLE_VARS } from '@/lib/types/theme';

// =============================================================================
// Constants
// =============================================================================

/** Token type metadata for admin UI input rendering */
const TOKEN_META: Record<CustomizableCssVar, 'color' | 'length' | 'shadow' | 'font'> = {
  // Base tokens
  '--theme-bg': 'color',
  '--theme-text': 'color',
  '--theme-accent': 'color',
  '--theme-font': 'font',
  '--theme-radius': 'length',
  '--theme-radius-lg': 'length',
  '--theme-shadow': 'shadow',
  '--theme-shadow-lg': 'shadow',
  // Derived tokens
  '--surface': 'color',
  '--surface-hover': 'color',
  '--surface-raised': 'color',
  '--surface-raised-hover': 'color',
  '--border': 'color',
  '--border-light': 'color',
};

/** Map CSS variable keys to translation keys (admin.theme.tokens.*) */
const CSS_VAR_TO_TOKEN_KEY: Record<CustomizableCssVar, string> = {
  '--theme-bg': 'bg',
  '--theme-text': 'text',
  '--theme-accent': 'accent',
  '--theme-font': 'font',
  '--theme-radius': 'radius',
  '--theme-radius-lg': 'radiusLg',
  '--theme-shadow': 'shadow',
  '--theme-shadow-lg': 'shadowLg',
  '--surface': 'surface',
  '--surface-hover': 'surfaceHover',
  '--surface-raised': 'surfaceRaised',
  '--surface-raised-hover': 'surfaceRaisedHover',
  '--border': 'border',
  '--border-light': 'borderLight',
};

// =============================================================================
// Props Interface
// =============================================================================

interface LayoutsClientProps {
  config: SiteConfigRow | null;
  canEdit: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function LayoutsClient({ config, canEdit }: LayoutsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('admin');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const iframeRef = useRef<ThemePreviewIframeRef>(null);

  // Selected layout to edit
  const [selectedLayout, setSelectedLayout] = useState<ThemeKey>('tech-pro');

  // Local overrides state (tracks unsaved changes)
  const [localOverrides, setLocalOverrides] = useState<Record<string, string | null>>(() => {
    return config?.theme_overrides?.[selectedLayout] ?? {};
  });

  // Get preset values for comparison
  const presetVars = THEME_PRESETS[selectedLayout].variables;
  
  // Build preview CSS vars
  const previewCssVars = buildThemeCssVars({
    themeKey: selectedLayout,
    themeOverrides: { [selectedLayout]: localOverrides },
  });

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleLayoutChange = useCallback((layout: ThemeKey) => {
    setSelectedLayout(layout);
    // Load existing overrides for this layout
    setLocalOverrides(config?.theme_overrides?.[layout] ?? {});
    setMessage(null);
  }, [config?.theme_overrides]);

  const handleTokenChange = useCallback((key: CustomizableCssVar, value: string | null) => {
    if (!canEdit) return;
    setLocalOverrides(prev => ({
      ...prev,
      [key]: value,
    }));
  }, [canEdit]);

  const handleResetToken = useCallback((key: CustomizableCssVar) => {
    if (!canEdit) return;
    setLocalOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [canEdit]);

  const handleResetAll = useCallback(() => {
    if (!canEdit) return;
    setLocalOverrides({});
  }, [canEdit]);

  const handleSave = useCallback(() => {
    if (!canEdit) return;

    startTransition(async () => {
      setMessage(null);
      const result = await updateThemeOverridesAction(selectedLayout, localOverrides);

      if (result.success) {
        setMessage({
          type: 'success',
          text: t('theme.saved'),
        });
        router.refresh();
        iframeRef.current?.reload();
      } else {
        setMessage({
          type: 'error',
          text: getErrorLabel(result.errorCode, locale),
        });
      }
    });
  }, [canEdit, selectedLayout, localOverrides, t, router, locale]);

  // Check if there are unsaved changes
  const savedOverrides = config?.theme_overrides?.[selectedLayout] ?? {};
  const hasChanges = JSON.stringify(localOverrides) !== JSON.stringify(savedOverrides);

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderTokenInput = (key: CustomizableCssVar) => {
    const tokenType = TOKEN_META[key];
    const tokenKey = CSS_VAR_TO_TOKEN_KEY[key];
    const presetValue = presetVars[key as keyof typeof presetVars] ?? '';
    const overrideValue = localOverrides[key];
    const currentValue = overrideValue ?? presetValue;
    const isOverridden = overrideValue !== undefined && overrideValue !== null;

    return (
      <div key={key} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        {/* Label */}
        <div className="w-40 flex-shrink-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t(`theme.tokens.${tokenKey}`)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{key}</p>
        </div>

        {/* Input based on tokenType */}
        <div className="flex-1">
          {tokenType === 'color' && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentValue.startsWith('#') ? currentValue : '#000000'}
                onChange={(e) => handleTokenChange(key, e.target.value)}
                disabled={!canEdit}
                className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
              />
              <input
                type="text"
                value={currentValue}
                onChange={(e) => handleTokenChange(key, e.target.value)}
                disabled={!canEdit}
                className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono disabled:opacity-50"
                placeholder="#RRGGBB"
              />
            </div>
          )}

          {tokenType === 'length' && (
            <input
              type="text"
              value={currentValue}
              onChange={(e) => handleTokenChange(key, e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono disabled:opacity-50"
              placeholder="e.g., 8px, 1rem"
            />
          )}

          {tokenType === 'shadow' && (
            <input
              type="text"
              value={currentValue}
              onChange={(e) => handleTokenChange(key, e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono disabled:opacity-50"
              placeholder="e.g., 0 2px 8px rgba(0,0,0,0.1)"
            />
          )}

          {tokenType === 'font' && (
            <input
              type="text"
              value={currentValue}
              onChange={(e) => handleTokenChange(key, e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono disabled:opacity-50"
              placeholder="system-ui, sans-serif"
            />
          )}
        </div>

        {/* Preset value info + Reset button */}
        <div className="w-32 flex-shrink-0 flex items-center gap-2">
          {isOverridden ? (
            <>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                {t('theme.tokens.overridden')}
              </span>
              {canEdit && (
                <button
                  onClick={() => handleResetToken(key)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  {t('theme.tokens.reset')}
                </button>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t('theme.tokens.default')}
            </span>
          )}
        </div>
      </div>
    );
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Layout Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {THEME_KEYS.map((key) => {
          const preset = THEME_PRESETS[key];
          const isSelected = selectedLayout === key;
          return (
            <button
              key={key}
              onClick={() => handleLayoutChange(key)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <p className="font-semibold text-gray-900 dark:text-white">{preset.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {THEME_PRESETS[selectedLayout].name} - Tokens
            </h3>
            {canEdit && Object.keys(localOverrides).length > 0 && (
              <button
                onClick={handleResetAll}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
              >
                {t('theme.tokens.resetAll')}
              </button>
            )}
          </div>

          {/* Base Tokens Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {t('theme.tokens.baseTokens')}
            </h4>
            {BASE_CUSTOMIZABLE_VARS.map((key) => renderTokenInput(key))}
          </div>

          {/* Derived Tokens Section */}
          <div className="space-y-3 mt-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {t('theme.tokens.derivedTokens')}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('theme.tokens.derivedTokensDesc')}
            </p>
            {DERIVED_CUSTOMIZABLE_VARS.map((key) => renderTokenInput(key))}
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('theme.livePreview')}
          </h3>
          <ThemePreviewIframe
            ref={iframeRef}
            themeKey={selectedLayout}
            cssVars={previewCssVars}
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!canEdit || isPending || !hasChanges}
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
