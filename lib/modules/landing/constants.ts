/**
 * Landing Section Constants
 *
 * Fixed values for landing section management.
 * Used by validators, admin-io, and UI components.
 *
 * @module lib/modules/landing/constants
 */

import type { PresetSectionKey, CustomSectionKey, LandingSectionType } from '@/lib/types/landing';

/**
 * Preset section keys - fixed sections with external data sources
 */
export const PRESET_SECTION_KEYS: readonly PresetSectionKey[] = [
  'hero',
  'about',
  'services',
  'platforms',
  'product_design',
  'portfolio',
  'contact',
] as const;

/**
 * Custom section keys - user-created sections with inline content
 */
export const CUSTOM_SECTION_KEYS: readonly CustomSectionKey[] = [
  'custom_1',
  'custom_2',
  'custom_3',
  'custom_4',
  'custom_5',
  'custom_6',
  'custom_7',
  'custom_8',
  'custom_9',
  'custom_10',
] as const;

/**
 * Maximum number of custom sections allowed
 */
export const MAX_CUSTOM_SECTIONS = 10;

/**
 * All valid section keys
 */
export const ALL_SECTION_KEYS = [...PRESET_SECTION_KEYS, ...CUSTOM_SECTION_KEYS] as const;

/**
 * Valid section types
 */
export const SECTION_TYPES: readonly LandingSectionType[] = [
  'text',
  'text_image',
  'cards',
  'gallery',
  'cta',
] as const;

/**
 * Sections that cannot be hidden (always visible)
 */
export const ALWAYS_VISIBLE_SECTIONS: readonly PresetSectionKey[] = [
  'hero',
  'contact',
] as const;

/**
 * Preset section type mapping (fixed types for preset sections)
 */
export const PRESET_SECTION_TYPES: Record<PresetSectionKey, LandingSectionType> = {
  hero: 'text_image',
  about: 'text_image',
  services: 'cards',
  platforms: 'cards',
  product_design: 'gallery',
  portfolio: 'gallery',
  contact: 'cta',
} as const;

/**
 * Gallery content default limit
 */
export const DEFAULT_GALLERY_LIMIT = 12;

/**
 * Gallery content limit range
 */
export const GALLERY_LIMIT_MIN = 1;
export const GALLERY_LIMIT_MAX = 12;
