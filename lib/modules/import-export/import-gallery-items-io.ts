/**
 * Gallery Items Import IO Module (Server-only)
 *
 * Handles gallery items import operations (preview and apply).
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 * @see uiux_refactor.md §6.1.3 Phase 2
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { parseGalleryItemsJson } from './parsers/gallery-items-json';
import { validateGalleryItem } from './validators/gallery';
import type { GalleryItemImportData } from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

/** Individual item preview in import */
export interface ImportPreviewItem {
  slug: string;
  title?: string;
  valid: boolean;
  errors?: Record<string, string>;
  warnings?: string[];
}

/** Import preview result (dry run) */
export interface GalleryImportPreview {
  success: boolean;
  error?: string;
  categories: {
    total: number;
    valid: number;
    items: ImportPreviewItem[];
  };
  items: {
    total: number;
    valid: number;
    items: ImportPreviewItem[];
  };
  missingCategories: string[];
}

/** Import apply result */
export interface GalleryImportResult {
  success: boolean;
  error?: string;
  categoriesImported: number;
  itemsImported: number;
  errors: Array<{ slug: string; error: string }>;
}

// =============================================================================
// Preview (Dry Run)
// =============================================================================

/**
 * Preview a gallery items import without writing to database.
 *
 * @param jsonString - The uploaded JSON file as a string
 * @returns Preview result with validation details
 */
export async function previewGalleryItemsImport(
  jsonString: string
): Promise<GalleryImportPreview> {
  // Parse JSON
  const parseResult = parseGalleryItemsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      categories: { total: 0, valid: 0, items: [] },
      items: { total: 0, valid: 0, items: [] },
      missingCategories: [],
    };
  }

  const items = parseResult.data;

  // Get existing categories from DB
  const supabase = await createClient();
  const { data: existingCategories } = await supabase
    .from('gallery_categories')
    .select('slug');

  const existingCategorySlugs = new Set(
    (existingCategories ?? []).map((c) => c.slug)
  );

  // Validate each item
  const missingCategories = new Set<string>();
  const itemPreviews: ImportPreviewItem[] = [];
  let validCount = 0;

  for (const item of items) {
    const validationResult = validateGalleryItem(item, existingCategorySlugs);
    
    if (validationResult.valid) {
      validCount++;
      itemPreviews.push({
        slug: item.slug,
        title: item.title_en,
        valid: true,
      });
    } else {
      itemPreviews.push({
        slug: item.slug,
        title: item.title_en,
        valid: false,
        errors: Object.fromEntries(
          validationResult.errors.map((e) => [e.field, e.message])
        ),
      });

      // Track missing categories
      for (const err of validationResult.errors) {
        if (err.field === 'category' && err.message.includes('does not exist')) {
          missingCategories.add(item.category_slug);
        }
      }
    }
  }

  return {
    success: true,
    categories: { total: 0, valid: 0, items: [] },
    items: {
      total: items.length,
      valid: validCount,
      items: itemPreviews,
    },
    missingCategories: [...missingCategories],
  };
}

// =============================================================================
// Apply Import
// =============================================================================

/**
 * Import gallery items to database.
 *
 * @param items - Array of validated item data
 * @returns Import result
 */
async function importItems(
  items: GalleryItemImportData[]
): Promise<{ imported: number; errors: Array<{ slug: string; error: string }> }> {
  const supabase = await createClient();
  const errors: Array<{ slug: string; error: string }> = [];
  let imported = 0;

  // Get category ID map
  const { data: categories } = await supabase
    .from('gallery_categories')
    .select('id, slug');

  const categoryIdMap = new Map(
    (categories ?? []).map((c) => [c.slug, c.id])
  );

  for (const item of items) {
    const categoryId = categoryIdMap.get(item.category_slug);
    if (!categoryId) {
      errors.push({ slug: item.slug, error: `Category '${item.category_slug}' not found` });
      continue;
    }

    const { error } = await supabase
      .from('gallery_items')
      .upsert({
        slug: item.slug,
        category_id: categoryId,
        title_en: item.title_en,
        title_zh: item.title_zh,
        description_en: item.description_en,
        description_zh: item.description_zh,
        image_url: item.image_url,
        image_alt_en: item.image_alt_en,
        image_alt_zh: item.image_alt_zh,
        material_en: item.material_en,
        material_zh: item.material_zh,
        tags_en: item.tags_en,
        tags_zh: item.tags_zh,
        is_visible: item.is_visible,
      }, { onConflict: 'slug' });

    if (error) {
      errors.push({ slug: item.slug, error: error.message });
    } else {
      imported++;
    }
  }

  return { imported, errors };
}

/**
 * Apply a gallery items import to the database.
 *
 * @param jsonString - The uploaded JSON file as a string
 * @returns Import result
 */
export async function applyGalleryItemsImport(
  jsonString: string
): Promise<GalleryImportResult> {
  // Parse JSON
  const parseResult = parseGalleryItemsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      categoriesImported: 0,
      itemsImported: 0,
      errors: [],
    };
  }

  // Import items
  const { imported, errors } = await importItems(parseResult.data);

  return {
    success: errors.length === 0,
    categoriesImported: 0,
    itemsImported: imported,
    errors,
  };
}
