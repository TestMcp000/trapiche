/**
 * Theme Presets (Pure Module)
 *
 * Single source of truth for theme preset definitions.
 * This module is pure - no side effects, no fetch, no console, no Next/React imports.
 *
 * @module lib/modules/theme/presets
 */

import type { ThemeKey, ThemePreset, ThemeVariables } from '@/lib/types/theme';

// =============================================================================
// Theme Presets Definition
// =============================================================================

/**
 * tech-pro: Default Apple/Google-inspired tech style.
 * Clean, professional, blue accent.
 */
const TECH_PRO_VARIABLES: ThemeVariables = {
  '--theme-bg': '#ffffff',
  '--theme-text': '#1d1d1f',
  '--theme-accent': '#0071e3',
  '--theme-accent-rgb': '0 113 227',
  '--theme-radius': '6px',
  '--theme-radius-lg': '12px',
  '--theme-blur': '0px',
  '--theme-font': 'system-ui, -apple-system, sans-serif',
  '--theme-spacing': '1',
  '--theme-filter': 'none',
  '--theme-shadow': '0 2px 8px rgba(0, 0, 0, 0.08)',
  '--theme-shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
};

/**
 * japanese-airy: Minimalist Japanese aesthetic.
 * Light, airy, subtle colors, generous whitespace.
 */
const JAPANESE_AIRY_VARIABLES: ThemeVariables = {
  '--theme-bg': '#F9F8F6',
  '--theme-text': '#3D3D3D',
  '--theme-accent': '#6B8CAE',
  '--theme-accent-rgb': '107 140 174',
  '--theme-radius': '24px',
  '--theme-radius-lg': '32px',
  '--theme-blur': '0px',
  '--theme-font': "ui-serif, 'Noto Serif TC', 'Songti TC', 'PMingLiU', serif",
  '--theme-spacing': '1.5',
  '--theme-filter': 'saturate(0.9) brightness(1.02)',
  '--theme-shadow': '0 4px 16px rgba(61, 61, 61, 0.06)',
  '--theme-shadow-lg': '0 12px 40px rgba(61, 61, 61, 0.10)',
};

/**
 * glassmorphism: Glass morphism design.
 * Translucent layers, blur effects, vibrant accents.
 */
const GLASSMORPHISM_VARIABLES: ThemeVariables = {
  '--theme-bg': '#0A0A0C',
  '--theme-text': '#E5E5E7',
  '--theme-accent': '#00D4FF',
  '--theme-accent-rgb': '0 212 255',
  '--theme-radius': '16px',
  '--theme-radius-lg': '24px',
  '--theme-blur': '12px',
  '--theme-font': 'system-ui, -apple-system, sans-serif',
  '--theme-spacing': '1',
  '--theme-filter': 'none',
  '--theme-shadow': '0 4px 20px rgba(0, 212, 255, 0.15)',
  '--theme-shadow-lg': '0 8px 40px rgba(0, 212, 255, 0.25)',
};

/**
 * scrollytelling: Dynamic scroll-based storytelling.
 * Cinematic feel, strong typography, animation-ready.
 */
const SCROLLYTELLING_VARIABLES: ThemeVariables = {
  '--theme-bg': '#ffffff',
  '--theme-text': '#000000',
  '--theme-accent': '#FF3366',
  '--theme-accent-rgb': '255 51 102',
  '--theme-radius': '0px',
  '--theme-radius-lg': '0px',
  '--theme-blur': '0px',
  '--theme-font': 'system-ui, -apple-system, sans-serif',
  '--theme-spacing': '1',
  '--theme-filter': 'none',
  '--theme-shadow': '0 0 0 rgba(0, 0, 0, 0)',
  '--theme-shadow-lg': '0 0 0 rgba(0, 0, 0, 0)',
};

// =============================================================================
// Exported Preset Map
// =============================================================================

/**
 * All available theme presets.
 * This is the single source of truth for preset values.
 */
export const THEME_PRESETS: Record<ThemeKey, ThemePreset> = {
  'tech-pro': {
    name: 'Tech Pro',
    description: 'Clean, professional Apple/Google-inspired style',
    variables: TECH_PRO_VARIABLES,
    enableAnimations: false,
  },
  'japanese-airy': {
    name: 'Japanese Airy',
    description: 'Minimalist Japanese aesthetic with subtle elegance',
    variables: JAPANESE_AIRY_VARIABLES,
    enableAnimations: false,
  },
  glassmorphism: {
    name: 'Glassmorphism',
    description: 'Modern glass morphism with blur effects',
    variables: GLASSMORPHISM_VARIABLES,
    enableAnimations: false,
  },
  scrollytelling: {
    name: 'Scrollytelling',
    description: 'Dynamic scroll-based storytelling with animations',
    variables: SCROLLYTELLING_VARIABLES,
    enableAnimations: true,
  },
};
