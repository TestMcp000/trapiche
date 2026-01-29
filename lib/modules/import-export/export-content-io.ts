/**
 * Content Export IO Module (Server-only)
 *
 * Orchestrates site content and landing sections export operations.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.9, §2.10
 * @see uiux_refactor.md §6.1.3 Phase 3
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { formatSiteContentToJsonString } from './formatters/site-content-json';
import { formatLandingSectionsToJsonString } from './formatters/landing-sections-json';
import type { SiteContent } from '@/lib/types/content';
import type { LandingSection } from '@/lib/types/landing';

// =============================================================================
// Types
// =============================================================================

/** Result of a content export operation */
export interface ContentExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  stats?: {
    count: number;
    bundleSizeBytes: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

const EXPORTS_BUCKET = 'exports';
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

// =============================================================================
// Helpers
// =============================================================================

async function uploadJsonToStorage(
  jsonString: string,
  filename: string
): Promise<{ url: string; sizeBytes: number } | { error: string }> {
  const supabase = await createClient();
  const buffer = Buffer.from(jsonString, 'utf-8');

  const { error: uploadError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(filename, buffer, {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadError) {
    console.error('[export-content-io] uploadJsonToStorage upload failed:', uploadError);
    return { error: '上傳失敗' };
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(filename, SIGNED_URL_EXPIRY);

  if (signedError || !signedData?.signedUrl) {
    console.error('[export-content-io] uploadJsonToStorage createSignedUrl failed:', signedError);
    return { error: '建立下載連結失敗' };
  }

  return { url: signedData.signedUrl, sizeBytes: buffer.length };
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Export all site content sections as a downloadable JSON file.
 */
export async function exportSiteContentBundle(): Promise<ContentExportResult> {
  try {
    const supabase = await createClient();

    const { data: contents, error: contentsError } = await supabase
      .from('site_content')
      .select('*');

    if (contentsError) {
      return { success: false, error: contentsError.message };
    }

    const jsonString = formatSiteContentToJsonString(contents as SiteContent[]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `site-content-${timestamp}.json`;

    const uploadResult = await uploadJsonToStorage(jsonString, filename);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        count: contents?.length ?? 0,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    console.error('[export-content-io] exportSiteContentBundle failed:', error);
    return {
      success: false,
      error: '匯出失敗',
    };
  }
}

/**
 * Export all landing sections as a downloadable JSON file.
 */
export async function exportLandingSectionsBundle(): Promise<ContentExportResult> {
  try {
    const supabase = await createClient();

    const { data: sections, error: sectionsError } = await supabase
      .from('landing_sections')
      .select('*')
      .order('sort_order', { ascending: true });

    if (sectionsError) {
      return { success: false, error: sectionsError.message };
    }

    const jsonString = formatLandingSectionsToJsonString(sections as LandingSection[]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `landing-sections-${timestamp}.json`;

    const uploadResult = await uploadJsonToStorage(jsonString, filename);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        count: sections?.length ?? 0,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    console.error('[export-content-io] exportLandingSectionsBundle failed:', error);
    return {
      success: false,
      error: '匯出失敗',
    };
  }
}
