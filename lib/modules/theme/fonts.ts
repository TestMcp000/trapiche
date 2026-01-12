/**
 * Theme Font Presets (Pure Module)
 *
 * System-font stacks only. Do not add runtime external font loading.
 *
 * @module lib/modules/theme/fonts
 * @see ARCHITECTURE.md section 2 (Fonts)
 */

import { THEME_FONT_KEYS, type ThemeFontKey } from '@/lib/types/theme';

export const THEME_FONT_PRESETS: Record<
  ThemeFontKey,
  { labelEn: string; labelZh: string; stack: string }
> = {
  'system-sans': {
    labelEn: 'System Sans',
    labelZh: '系統無襯線',
    stack:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', 'Liberation Sans', sans-serif",
  },
  'system-serif': {
    labelEn: 'System Serif',
    labelZh: '系統襯線',
    stack: "ui-serif, Georgia, 'Times New Roman', Times, serif",
  },
  'tc-sans': {
    labelEn: 'Traditional Chinese Sans',
    labelZh: '繁中無襯線',
    stack:
      "system-ui, -apple-system, 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', 'Noto Sans', sans-serif",
  },
  'tc-serif': {
    labelEn: 'Traditional Chinese Serif',
    labelZh: '繁中襯線',
    stack: "ui-serif, 'Noto Serif TC', 'Songti TC', 'PMingLiU', serif",
  },
  'system-mono': {
    labelEn: 'Monospace',
    labelZh: '等寬字體',
    stack:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
};

export function isValidThemeFontKey(value: unknown): value is ThemeFontKey {
  return typeof value === 'string' && THEME_FONT_KEYS.includes(value as ThemeFontKey);
}

export function getThemeFontStack(fontKey: ThemeFontKey): string {
  return THEME_FONT_PRESETS[fontKey].stack;
}

export function findThemeFontKeyByStack(stack: string): ThemeFontKey | null {
  for (const key of THEME_FONT_KEYS) {
    if (THEME_FONT_PRESETS[key].stack === stack) return key;
  }
  return null;
}
