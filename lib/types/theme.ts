/**
 * Theme System Types
 *
 * Single source of truth for all theme-related types.
 * See ARCHITECTURE.md section 2 (Theme tokens) for design rationale.
 *
 * @module lib/types/theme
 */

// =============================================================================
// Page Scope Keys (固定 4 個，對應 ARCHITECTURE.md §3.1)
// =============================================================================

/**
 * Page scope keys for per-page theme configuration.
 * - `home`: Homepage (`/${locale}`)
 * - `blog`: Blog section (`/${locale}/blog/*`)
 * - `gallery`: Gallery section (`/${locale}/gallery/*`)
 * - `shop`: Shop section (`/${locale}/shop/*`)
 */
export type ThemeScopeKey = 'home' | 'blog' | 'gallery' | 'shop';

/** All valid scope keys for iteration */
export const THEME_SCOPE_KEYS: readonly ThemeScopeKey[] = [
  'home',
  'blog',
  'gallery',
  'shop',
] as const;

// =============================================================================
// Theme Keys (PRD 規定的 4 個 preset)
// =============================================================================

/**
 * Available theme presets.
 * - `tech-pro`: Default Apple/Google-inspired tech style
 * - `japanese-airy`: Minimalist Japanese aesthetic
 * - `glassmorphism`: Glass morphism design
 * - `scrollytelling`: Dynamic scroll-based storytelling (requires animations)
 */
export type ThemeKey = 'tech-pro' | 'japanese-airy' | 'glassmorphism' | 'scrollytelling';

/** All valid theme keys for iteration */
export const THEME_KEYS: readonly ThemeKey[] = [
  'tech-pro',
  'japanese-airy',
  'glassmorphism',
  'scrollytelling',
] as const;

/** Default theme key when none is specified */
export const DEFAULT_THEME_KEY: ThemeKey = 'tech-pro';

// =============================================================================
// Font Presets (system fonts only; see ARCHITECTURE.md)
// =============================================================================

/**
 * Allowed font preset keys for admin font switching.
 * Note: Values are mapped to system font stacks in `lib/theme/fonts.ts`.
 */
export type ThemeFontKey =
  | 'system-sans'
  | 'system-serif'
  | 'tc-sans'
  | 'tc-serif'
  | 'system-mono';

/** All valid font keys for iteration */
export const THEME_FONT_KEYS: readonly ThemeFontKey[] = [
  'system-sans',
  'system-serif',
  'tc-sans',
  'tc-serif',
  'system-mono',
] as const;

// =============================================================================
// CSS Variables Interface (PRD tokens from ARCHITECTURE.md §2)
// =============================================================================

/**
 * Core theme CSS variables required by PRD.
 * Each preset must define all of these tokens.
 */
export interface ThemeVariables {
  /** Background color */
  '--theme-bg': string;
  /** Text color */
  '--theme-text': string;
  /** Accent/primary color */
  '--theme-accent': string;
  /** Accent color as RGB values (e.g., "0, 113, 227") */
  '--theme-accent-rgb': string;
  /** Border radius for small elements */
  '--theme-radius': string;
  /** Border radius for large elements */
  '--theme-radius-lg': string;
  /** Backdrop blur amount */
  '--theme-blur': string;
  /** Font family stack */
  '--theme-font': string;
  /** Base spacing unit */
  '--theme-spacing': string;
  /** CSS filter for images/effects */
  '--theme-filter': string;
  /** Box shadow for cards/elevated elements */
  '--theme-shadow': string;
  /** Box shadow for larger elevated elements */
  '--theme-shadow-lg': string;
}

// =============================================================================
// Theme Preset Structure
// =============================================================================

/**
 * Complete theme preset definition.
 */
export interface ThemePreset {
  /** Display name for admin UI */
  name: string;
  /** Description for admin UI */
  description: string;
  /** CSS variable values */
  variables: ThemeVariables;
  /** Whether this theme uses scroll-based animations */
  enableAnimations: boolean;
}

// =============================================================================
// Customizable CSS Variables Whitelist (Theme v2)
// =============================================================================

/**
 * CSS variables that can be customized per-layout via admin UI.
 * This whitelist prevents arbitrary CSS injection.
 *
 * Organized into categories for clarity:
 * - BASE_TOKENS: Core theme tokens (applied before derived vars)
 * - DERIVED_TOKENS: Generated tokens (can be overridden after generation)
 *
 * @see ARCHITECTURE.md section 2 (Theme v2)
 */

/** Core theme tokens that feed into derived calculations */
export const BASE_CUSTOMIZABLE_VARS = [
  // Core theme colors
  '--theme-bg',
  '--theme-text',
  '--theme-accent',
  // Typography
  '--theme-font',
  // Border radius
  '--theme-radius',
  '--theme-radius-lg',
  // Shadows
  '--theme-shadow',
  '--theme-shadow-lg',
] as const;

/** Derived tokens that are generated from base tokens but can be overridden */
export const DERIVED_CUSTOMIZABLE_VARS = [
  // Surface colors (derived from --theme-bg)
  '--surface',
  '--surface-hover',
  '--surface-raised',
  '--surface-raised-hover',
  // Border colors (derived from --theme-bg)
  '--border',
  '--border-light',
] as const;

/** All customizable CSS variables (union of base + derived) */
export const CUSTOMIZABLE_CSS_VARS = [
  ...BASE_CUSTOMIZABLE_VARS,
  ...DERIVED_CUSTOMIZABLE_VARS,
] as const;

/** Type for base customizable CSS variable keys */
export type BaseCustomizableCssVar = (typeof BASE_CUSTOMIZABLE_VARS)[number];

/** Type for derived customizable CSS variable keys */
export type DerivedCustomizableCssVar = (typeof DERIVED_CUSTOMIZABLE_VARS)[number];

/** Type for all customizable CSS variable keys */
export type CustomizableCssVar = (typeof CUSTOMIZABLE_CSS_VARS)[number];

/**
 * Type guard to check if a string is a valid customizable CSS variable.
 * Use this in server actions to validate incoming override keys.
 */
export function isCustomizableCssVar(key: string): key is CustomizableCssVar {
  return (CUSTOMIZABLE_CSS_VARS as readonly string[]).includes(key);
}

/**
 * Type guard to check if a string is a derived CSS variable.
 * Derived vars need special handling in the resolver (applied after tailwind vars).
 */
export function isDerivedCssVar(key: string): key is DerivedCustomizableCssVar {
  return (DERIVED_CUSTOMIZABLE_VARS as readonly string[]).includes(key);
}

/**
 * Per-layout token overrides structure.
 * Each ThemeKey can have its own set of CSS variable overrides.
 *
 * Used in: site_config.theme_overrides JSONB column
 *
 * @example
 * {
 *   "tech-pro": { "--theme-accent": "#FF0000" },
 *   "glassmorphism": { "--theme-radius": "20px", "--theme-shadow": "0 8px 32px rgba(0,0,0,0.3)" }
 * }
 */
export type ThemeOverrides = Partial<
  Record<ThemeKey, Partial<Record<CustomizableCssVar, string | null>>>
>;

// =============================================================================
// Database Types (site_config singleton)
// =============================================================================

/**
 * Database row type for `site_config` table.
 * Uses singleton pattern (id=1, enforced by CHECK constraint).
 */
export interface SiteConfigRow {
  /** Always 1 (singleton) */
  id: number;
  /** Global theme key */
  global_theme: string;
  /** Per-page theme overrides */
  page_themes: Partial<Record<ThemeScopeKey, ThemeKey>>;
  /** Per-layout token overrides (Theme v2) */
  theme_overrides: ThemeOverrides;
  /** Last update timestamp (UTC ISO) */
  updated_at: string;
  /** User ID who made the last update */
  updated_by: string | null;
}

// =============================================================================
// Admin Action Types
// =============================================================================

/**
 * Input type for admin theme update actions.
 * All fields are optional; only specified fields will be updated.
 */
export interface UpdateThemeRequest {
  /** New global theme key */
  global_theme?: ThemeKey;
  /** Per-page theme updates (partial, merged with existing) */
  page_themes?: Partial<Record<ThemeScopeKey, ThemeKey>>;
  /** Per-layout token overrides (Theme v2, merged with existing) */
  theme_overrides?: ThemeOverrides;
}

// =============================================================================
// Resolver Output Types
// =============================================================================

/**
 * Resolved theme result from `resolveThemeKey()` + `buildThemeCssVars()`.
 */
export interface ResolvedTheme {
  /** The resolved theme key */
  themeKey: ThemeKey;
  /** Complete CSS variables (PRD tokens + Tailwind tokens) */
  variables: Record<string, string>;
  /** Whether animations should be enabled */
  enableAnimations: boolean;
}

// =============================================================================
// Tailwind-Compatible CSS Variables
// =============================================================================

/**
 * CSS variables required by Tailwind config.
 * These are generated from theme presets and injected alongside PRD tokens.
 */
export interface TailwindCssVariables {
  '--background': string;
  '--background-rgb': string;
  '--foreground': string;
  '--foreground-rgb': string;
  '--primary': string;
  '--primary-rgb': string;
  '--primary-hover': string;
  '--primary-hover-rgb': string;
  '--theme-rgb': string;
  '--secondary': string;
  '--secondary-rgb': string;
  '--surface': string;
  '--surface-rgb': string;
  '--surface-hover': string;
  '--surface-hover-rgb': string;
  '--surface-raised': string;
  '--surface-raised-rgb': string;
  '--surface-raised-hover': string;
  '--surface-raised-hover-rgb': string;
  '--border': string;
  '--border-rgb': string;
  '--border-light': string;
  '--border-light-rgb': string;
  '--glass-surface': string;
  '--glass-border': string;
}
