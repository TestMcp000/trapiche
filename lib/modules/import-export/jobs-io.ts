/**
 * Import/Export Jobs IO Module (Server-only)
 *
 * Handles CRUD operations for import_export_jobs table.
 * Used to track job history, enable re-download, and provide audit trail.
 *
 * @see uiux_refactor.md §4 item 3 - Job History / Audit Trail / Re-download
 * @see ARCHITECTURE.md §3.13 - Data Intelligence Platform (Module A)
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type {
  ImportExportJobRow,
  ImportExportJobListItem,
  CreateJobParams,
  CompleteJobParams,
  ImportExportJobStatus,
} from '@/lib/types/import-export';

// =============================================================================
// Constants
// =============================================================================

/** Default storage bucket for exports */
const EXPORTS_BUCKET = 'exports';

/** Signed URL expiration (24 hours in seconds) */
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

// =============================================================================
// Job CRUD Functions
// =============================================================================

/**
 * Create a new job with 'pending' status.
 * Called at the start of an export/import operation.
 */
export async function createJob(params: CreateJobParams): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('import_export_jobs')
    .insert({
      kind: params.kind,
      entity: params.entity,
      format: params.format,
      status: 'pending' as ImportExportJobStatus,
      requested_by: params.requested_by,
      metadata: params.metadata ?? {},
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return data.id;
}

/**
 * Mark a job as 'processing' and set started_at timestamp.
 */
export async function markJobProcessing(jobId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('import_export_jobs')
    .update({
      status: 'processing' as ImportExportJobStatus,
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to mark job as processing: ${error.message}`);
  }
}

/**
 * Mark a job as 'completed' with storage info and stats.
 */
export async function markJobCompleted(
  jobId: string,
  params: CompleteJobParams
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('import_export_jobs')
    .update({
      status: 'completed' as ImportExportJobStatus,
      storage_bucket: params.storage_bucket,
      storage_path: params.storage_path,
      size_bytes: params.size_bytes,
      row_count: params.row_count,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to mark job as completed: ${error.message}`);
  }
}

/**
 * Mark a job as 'failed' with error message.
 */
export async function markJobFailed(
  jobId: string,
  errorMessage: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('import_export_jobs')
    .update({
      status: 'failed' as ImportExportJobStatus,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to mark job as failed: ${error.message}`);
  }
}

/**
 * Get a single job by ID.
 */
export async function getJob(jobId: string): Promise<ImportExportJobRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('import_export_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get job: ${error.message}`);
  }

  return data as ImportExportJobRow;
}

/**
 * List jobs with pagination.
 * Returns most recent jobs first.
 */
export async function listJobs(options: {
  limit?: number;
  offset?: number;
  kind?: 'import' | 'export';
  entity?: string;
}): Promise<ImportExportJobListItem[]> {
  const supabase = await createClient();
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  let query = supabase
    .from('import_export_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.kind) {
    query = query.eq('kind', options.kind);
  }

  if (options.entity) {
    query = query.eq('entity', options.entity);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list jobs: ${error.message}`);
  }

  return (data ?? []) as ImportExportJobListItem[];
}

/**
 * Create a signed download URL for a completed job.
 * Used for re-download functionality.
 */
export async function createJobDownloadUrl(jobId: string): Promise<string | null> {
  const supabase = await createClient();

  // Get job to retrieve storage path
  const job = await getJob(jobId);
  if (!job || !job.storage_bucket || !job.storage_path) {
    return null;
  }

  if (job.status !== 'completed') {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(job.storage_bucket)
    .createSignedUrl(job.storage_path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create download URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.signedUrl;
}

/**
 * Delete a job by ID (owner-only, enforced by RLS).
 */
export async function deleteJob(jobId: string): Promise<void> {
  const supabase = await createClient();

  // First, try to delete the storage file if exists
  const job = await getJob(jobId);
  if (job?.storage_bucket && job?.storage_path) {
    await supabase.storage.from(job.storage_bucket).remove([job.storage_path]);
    // Ignore storage deletion errors - job deletion is more important
  }

  const { error } = await supabase
    .from('import_export_jobs')
    .delete()
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to delete job: ${error.message}`);
  }
}

// =============================================================================
// Storage Upload Helper
// =============================================================================

/**
 * Upload content to storage with job-based path.
 * Returns storage path on success, or throws on failure.
 *
 * Path format: import-export/<jobId>/<entity>.<ext>
 */
export async function uploadToStorageWithJob(
  jobId: string,
  entity: string,
  content: string | Buffer,
  format: string
): Promise<{ storagePath: string; sizeBytes: number }> {
  const supabase = await createClient();

  const extension = format === 'csv' ? 'csv' : format === 'zip' ? 'zip' : 'json';
  const storagePath = `import-export/${jobId}/${entity}.${extension}`;
  const contentType =
    format === 'csv'
      ? 'text/csv'
      : format === 'zip'
        ? 'application/zip'
        : 'application/json';

  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

  const { error: uploadError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false, // Prevent overwriting historical exports
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  return { storagePath, sizeBytes: buffer.length };
}

/**
 * Create a signed URL for a storage path.
 */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expirySeconds: number = SIGNED_URL_EXPIRY
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expirySeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.signedUrl;
}

// =============================================================================
// Audit Log Helper
// =============================================================================

/**
 * Write an audit log entry for an import/export operation.
 */
export async function writeAuditLog(
  action: string,
  jobId: string,
  actorEmail: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('audit_logs').insert({
    action,
    entity_type: 'import_export_job',
    entity_id: jobId,
    actor_email: actorEmail,
    details,
  });

  if (error) {
    // Log but don't throw - audit log failure shouldn't break the operation
    console.error('[jobs-io] Failed to write audit log:', error.message);
  }
}
