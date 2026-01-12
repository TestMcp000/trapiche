/**
 * Content Import IO Module (Server-only)
 *
 * Orchestrates site content and landing sections import operations.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 * @see uiux_refactor.md §6.1.3 Phase 3
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { parseSiteContentJson } from './parsers/site-content-json';
import { parseLandingSectionsJson } from './parsers/landing-sections-json';
import { validateSiteContent, validateLandingSection } from './validators/content';

// =============================================================================
// Types
// =============================================================================

export interface ImportPreviewItem {
  slug: string;
  valid: boolean;
  errors?: Record<string, string>;
}

export interface ContentImportPreview {
  success: boolean;
  error?: string;
  items: {
    total: number;
    valid: number;
    items: ImportPreviewItem[];
  };
}

export interface ContentImportResult {
  success: boolean;
  error?: string;
  imported: number;
  errors: Array<{ slug: string; error: string }>;
}

// =============================================================================
// Site Content Import
// =============================================================================

/**
 * Preview a site content import without writing to database.
 */
export async function previewSiteContentImport(
  jsonString: string
): Promise<ContentImportPreview> {
  const parseResult = parseSiteContentJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      items: { total: 0, valid: 0, items: [] },
    };
  }

  const contents = parseResult.data;
  const previews: ImportPreviewItem[] = [];
  let validCount = 0;

  for (const content of contents) {
    const validationResult = validateSiteContent(content);
    
    if (validationResult.valid) {
      validCount++;
      previews.push({ slug: content.section_key, valid: true });
    } else {
      previews.push({
        slug: content.section_key,
        valid: false,
        errors: Object.fromEntries(
          validationResult.errors.map((e) => [e.field, e.message])
        ),
      });
    }
  }

  return {
    success: true,
    items: { total: contents.length, valid: validCount, items: previews },
  };
}

/**
 * Apply a site content import to the database.
 */
export async function applySiteContentImport(
  jsonString: string
): Promise<ContentImportResult> {
  const parseResult = parseSiteContentJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      imported: 0,
      errors: [],
    };
  }

  const supabase = await createClient();
  const errors: Array<{ slug: string; error: string }> = [];
  let imported = 0;

  for (const content of parseResult.data) {
    const { error } = await supabase
      .from('site_content')
      .upsert({
        section_key: content.section_key,
        is_published: content.is_published,
        content_en: content.content_en,
        content_zh: content.content_zh,
      }, { onConflict: 'section_key' });

    if (error) {
      errors.push({ slug: content.section_key, error: error.message });
    } else {
      imported++;
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}

// =============================================================================
// Landing Sections Import
// =============================================================================

/**
 * Preview a landing sections import without writing to database.
 */
export async function previewLandingSectionsImport(
  jsonString: string
): Promise<ContentImportPreview> {
  const parseResult = parseLandingSectionsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      items: { total: 0, valid: 0, items: [] },
    };
  }

  const sections = parseResult.data;
  const previews: ImportPreviewItem[] = [];
  let validCount = 0;

  for (const section of sections) {
    const validationResult = validateLandingSection(section);
    
    if (validationResult.valid) {
      validCount++;
      previews.push({ slug: section.section_key, valid: true });
    } else {
      previews.push({
        slug: section.section_key,
        valid: false,
        errors: Object.fromEntries(
          validationResult.errors.map((e) => [e.field, e.message])
        ),
      });
    }
  }

  return {
    success: true,
    items: { total: sections.length, valid: validCount, items: previews },
  };
}

/**
 * Apply a landing sections import to the database.
 */
export async function applyLandingSectionsImport(
  jsonString: string
): Promise<ContentImportResult> {
  const parseResult = parseLandingSectionsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      imported: 0,
      errors: [],
    };
  }

  const supabase = await createClient();
  const errors: Array<{ slug: string; error: string }> = [];
  let imported = 0;

  for (const section of parseResult.data) {
    const { error } = await supabase
      .from('landing_sections')
      .upsert({
        section_key: section.section_key,
        section_type: section.section_type,
        sort_order: section.sort_order,
        is_visible: section.is_visible,
        title_en: section.title_en,
        title_zh: section.title_zh,
        subtitle_en: section.subtitle_en,
        subtitle_zh: section.subtitle_zh,
        content_en: section.content_en,
        content_zh: section.content_zh,
      }, { onConflict: 'section_key' });

    if (error) {
      errors.push({ slug: section.section_key, error: error.message });
    } else {
      imported++;
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}
