/**
 * Gallery Export IO Module (Server-only)
 *
 * Orchestrates gallery data export operations.
 * Reads data via existing IO modules, formats using pure formatters,
 * and creates downloadable JSON bundles.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.3, §2.4
 * @see uiux_refactor.md §6.1.3 Phase 2
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { formatGalleryItemsToJsonString } from './formatters/gallery-items-json';
import { formatGalleryCategoriesToJsonString } from './formatters/gallery-categories-json';
import type { GalleryItem, GalleryCategory } from '@/lib/types/gallery';

// =============================================================================
// Types
// =============================================================================

/** Result of a gallery export operation */
export interface GalleryExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  stats?: {
    itemsCount: number;
    categoriesCount: number;
    bundleSizeBytes: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

/** Storage bucket for exports */
const EXPORTS_BUCKET = 'exports';

/** Signed URL expiration (24 hours in seconds) */
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

// =============================================================================
// Local Queries (no cross-module imports)
// =============================================================================

async function getAllGalleryCategoriesForExport(): Promise<GalleryCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gallery_categories')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('[exportGalleryBundle] Error fetching gallery categories:', error);
    return [];
  }

  return (data ?? []) as GalleryCategory[];
}

async function getAllGalleryItemsForExport(): Promise<GalleryItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[exportGalleryBundle] Error fetching gallery items:', error);
    return [];
  }

  return (data ?? []) as GalleryItem[];
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Upload a JSON string to Supabase Storage and return a signed URL.
 *
 * @param jsonString - The JSON string to upload
 * @param filename - The filename to use in storage
 * @returns Signed download URL
 */
async function uploadJsonToStorage(
  jsonString: string,
  filename: string
): Promise<{ url: string; sizeBytes: number } | { error: string }> {
  const supabase = await createClient();
  const buffer = Buffer.from(jsonString, 'utf-8');

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(filename, buffer, {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadError) {
    console.error('[export-gallery-io] uploadJsonToStorage upload failed:', uploadError);
    return { error: '上傳失敗' };
  }

  // Create signed URL
  const { data: signedData, error: signedError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(filename, SIGNED_URL_EXPIRY);

  if (signedError || !signedData?.signedUrl) {
    console.error('[export-gallery-io] uploadJsonToStorage createSignedUrl failed:', signedError);
    return { error: '建立下載連結失敗' };
  }

  return { url: signedData.signedUrl, sizeBytes: buffer.length };
}

/**
 * Export all gallery items as a downloadable JSON file.
 *
 * @returns Export result with download URL
 */
export async function exportGalleryItemsBundle(): Promise<GalleryExportResult> {
  try {
    // Fetch all data
    const [items, categories] = await Promise.all([
      getAllGalleryItemsForExport(),
      getAllGalleryCategoriesForExport(),
    ]);

    // Format to JSON
    const jsonString = formatGalleryItemsToJsonString(
      items as GalleryItem[],
      categories as GalleryCategory[]
    );

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gallery-items-${timestamp}.json`;

    // Upload to storage
    const uploadResult = await uploadJsonToStorage(jsonString, filename);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        itemsCount: items.length,
        categoriesCount: categories.length,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    console.error('[export-gallery-io] exportGalleryItemsBundle failed:', error);
    return {
      success: false,
      error: '匯出失敗',
    };
  }
}

/**
 * Export all gallery categories as a downloadable JSON file.
 *
 * @returns Export result with download URL
 */
export async function exportGalleryCategoriesBundle(): Promise<GalleryExportResult> {
  try {
    // Fetch categories
    const categories = await getAllGalleryCategoriesForExport();

    // Format to JSON
    const jsonString = formatGalleryCategoriesToJsonString(categories as GalleryCategory[]);

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gallery-categories-${timestamp}.json`;

    // Upload to storage
    const uploadResult = await uploadJsonToStorage(jsonString, filename);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        itemsCount: 0,
        categoriesCount: categories.length,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    console.error('[export-gallery-io] exportGalleryCategoriesBundle failed:', error);
    return {
      success: false,
      error: '匯出失敗',
    };
  }
}

/**
 * Export all gallery data (items + categories) as downloadable JSON files.
 *
 * @returns Export result with download URL (items bundle)
 */
export async function exportGalleryBundle(): Promise<GalleryExportResult> {
  return exportGalleryItemsBundle();
}
