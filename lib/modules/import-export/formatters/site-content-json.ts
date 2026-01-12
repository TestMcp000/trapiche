/**
 * Site Content JSON Formatter (Pure)
 *
 * Formats site content sections to JSON export envelope.
 * Following PRD §2.9 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.9
 */

import type { SiteContent } from '@/lib/types/content';
import type {
  SiteContentExport,
  SiteContentExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a SiteContent to export data format.
 *
 * @param content - The site content to transform
 * @returns Export data object
 */
export function transformSiteContentToExportData(
  content: SiteContent
): SiteContentExportData {
  return {
    section_key: content.section_key,
    is_published: content.is_published,
    content_en: content.content_en,
    content_zh: content.content_zh,
  };
}

/**
 * Format an array of site content sections to JSON export envelope.
 *
 * @param contents - Array of site content to export
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatSiteContentToJson(
  contents: SiteContent[],
  exportedAt?: string
): SiteContentExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'site_content',
    data: contents.map(transformSiteContentToExportData),
  };
}

/**
 * Serialize site content export to JSON string.
 *
 * @param contents - Array of site content to export
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatSiteContentToJsonString(
  contents: SiteContent[],
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatSiteContentToJson(contents, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
