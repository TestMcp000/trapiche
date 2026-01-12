'use client';

/**
 * FontSelector - Font stack selection dropdown with preview
 *
 * Provides font selection UI with inline preview and warning for custom values.
 */

import { THEME_FONT_KEYS } from '@/lib/types/theme';
import { THEME_FONT_PRESETS } from '@/lib/modules/theme/fonts';
import { useTranslations, useLocale } from 'next-intl';
import {
  FONT_SELECTION_PRESET,
  FONT_SELECTION_CUSTOM,
  type FontSelectionValue,
} from '@/lib/modules/theme/font-selection';

interface FontSelectorProps {
  selection: FontSelectionValue;
  selectedFontStack: string;
  canEdit: boolean;
  onSelectionChange: (value: FontSelectionValue) => void;
}

export default function FontSelector({
  selection,
  selectedFontStack,
  canEdit,
  onSelectionChange,
}: FontSelectorProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const isCustom = selection === FONT_SELECTION_CUSTOM;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('theme.fonts.label')}
      </label>

      {/* Dropdown */}
      <select
        value={selection}
        onChange={(e) => onSelectionChange(e.target.value as FontSelectionValue)}
        disabled={!canEdit}
        className={`
          block w-full rounded-md border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
          focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2
          ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        <option value={FONT_SELECTION_PRESET}>
          {t('theme.fonts.usePreset')}
        </option>
        {isCustom && (
          <option value={FONT_SELECTION_CUSTOM} disabled>
            {t('theme.fonts.customValue')}
          </option>
        )}
        {THEME_FONT_KEYS.map((key) => (
          <option key={key} value={key}>
            {t(`theme.fonts.presets.${key}`)}
          </option>
        ))}
      </select>

      {/* Font Preview Sample */}
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div style={{ fontFamily: selectedFontStack }} className="space-y-1">
          <div className="text-base text-gray-900 dark:text-white">
            {t('theme.fonts.preview')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('theme.fonts.bodySample')}
          </div>
        </div>
      </div>

      {/* Custom Value Warning */}
      {isCustom && (
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('theme.fonts.customWarning')}
          </p>
        </div>
      )}
    </div>
  );
}
