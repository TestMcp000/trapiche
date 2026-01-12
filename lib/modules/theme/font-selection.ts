/**
 * Font Selection Constants and Helpers (Pure Module)
 *
 * Typed constants and pure helper functions for admin font selection.
 * No side effects, no DB/API calls.
 *
 * @module lib/modules/theme/font-selection
 * @see ARCHITECTURE.md section 4.3 (Pure Modules)
 */

import type { ThemeFontKey } from '@/lib/types/theme';
import { getThemeFontStack } from './fonts';

// =============================================================================
// Constants (Magic Strings → Typed Constants)
// =============================================================================

/** Sentinel value indicating "use theme preset font" */
export const FONT_SELECTION_PRESET = '__preset__' as const;

/** Sentinel value indicating "current DB value is not in allowlist" */
export const FONT_SELECTION_CUSTOM = '__custom__' as const;

/** Union type for font selection dropdown value */
export type FontSelectionValue =
  | ThemeFontKey
  | typeof FONT_SELECTION_PRESET
  | typeof FONT_SELECTION_CUSTOM;

// =============================================================================
// Pure Helper Functions
// =============================================================================

/**
 * Determine the initial dropdown selection based on current DB state.
 *
 * @param overrideStack - Current `--theme-font` override from DB (null if none)
 * @param overrideKey - Matched ThemeFontKey (null if not in allowlist)
 * @returns The appropriate FontSelectionValue for the dropdown
 */
export function resolveInitialSelection(
  overrideStack: string | null,
  overrideKey: ThemeFontKey | null
): FontSelectionValue {
  if (!overrideStack) return FONT_SELECTION_PRESET;
  return overrideKey ?? FONT_SELECTION_CUSTOM;
}

/**
 * Resolve the actual CSS font-family stack for a given selection.
 *
 * @param selection - Current dropdown selection
 * @param presetStack - The font stack from the theme preset
 * @param overrideStack - Current DB override (used for CUSTOM fallback)
 * @returns The CSS font-family string to apply
 */
export function resolveFontStack(
  selection: FontSelectionValue,
  presetStack: string,
  overrideStack: string | null
): string {
  if (selection === FONT_SELECTION_PRESET) return presetStack;
  if (selection === FONT_SELECTION_CUSTOM) return overrideStack ?? presetStack;
  return getThemeFontStack(selection);
}

/**
 * Determine if the current selection differs from DB state (has unsaved changes).
 *
 * @param selection - Current dropdown selection
 * @param overrideStack - Current DB override
 * @returns True if there are unsaved changes that can be saved
 */
export function hasUnsavedFontChanges(
  selection: FontSelectionValue,
  overrideStack: string | null
): boolean {
  // Cannot save custom values (not in allowlist)
  if (selection === FONT_SELECTION_CUSTOM) return false;
  // Resetting to preset is a change if there's currently an override
  if (selection === FONT_SELECTION_PRESET) return overrideStack !== null;
  // Selecting a specific font is a change if it differs from current
  return overrideStack !== getThemeFontStack(selection);
}

/**
 * Check if the save button should be disabled.
 *
 * @param canEdit - User has edit permission (Owner-only)
 * @param isPending - Save is in progress
 * @param selection - Current dropdown selection
 * @param overrideStack - Current DB override
 * @returns True if save button should be disabled
 */
export function isSaveDisabled(
  canEdit: boolean,
  isPending: boolean,
  selection: FontSelectionValue,
  overrideStack: string | null
): boolean {
  if (!canEdit) return true;
  if (isPending) return true;
  return !hasUnsavedFontChanges(selection, overrideStack);
}
