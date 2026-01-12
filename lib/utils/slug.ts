/**
 * Unified slug generation utility
 * 
 * Single source of truth for generating URL-friendly slugs
 * - Lowercase
 * - Spaces → hyphens
 * - Remove special characters (except Chinese/Unicode)
 * - Collapse multiple hyphens
 * - Trim
 */

/**
 * Generate a URL-friendly slug from text
 * Supports both English and Chinese/Unicode characters
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}_\s-]/gu, '') // Keep letters, numbers, underscores, spaces, hyphens (Unicode-safe)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}
