'use client';

/**
 * FontStatusCard - Displays current font configuration status
 *
 * Shows the current global theme, preset font stack, and any override.
 */

import { useTranslations, useLocale } from 'next-intl';

interface FontStatusCardProps {
  themeName: string;
  presetFontStack: string;
  overrideStack: string | null;
}

export default function FontStatusCard({
  themeName,
  presetFontStack,
  overrideStack,
}: FontStatusCardProps) {
  const t = useTranslations('admin');

  return (
    <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <div className="space-y-1">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('theme.fonts.currentGlobal')}
          <span className="font-medium text-gray-900 dark:text-white">{themeName}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('theme.fonts.presetFont')}
          <span className="font-mono text-xs">{presetFontStack}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('theme.fonts.currentOverride')}
          <span className="font-mono text-xs">
            {overrideStack ?? t('theme.fonts.none')}
          </span>
        </p>
      </div>
    </div>
  );
}
