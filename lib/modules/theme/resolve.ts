/**
 * Theme Resolver (Pure Module)
 *
 * Pure functions for resolving theme configuration to CSS variables.
 * This module is pure - no side effects, no fetch, no console, no Next/React imports.
 *
 * @module lib/modules/theme/resolve
 */

import type {
  ThemeKey,
  ThemeScopeKey,
  SiteConfigRow,
  TailwindCssVariables,
} from '@/lib/types/theme';
import { THEME_KEYS, DEFAULT_THEME_KEY, isDerivedCssVar } from '@/lib/types/theme';
import { THEME_PRESETS } from './presets';

type Rgb = { r: number; g: number; b: number };

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Type guard to check if a value is a valid ThemeKey.
 */
export function isValidThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && THEME_KEYS.includes(value as ThemeKey);
}

/**
 * Validate if a string is a valid hex color (#RRGGBB format).
 */
export function isValidHexColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Validate if a string is a valid CSS length value.
 * Accepts: 0, px, rem, em values (e.g., '0', '16px', '1.5rem', '2em')
 */
export function isValidCssLength(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // Match: 0, or number + unit (px, rem, em)
  return /^0$|^-?\d+(\.\d+)?(px|rem|em)$/.test(value);
}

/**
 * Validate if a string is a valid CSS shadow value.
 * Accepts standard box-shadow format: offset-x offset-y blur spread color
 * Examples:
 *   - '0 2px 8px rgba(0, 0, 0, 0.08)'
 *   - '0 4px 20px rgba(0, 212, 255, 0.15)'
 *   - 'none' or '0 0 0 rgba(0, 0, 0, 0)' for no shadow
 * 
 * Note: This is a simplified validation to prevent arbitrary CSS injection.
 * It allows rgba() colors and standard offset/blur/spread values.
 */
export function isValidShadowValue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // Allow 'none' for explicit no-shadow
  if (value === 'none') return true;
  // Match: x y blur [spread] color (simplified pattern for safety)
  // Pattern: numbers with optional units, followed by rgba/rgb/hex color
  return /^-?\d+(\.\d+)?(px)?\s+-?\d+(\.\d+)?(px)?\s+\d+(\.\d+)?(px)?\s*(\d+(\.\d+)?(px)?\s+)?(rgba?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})$/.test(value);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToTriplet(rgb: Rgb): string {
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

function rgbToHex(rgb: Rgb): string {
  const r = clampByte(rgb.r).toString(16).padStart(2, '0');
  const g = clampByte(rgb.g).toString(16).padStart(2, '0');
  const b = clampByte(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Mix two RGB colors.
 * @param base - Base color (weight 1 - mix)
 * @param overlay - Overlay color (weight mix)
 * @param mix - Overlay weight (0..1)
 */
function mixRgb(base: Rgb, overlay: Rgb, mix: number): Rgb {
  const wBase = 1 - mix;
  return {
    r: clampByte(base.r * wBase + overlay.r * mix),
    g: clampByte(base.g * wBase + overlay.g * mix),
    b: clampByte(base.b * wBase + overlay.b * mix),
  };
}

/**
 * Parse hex color to RGB values.
 * Returns null if invalid.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate a hover color from a base hex color.
 * Lightens or darkens slightly based on the base color's luminance.
 */
export function calculateHoverColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  // Darken for light colors, lighten for dark colors
  const factor = luminance > 0.5 ? 0.9 : 1.1;

  const r = clampByte(rgb.r * factor);
  const g = clampByte(rgb.g * factor);
  const b = clampByte(rgb.b * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// =============================================================================
// Theme Resolution
// =============================================================================

/**
 * Resolve which theme key to use for a given scope.
 *
 * Priority:
 * 1. page_themes[scope] if valid
 * 2. global_theme if valid
 * 3. DEFAULT_THEME_KEY fallback
 */
export function resolveThemeKey(
  config: SiteConfigRow | null,
  scope: ThemeScopeKey
): ThemeKey {
  // Try page-specific theme first
  if (config?.page_themes?.[scope]) {
    const pageTheme = config.page_themes[scope];
    if (isValidThemeKey(pageTheme)) {
      return pageTheme;
    }
  }

  // Fall back to global theme
  if (config?.global_theme && isValidThemeKey(config.global_theme)) {
    return config.global_theme;
  }

  // Ultimate fallback
  return DEFAULT_THEME_KEY;
}

// =============================================================================
// CSS Variable Generation
// =============================================================================

/**
 * Build Tailwind-compatible CSS variables from theme accent color.
 */
function buildTailwindVars(args: {
  themeKey: ThemeKey;
  themeBg: string;
  themeText: string;
  themeAccent: string;
}): TailwindCssVariables {
  const { themeKey, themeBg, themeText, themeAccent } = args;

  const fallbackBgRgb: Rgb = { r: 255, g: 255, b: 255 };
  const fallbackTextRgb: Rgb = { r: 29, g: 29, b: 31 };

  const bgRgb = hexToRgb(themeBg) ?? fallbackBgRgb;
  const textRgb = hexToRgb(themeText) ?? fallbackTextRgb;
  const accentRgb = hexToRgb(themeAccent) ?? { r: 0, g: 113, b: 227 };

  // Detect dark background for better derived colors
  const luminance = (0.299 * bgRgb.r + 0.587 * bgRgb.g + 0.114 * bgRgb.b) / 255;
  const isDarkBg = luminance < 0.35;

  const hoverColor = calculateHoverColor(themeAccent);
  const hoverRgb = hexToRgb(hoverColor) ?? accentRgb;

  // Secondary: blend text over background (~0.72 opacity) but store as solid for Tailwind alpha support
  const secondaryRgb = mixRgb(bgRgb, textRgb, 0.72);

  // Surface tokens derived from background (light: slightly darker, dark: slightly lighter)
  const surfaceRgb = isDarkBg
    ? mixRgb(bgRgb, { r: 255, g: 255, b: 255 }, 0.08)
    : mixRgb(bgRgb, { r: 0, g: 0, b: 0 }, 0.04);

  const surfaceHoverRgb = isDarkBg
    ? mixRgb(bgRgb, { r: 255, g: 255, b: 255 }, 0.12)
    : mixRgb(bgRgb, { r: 0, g: 0, b: 0 }, 0.07);

  const surfaceRaisedRgb = isDarkBg
    ? mixRgb(bgRgb, { r: 255, g: 255, b: 255 }, 0.12)
    : bgRgb;

  const surfaceRaisedHoverRgb = isDarkBg ? surfaceHoverRgb : surfaceRgb;

  // Border tokens (light: darker, dark: lighter)
  const borderRgb = isDarkBg
    ? mixRgb(bgRgb, { r: 255, g: 255, b: 255 }, 0.14)
    : mixRgb(bgRgb, { r: 0, g: 0, b: 0 }, 0.18);

  const borderLightRgb = isDarkBg
    ? mixRgb(bgRgb, { r: 255, g: 255, b: 255 }, 0.10)
    : mixRgb(bgRgb, { r: 0, g: 0, b: 0 }, 0.10);

  // Glass vars used by .glass/.glass-card utilities
  const glassSurface = themeKey === 'glassmorphism'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.72)';
  const glassBorder = themeKey === 'glassmorphism'
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.08)';

  return {
    // Base colors (string values)
    '--background': rgbToHex(bgRgb),
    '--background-rgb': rgbToTriplet(bgRgb),
    '--foreground': rgbToHex(textRgb),
    '--foreground-rgb': rgbToTriplet(textRgb),
    '--primary': rgbToHex(accentRgb),
    '--primary-rgb': rgbToTriplet(accentRgb),
    '--primary-hover': hoverColor,
    '--primary-hover-rgb': rgbToTriplet(hoverRgb),
    // Used by global gradients
    '--theme-rgb': rgbToTriplet(accentRgb),
    '--secondary': rgbToHex(secondaryRgb),
    '--secondary-rgb': rgbToTriplet(secondaryRgb),
    '--surface': rgbToHex(surfaceRgb),
    '--surface-rgb': rgbToTriplet(surfaceRgb),
    '--surface-hover': rgbToHex(surfaceHoverRgb),
    '--surface-hover-rgb': rgbToTriplet(surfaceHoverRgb),
    '--surface-raised': rgbToHex(surfaceRaisedRgb),
    '--surface-raised-rgb': rgbToTriplet(surfaceRaisedRgb),
    '--surface-raised-hover': rgbToHex(surfaceRaisedHoverRgb),
    '--surface-raised-hover-rgb': rgbToTriplet(surfaceRaisedHoverRgb),
    '--border': rgbToHex(borderRgb),
    '--border-rgb': rgbToTriplet(borderRgb),
    '--border-light': rgbToHex(borderLightRgb),
    '--border-light-rgb': rgbToTriplet(borderLightRgb),
    '--glass-surface': glassSurface,
    '--glass-border': glassBorder,
  };
}
/**
 * Build complete CSS variables for a theme configuration.
 *
 * Theme v2 Merge Priority (later overrides earlier):
 * 1. Preset base variables (from lib/modules/theme/presets.ts)
 * 2. theme_overrides[themeKey] (per-layout customization, Theme v2)
 * 3. Derived Tailwind-compatible variables (surface, border, glass, etc.)
 *
 * Note: Only keys in CUSTOMIZABLE_CSS_VARS are allowed for theme_overrides.
 * See lib/types/theme.ts for the whitelist definition.
 *
 * @see ARCHITECTURE.md section 2 (Theme v2 架構)
 */
export function buildThemeCssVars(args: {
  themeKey: ThemeKey;
  themeOverrides?: Record<string, Record<string, string | null>> | null;
}): Record<string, string> {
  const { themeKey, themeOverrides } = args;

  // Step 1: Get preset base variables (fallback to tech-pro if invalid)
  const preset = THEME_PRESETS[themeKey] ?? THEME_PRESETS[DEFAULT_THEME_KEY];
  const baseVars: Record<string, string> = { ...preset.variables };

  // Collect derived var overrides to apply after tailwind vars generation
  const derivedOverrides: Record<string, string> = {};

  // Step 2: Apply per-layout theme_overrides (Theme v2)
  // Only keys present in the JSONB are applied; validates at write time via admin actions
  // Separate base vars from derived vars
  const layoutOverrides = themeOverrides?.[themeKey];
  if (layoutOverrides) {
    for (const [key, value] of Object.entries(layoutOverrides)) {
      if (key.startsWith('--') && typeof value === 'string') {
        if (isDerivedCssVar(key)) {
          // Save derived overrides for later (after tailwind vars)
          derivedOverrides[key] = value;
        } else {
          // Apply base var overrides immediately
          baseVars[key] = value;
        }
      }
    }
  }

  // Step 3: Build derived Tailwind-compatible variables
  const themeAccent = baseVars['--theme-accent'];
  const tailwindVars = buildTailwindVars({
    themeKey,
    themeAccent,
    themeBg: baseVars['--theme-bg'],
    themeText: baseVars['--theme-text'],
  });

  // Step 4: Apply derived var overrides AFTER tailwind vars generation
  // This allows users to override surface/border colors even though they are derived
  const finalVars = {
    ...baseVars,
    ...tailwindVars,
    ...derivedOverrides, // Derived overrides take highest priority
  };

  return finalVars;
}

/**
 * Get full resolved theme including CSS variables and animation flag.
 */
export function resolveTheme(
  config: SiteConfigRow | null,
  scope: ThemeScopeKey
): {
  themeKey: ThemeKey;
  variables: Record<string, string>;
  enableAnimations: boolean;
} {
  const themeKey = resolveThemeKey(config, scope);
  const preset = THEME_PRESETS[themeKey] ?? THEME_PRESETS[DEFAULT_THEME_KEY];

  const variables = buildThemeCssVars({
    themeKey,
    themeOverrides: config?.theme_overrides,
  });

  return {
    themeKey,
    variables,
    enableAnimations: preset.enableAnimations,
  };
}
