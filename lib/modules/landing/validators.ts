/**
 * Landing Section Validators
 *
 * Pure validation functions for landing section inputs.
 * No IO operations - safe for use anywhere.
 *
 * @module lib/modules/landing/validators
 */

import type {
  LandingSectionType,
  GalleryContent,
} from '@/lib/types/landing';

import {
  SECTION_TYPES,
  ALL_SECTION_KEYS,
  PRESET_SECTION_KEYS,
  CUSTOM_SECTION_KEYS,
  GALLERY_LIMIT_MIN,
  GALLERY_LIMIT_MAX,
} from '@/lib/modules/landing/constants';

// ============================================
// Type Guards
// ============================================

/**
 * Check if value is a valid section type
 */
export function isValidSectionType(type: unknown): type is LandingSectionType {
  return typeof type === 'string' && SECTION_TYPES.includes(type as LandingSectionType);
}

/**
 * Check if value is a valid section key (preset or custom)
 */
export function isValidSectionKey(key: unknown): key is string {
  return typeof key === 'string' && ALL_SECTION_KEYS.includes(key as typeof ALL_SECTION_KEYS[number]);
}

/**
 * Check if section key is a preset section
 */
export function isPresetSection(key: string): boolean {
  return PRESET_SECTION_KEYS.includes(key as typeof PRESET_SECTION_KEYS[number]);
}

/**
 * Check if section key is a custom section
 */
export function isCustomSection(key: string): boolean {
  return CUSTOM_SECTION_KEYS.includes(key as typeof CUSTOM_SECTION_KEYS[number]);
}

// ============================================
// Content Validators
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate TextContent
 */
export function validateTextContent(content: unknown): ValidationResult {
  const errors: string[] = [];

  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['Content must be an object'] };
  }

  const c = content as Record<string, unknown>;

  if (typeof c.body !== 'string' || c.body.trim() === '') {
    errors.push('body is required and must be a non-empty string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate TextImageContent
 */
export function validateTextImageContent(content: unknown): ValidationResult {
  const errors: string[] = [];

  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['Content must be an object'] };
  }

  const c = content as Record<string, unknown>;

  if (typeof c.body !== 'string') {
    errors.push('body must be a string');
  }

  if (typeof c.image_url !== 'string' || c.image_url.trim() === '') {
    errors.push('image_url is required');
  }

  if (typeof c.image_alt !== 'string' || c.image_alt.trim() === '') {
    errors.push('image_alt is required');
  }

  if (c.image_position !== undefined && c.image_position !== 'left' && c.image_position !== 'right') {
    errors.push('image_position must be "left" or "right"');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate CardsContent
 */
export function validateCardsContent(content: unknown): ValidationResult {
  const errors: string[] = [];

  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['Content must be an object'] };
  }

  const c = content as Record<string, unknown>;

  // Validate columns
  if (c.columns !== undefined && ![2, 3, 4].includes(c.columns as number)) {
    errors.push('columns must be 2, 3, or 4');
  }

  // Validate items array
  if (!Array.isArray(c.items)) {
    errors.push('items must be an array');
  } else {
    c.items.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`items[${index}] must be an object`);
        return;
      }

      const i = item as Record<string, unknown>;

      if (typeof i.title !== 'string' || i.title.trim() === '') {
        errors.push(`items[${index}].title is required`);
      }

      if (typeof i.description !== 'string') {
        errors.push(`items[${index}].description must be a string`);
      }

      // If image_url is provided, image_alt is required
      if (i.image_url && typeof i.image_url === 'string' && i.image_url.trim() !== '') {
        if (typeof i.image_alt !== 'string' || i.image_alt.trim() === '') {
          errors.push(`items[${index}].image_alt is required when image_url is provided`);
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate GalleryContent
 */
export function validateGalleryContent(content: unknown): ValidationResult {
  const errors: string[] = [];

  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['Content must be an object'] };
  }

  const c = content as Record<string, unknown>;

  if (typeof c.limit !== 'number') {
    errors.push('limit must be a number');
  } else if (c.limit < GALLERY_LIMIT_MIN || c.limit > GALLERY_LIMIT_MAX) {
    errors.push(`limit must be between ${GALLERY_LIMIT_MIN} and ${GALLERY_LIMIT_MAX}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate CtaContent
 */
export function validateCtaContent(content: unknown): ValidationResult {
  const errors: string[] = [];

  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['Content must be an object'] };
  }

  const c = content as Record<string, unknown>;

  if (typeof c.body !== 'string') {
    errors.push('body must be a string');
  }

  if (typeof c.button_text !== 'string' || c.button_text.trim() === '') {
    errors.push('button_text is required');
  }

  if (typeof c.button_url !== 'string' || c.button_url.trim() === '') {
    errors.push('button_url is required');
  }

  if (c.style !== undefined && c.style !== 'primary' && c.style !== 'secondary') {
    errors.push('style must be "primary" or "secondary"');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate content based on section type
 */
export function validateContent(
  sectionType: LandingSectionType,
  content: unknown
): ValidationResult {
  switch (sectionType) {
    case 'text':
      return validateTextContent(content);
    case 'text_image':
      return validateTextImageContent(content);
    case 'cards':
      return validateCardsContent(content);
    case 'gallery':
      return validateGalleryContent(content);
    case 'cta':
      return validateCtaContent(content);
    default:
      return { valid: false, errors: [`Unknown section type: ${sectionType}`] };
  }
}

/**
 * Validate that gallery content limits match between locales
 */
export function validateGalleryLimitConsistency(
  contentEn: unknown,
  contentZh: unknown
): ValidationResult {
  const errors: string[] = [];

  if (!contentEn && !contentZh) {
    return { valid: true, errors: [] };
  }

  const enLimit = (contentEn as GalleryContent | null)?.limit;
  const zhLimit = (contentZh as GalleryContent | null)?.limit;

  if (enLimit !== undefined && zhLimit !== undefined && enLimit !== zhLimit) {
    errors.push('Gallery limit must be the same for both languages');
  }

  return { valid: errors.length === 0, errors };
}
