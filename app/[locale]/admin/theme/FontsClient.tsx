'use client';

/**
 * FontsClient - Admin font configuration UI
 *
 * Allows Owner to switch global font stacks (system fonts only).
 * Uses extracted components and pure module for clean code.
 *
 * @see lib/theme/font-selection.ts for business logic
 * @see ARCHITECTURE.md section 2 (Fonts: system fonts only)
 */

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { THEME_PRESETS } from '@/lib/modules/theme/presets';
import { buildThemeCssVars } from '@/lib/modules/theme/resolve';
import { findThemeFontKeyByStack } from '@/lib/modules/theme/fonts';
import {
  FONT_SELECTION_PRESET,
  resolveInitialSelection,
  resolveFontStack,
  isSaveDisabled,
  type FontSelectionValue,
} from '@/lib/modules/theme/font-selection';
import type { SiteConfigRow, ThemeKey } from '@/lib/types/theme';
import ThemePreviewIframe, { type ThemePreviewIframeRef } from './ThemePreviewIframe';
import { updateThemeFontAction } from './actions';
import FontStatusCard from './components/FontStatusCard';
import FontSelector from './components/FontSelector';
import MessageBanner from './components/MessageBanner';

interface FontsClientProps {
  config: SiteConfigRow | null;
  canEdit: boolean;
}

export default function FontsClient({ config, canEdit }: FontsClientProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const iframeRef = useRef<ThemePreviewIframeRef>(null);

  // Derive state from config
  const globalTheme = (config?.global_theme as ThemeKey) || 'tech-pro';
  const presetFontStack = THEME_PRESETS[globalTheme].variables['--theme-font'];
  // Font override is now stored in theme_overrides[globalTheme]['--theme-font']
  const rawOverride = config?.theme_overrides?.[globalTheme]?.['--theme-font'];
  const currentOverrideStack =
    typeof rawOverride === 'string' && rawOverride.trim().length > 0 ? rawOverride : null;
  const currentOverrideKey = useMemo(
    () => (currentOverrideStack ? findThemeFontKeyByStack(currentOverrideStack) : null),
    [currentOverrideStack]
  );

  // Selection state
  const [selection, setSelection] = useState<FontSelectionValue>(() =>
    resolveInitialSelection(currentOverrideStack, currentOverrideKey)
  );

  // Derived values using pure functions
  const selectedFontStack = useMemo(
    () => resolveFontStack(selection, presetFontStack, currentOverrideStack),
    [selection, presetFontStack, currentOverrideStack]
  );

  const previewCssVars = useMemo(() => {
    const base = buildThemeCssVars({
      themeKey: globalTheme,
      themeOverrides: config?.theme_overrides,
    });
    return { ...base, '--theme-font': selectedFontStack };
  }, [globalTheme, config?.theme_overrides, selectedFontStack]);

  const saveDisabled = isSaveDisabled(canEdit, isPending, selection, currentOverrideStack);

  // Save handler
  const handleSave = () => {
    if (saveDisabled) return;

    startTransition(async () => {
      setMessage(null);
      const fontKey = selection === FONT_SELECTION_PRESET ? null : (selection as Exclude<FontSelectionValue, '__preset__' | '__custom__'>);
      const result = await updateThemeFontAction(fontKey, globalTheme);

      if (result.success) {
        setMessage({ type: 'success', text: t('theme.fonts.updated') });
        router.refresh();
        iframeRef.current?.reload();
      } else {
        setMessage({ type: 'error', text: result.error || t('theme.failed') });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Column */}
        <div className="space-y-6">
          {/* Architecture Note */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('theme.fonts.description')}
            </p>
          </div>

          <FontStatusCard
            themeName={THEME_PRESETS[globalTheme].name}
            presetFontStack={presetFontStack}
            overrideStack={currentOverrideStack}
          />

          <FontSelector
            selection={selection}
            selectedFontStack={selectedFontStack}
            canEdit={canEdit}
            onSelectionChange={setSelection}
          />
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('theme.livePreview')}
          </h3>
          <ThemePreviewIframe
            ref={iframeRef}
            themeKey={globalTheme}
            cssVars={previewCssVars}
          />
        </div>
      </div>

      {/* Message */}
      {message && <MessageBanner type={message.type} message={message.text} />}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${!saveDisabled
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
