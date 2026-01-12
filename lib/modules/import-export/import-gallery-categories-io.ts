/**
 * Gallery Categories Import IO Module (Server-only)
 *
 * Handles gallery categories import operations (preview and apply).
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 * @see uiux_refactor.md §6.1.3 Phase 2
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { parseGalleryCategoriesJson } from './parsers/gallery-categories-json';
import { validateGalleryCategory } from './validators/gallery';
import type { GalleryCategoryImportData } from '@/lib/types/import-export';
import type { ImportPreviewItem, GalleryImportPreview, GalleryImportResult } from './import-gallery-items-io';

// =============================================================================
// Preview (Dry Run)
// =============================================================================

/**
 * Preview a gallery categories import without writing to database.
 *
 * @param jsonString - The uploaded JSON file as a string
 * @returns Preview result with validation details
 */
export async function previewGalleryCategoriesImport(
  jsonString: string
): Promise<GalleryImportPreview> {
  // Parse JSON
  const parseResult = parseGalleryCategoriesJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      categories: { total: 0, valid: 0, items: [] },
      items: { total: 0, valid: 0, items: [] },
      missingCategories: [],
    };
  }

  const categories = parseResult.data;

  // Validate each category
  const categoryPreviews: ImportPreviewItem[] = [];
  let validCount = 0;

  for (const category of categories) {
    const validationResult = validateGalleryCategory(category);
    
    if (validationResult.valid) {
      validCount++;
      categoryPreviews.push({
        slug: category.slug,
        title: category.name_en,
        valid: true,
      });
    } else {
      categoryPreviews.push({
        slug: category.slug,
        title: category.name_en,
        valid: false,
        errors: Object.fromEntries(
          validationResult.errors.map((e) => [e.field, e.message])
        ),
      });
    }
  }

  return {
    success: true,
    categories: {
      total: categories.length,
      valid: validCount,
      items: categoryPreviews,
    },
    items: { total: 0, valid: 0, items: [] },
    missingCategories: [],
  };
}

// =============================================================================
// Apply Import
// =============================================================================

/**
 * Import gallery categories to database.
 *
 * @param categories - Array of validated category data
 * @returns Import result
 */
async function importCategories(
  categories: GalleryCategoryImportData[]
): Promise<{ imported: number; errors: Array<{ slug: string; error: string }> }> {
  const supabase = await createClient();
  const errors: Array<{ slug: string; error: string }> = [];
  let imported = 0;

  for (const category of categories) {
    const { error } = await supabase
      .from('gallery_categories')
      .upsert({
        slug: category.slug,
        name_en: category.name_en,
        name_zh: category.name_zh,
        sort_order: category.sort_order,
        is_visible: category.is_visible,
      }, { onConflict: 'slug' });

    if (error) {
      errors.push({ slug: category.slug, error: error.message });
    } else {
      imported++;
    }
  }

  return { imported, errors };
}

/**
 * Apply a gallery categories import to the database.
 *
 * @param jsonString - The uploaded JSON file as a string
 * @returns Import result
 */
export async function applyGalleryCategoriesImport(
  jsonString: string
): Promise<GalleryImportResult> {
  // Parse JSON
  const parseResult = parseGalleryCategoriesJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      categoriesImported: 0,
      itemsImported: 0,
      errors: [],
    };
  }

  // Import categories
  const { imported, errors } = await importCategories(parseResult.data);

  return {
    success: errors.length === 0,
    categoriesImported: imported,
    itemsImported: 0,
    errors,
  };
}
