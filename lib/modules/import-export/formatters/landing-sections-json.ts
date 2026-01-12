/**
 * Landing Sections JSON Formatter (Pure)
 *
 * Formats landing sections to JSON export envelope.
 * Following PRD §2.10 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.10
 */

import type { LandingSection } from '@/lib/types/landing';
import type {
  LandingSectionsExport,
  LandingSectionExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a LandingSection to export data format.
 *
 * @param section - The landing section to transform
 * @returns Export data object
 */
export function transformLandingSectionToExportData(
  section: LandingSection
): LandingSectionExportData {
  return {
    section_key: section.section_key,
    section_type: section.section_type,
    sort_order: section.sort_order,
    is_visible: section.is_visible,
    title_en: section.title_en,
    title_zh: section.title_zh,
    subtitle_en: section.subtitle_en,
    subtitle_zh: section.subtitle_zh,
    content_en: section.content_en as Record<string, unknown> | null,
    content_zh: section.content_zh as Record<string, unknown> | null,
  };
}

/**
 * Format an array of landing sections to JSON export envelope.
 *
 * @param sections - Array of landing sections to export
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatLandingSectionsToJson(
  sections: LandingSection[],
  exportedAt?: string
): LandingSectionsExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'landing_sections',
    data: sections.map(transformLandingSectionToExportData),
  };
}

/**
 * Serialize landing sections export to JSON string.
 *
 * @param sections - Array of landing sections to export
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatLandingSectionsToJsonString(
  sections: LandingSection[],
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatLandingSectionsToJson(sections, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
