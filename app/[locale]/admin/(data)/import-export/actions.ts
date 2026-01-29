'use server';

/**
 * Import/Export Server Actions
 * @see doc/specs/completed/IMPORT_EXPORT.md
 * @see uiux_refactor.md §6.1.2 Phase 1 C, §6.1.3 Phase 2+
 *
 * Server actions for bulk data import/export operations.
 * RBAC: Export = owner/editor; Import = owner only (PRD §6.1)
 */

import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireOwner, requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import { exportBlogBundle, type BlogExportResult } from '@/lib/modules/import-export/export-blog-io';
import {
  previewBlogImport,
  applyBlogImport,
  type BlogImportPreview,
  type BlogImportResult,
} from '@/lib/modules/import-export/import-blog-io';

// Phase 2: Gallery
import {
  exportGalleryItemsBundle,
  exportGalleryCategoriesBundle,
} from '@/lib/modules/import-export/export-gallery-io';
import {
  previewGalleryItemsImport,
  applyGalleryItemsImport,
  previewGalleryCategoriesImport,
  applyGalleryCategoriesImport,
} from '@/lib/modules/import-export/import-gallery-io';

// Phase 3: Content
import {
  exportSiteContentBundle,
  exportLandingSectionsBundle,
} from '@/lib/modules/import-export/export-content-io';
import {
  previewSiteContentImport,
  applySiteContentImport,
  previewLandingSectionsImport,
  applyLandingSectionsImport,
} from '@/lib/modules/import-export/import-content-io';

// Phase 3: Comments (export-only)
import {
  exportCommentsBundle,
  type CommentsExportFormat,
} from '@/lib/modules/import-export/export-comments-io';
import {
  listJobs,
  createJobDownloadUrl,
  deleteJob,
  createJob,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  writeAuditLog,
} from '@/lib/modules/import-export/jobs-io';
import type { ImportExportJobListItem } from '@/lib/types/import-export';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

/** Export format type alias for actions */
export type ExportFormat = 'json' | 'csv';

// =============================================================================
// Types
// =============================================================================

export type ExportBlogActionResult = ActionResult<{
  downloadUrl: string;
  stats: NonNullable<BlogExportResult['stats']>;
}>;

export type ImportPreviewActionResult = ActionResult<BlogImportPreview>;
export type ImportApplyActionResult = ActionResult<BlogImportResult>;

export type GenericExportResult = ActionResult<{
  downloadUrl: string;
  stats?: { count: number; bundleSizeBytes: number };
}>;

export type GenericImportPreviewResult = ActionResult<{
  total: number;
  valid: number;
  items: Array<{ slug: string; valid: boolean; errors?: Record<string, string> }>;
}>;

export type GenericImportApplyResult = ActionResult<{
  imported: number;
  errors?: Array<{ slug: string; error: string }>;
}>;

export type JobListActionResult = ActionResult<ImportExportJobListItem[]>;
export type RedownloadActionResult = ActionResult<{ downloadUrl: string }>;
export type DeleteJobActionResult = ActionResult<void>;

export type ExportCommentsWithJobResult = ActionResult<{
  downloadUrl: string;
  stats?: { count: number; bundleSizeBytes: number };
  jobId: string;
}>;

// =============================================================================
// Export Actions (owner/editor allowed)
// =============================================================================

/**
 * Export blog posts and categories as a downloadable ZIP bundle.
 *
 * @returns Export result with download URL
 */
export async function exportBlog(): Promise<ExportBlogActionResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result: BlogExportResult = await exportBlogBundle();
    if (!result.success || !result.downloadUrl || !result.stats) {
      console.error('[exportBlog] Export failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }

    return actionSuccess({
      downloadUrl: result.downloadUrl,
      stats: result.stats,
    });
  } catch (error) {
    console.error('[exportBlog] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

// =============================================================================
// Import Actions (owner only)
// =============================================================================

/**
 * Preview a blog import bundle without applying changes.
 * Validates the uploaded ZIP and returns a summary of what would be imported.
 *
 * @param formData - FormData containing the uploaded file
 * @returns Preview result with validation details
 */
export async function previewBlogImportAction(
  formData: FormData
): Promise<ImportPreviewActionResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!file.name.endsWith('.zip')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const buffer = await file.arrayBuffer();
    const preview = await previewBlogImport(buffer);
    return actionSuccess(preview);
  } catch (error) {
    console.error('[previewBlogImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Apply a blog import bundle to the database.
 *
 * @param formData - FormData containing the uploaded file
 * @returns Import result with counts and errors
 */
export async function applyBlogImportAction(
  formData: FormData
): Promise<ImportApplyActionResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!file.name.endsWith('.zip')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const buffer = await file.arrayBuffer();
    const result = await applyBlogImport(buffer, guard.userId);

    if (result.success || result.postsImported > 0 || result.categoriesImported > 0) {
      revalidateTag('blog', { expire: 0 });
      revalidatePath('/sitemap.xml');
    }

    return actionSuccess(result);
  } catch (error) {
    console.error('[applyBlogImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

// =============================================================================
// Phase 2: Gallery Actions
// =============================================================================

/** Export gallery items */
export async function exportGalleryItems(): Promise<GenericExportResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await exportGalleryItemsBundle();
    if (!result.success || !result.downloadUrl) {
      console.error('[exportGalleryItems] Export failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }

    return actionSuccess({
      downloadUrl: result.downloadUrl,
      stats: result.stats
        ? { count: result.stats.itemsCount, bundleSizeBytes: result.stats.bundleSizeBytes }
        : undefined,
    });
  } catch (error) {
    console.error('[exportGalleryItems] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Export gallery categories */
export async function exportGalleryCategories(): Promise<GenericExportResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await exportGalleryCategoriesBundle();
    if (!result.success || !result.downloadUrl) {
      console.error('[exportGalleryCategories] Export failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }

    return actionSuccess({
      downloadUrl: result.downloadUrl,
      stats: result.stats
        ? { count: result.stats.categoriesCount, bundleSizeBytes: result.stats.bundleSizeBytes }
        : undefined,
    });
  } catch (error) {
    console.error('[exportGalleryCategories] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Preview gallery items import */
export async function previewGalleryItemsImportAction(
  formData: FormData
): Promise<GenericImportPreviewResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await previewGalleryItemsImport(text);
    if (!result.success) {
      console.error('[previewGalleryItemsImportAction] Preview failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    return actionSuccess(result.items);
  } catch (error) {
    console.error('[previewGalleryItemsImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Apply gallery items import */
export async function applyGalleryItemsImportAction(
  formData: FormData
): Promise<GenericImportApplyResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await applyGalleryItemsImport(text);
    if (result.itemsImported > 0) revalidateTag('gallery', { expire: 0 });

    return actionSuccess({
      imported: result.itemsImported,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[applyGalleryItemsImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Preview gallery categories import */
export async function previewGalleryCategoriesImportAction(
  formData: FormData
): Promise<GenericImportPreviewResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await previewGalleryCategoriesImport(text);
    if (!result.success) {
      console.error('[previewGalleryCategoriesImportAction] Preview failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    return actionSuccess(result.items);
  } catch (error) {
    console.error('[previewGalleryCategoriesImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Apply gallery categories import */
export async function applyGalleryCategoriesImportAction(
  formData: FormData
): Promise<GenericImportApplyResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await applyGalleryCategoriesImport(text);
    if (result.categoriesImported > 0) revalidateTag('gallery', { expire: 0 });

    return actionSuccess({
      imported: result.categoriesImported,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[applyGalleryCategoriesImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

// =============================================================================
// Phase 3: Content Actions
// =============================================================================

/** Export site content */
export async function exportSiteContent(): Promise<GenericExportResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await exportSiteContentBundle();
    if (!result.success || !result.downloadUrl) {
      console.error('[exportSiteContent] Export failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }

    return actionSuccess({
      downloadUrl: result.downloadUrl,
      stats: result.stats,
    });
  } catch (error) {
    console.error('[exportSiteContent] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Export landing sections */
export async function exportLandingSections(): Promise<GenericExportResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await exportLandingSectionsBundle();
    if (!result.success || !result.downloadUrl) {
      console.error('[exportLandingSections] Export failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }

    return actionSuccess({
      downloadUrl: result.downloadUrl,
      stats: result.stats,
    });
  } catch (error) {
    console.error('[exportLandingSections] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Preview site content import */
export async function previewSiteContentImportAction(
  formData: FormData
): Promise<GenericImportPreviewResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await previewSiteContentImport(text);
    if (!result.success) {
      console.error('[previewSiteContentImportAction] Preview failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    return actionSuccess(result.items);
  } catch (error) {
    console.error('[previewSiteContentImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Apply site content import */
export async function applySiteContentImportAction(
  formData: FormData
): Promise<GenericImportApplyResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await applySiteContentImport(text);
    if (result.imported > 0) revalidateTag('content', { expire: 0 });

    return actionSuccess({
      imported: result.imported,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[applySiteContentImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Preview landing sections import */
export async function previewLandingSectionsImportAction(
  formData: FormData
): Promise<GenericImportPreviewResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await previewLandingSectionsImport(text);
    if (!result.success) {
      console.error('[previewLandingSectionsImportAction] Preview failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    return actionSuccess(result.items);
  } catch (error) {
    console.error('[previewLandingSectionsImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/** Apply landing sections import */
export async function applyLandingSectionsImportAction(
  formData: FormData
): Promise<GenericImportApplyResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name.endsWith('.json')) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const text = await file.text();
    const result = await applyLandingSectionsImport(text);
    if (result.imported > 0) revalidateTag('landing', { expire: 0 });

    return actionSuccess({
      imported: result.imported,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[applyLandingSectionsImportAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

// =============================================================================
// Phase 3: Comments Actions (export-only)
// =============================================================================

/** Export comments with format support (export-only) */
export async function exportComments(
  options: { format?: CommentsExportFormat; includeSensitive?: boolean } = {}
): Promise<GenericExportResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await exportCommentsBundle({
      format: options.format ?? 'json',
      includeSensitive: options.includeSensitive,
    });
    if (!result.success || !result.downloadUrl) {
      console.error('[exportComments] Export failed:', result.error);
      return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }

    return actionSuccess({
      downloadUrl: result.downloadUrl,
      stats: result.stats,
    });
  } catch (error) {
    console.error('[exportComments] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

// =============================================================================
// Job History Actions
// =============================================================================

/** Storage bucket constant */
const EXPORTS_BUCKET = 'exports';

/**
 * List recent import/export jobs.
 * Used to display job history in the UI.
 */
export async function listJobsAction(
  options: { limit?: number; kind?: 'import' | 'export'; entity?: string } = {}
): Promise<JobListActionResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const jobs = await listJobs({
      limit: options.limit ?? 20,
      kind: options.kind,
      entity: options.entity,
    });
    return actionSuccess(jobs);
  } catch (error) {
    console.error('[listJobsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Re-download a completed job by generating a new signed URL.
 * Called when user wants to re-download an expired export.
 */
export async function redownloadJobAction(jobId: string): Promise<RedownloadActionResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const downloadUrl = await createJobDownloadUrl(jobId);
    if (!downloadUrl) {
      return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
    }
    return actionSuccess({ downloadUrl });
  } catch (error) {
    console.error('[redownloadJobAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Delete a job from history (owner only).
 * Also deletes the associated storage file if exists.
 */
export async function deleteJobAction(jobId: string): Promise<DeleteJobActionResult> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return actionError(ADMIN_ERROR_CODES.UNAUTHORIZED);
  }

  try {
    await deleteJob(jobId);
    await writeAuditLog('delete_job', jobId, user.email ?? '', { action: 'delete' });
    return actionSuccess();
  } catch (error) {
    console.error('[deleteJobAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

// =============================================================================
// Export with Job Tracking
// =============================================================================

/**
 * Export comments with job tracking.
 */
export async function exportCommentsWithJob(
  options: { format?: CommentsExportFormat; includeSensitive?: boolean } = {}
): Promise<ExportCommentsWithJobResult> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return actionError(ADMIN_ERROR_CODES.UNAUTHORIZED);
  }

  const format = options.format ?? 'json';
  let jobId: string | undefined;

  try {
    jobId = await createJob({
      kind: 'export',
      entity: 'comments',
      format,
      requested_by: guard.userId,
      metadata: { includeSensitive: options.includeSensitive ?? false },
    });
    await markJobProcessing(jobId);

    const result = await exportCommentsBundle({
      format: format as CommentsExportFormat,
      includeSensitive: options.includeSensitive,
    });

    if (!result.success || !result.downloadUrl) {
      await markJobFailed(jobId, '匯出失敗');
      return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }

    // Note: exportCommentsBundle already uploads to storage with timestamp path.
    // For full job tracking, we'd need to refactor to use job-based paths.
    // For now, just record the job completion.
    await markJobCompleted(jobId, {
      storage_bucket: EXPORTS_BUCKET,
      storage_path: 'comments-export', // Placeholder - actual path is in the signed URL
      size_bytes: result.stats?.bundleSizeBytes ?? 0,
      row_count: result.stats?.count ?? 0,
    });

    await writeAuditLog('export', jobId, user.email ?? '', {
      entity: 'comments',
      format,
      rowCount: result.stats?.count ?? 0,
    });

    return actionSuccess({
      downloadUrl: result.downloadUrl,
      stats: result.stats,
      jobId,
    });
  } catch (error) {
    if (jobId) await markJobFailed(jobId, '匯出失敗');
    console.error('[exportCommentsWithJob] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
