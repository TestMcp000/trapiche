/**
 * Import/Export Jobs Lifecycle IO Module (Server-only)
 *
 * Handles job CRUD operations: create, mark status, get, list, delete.
 *
 * @see ARCHITECTURE.md §3.4 (IO module splitting)
 * @see ARCHITECTURE.md §3.13 (Data Intelligence Platform - Module A)
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
    if (error.code === 'PGRST116') return null;
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
 * Delete a job by ID (owner-only, enforced by RLS).
 * Also deletes the associated storage file if exists.
 */
export async function deleteJob(jobId: string): Promise<void> {
  const supabase = await createClient();

  const job = await getJob(jobId);
  if (job?.storage_bucket && job?.storage_path) {
    await supabase.storage.from(job.storage_bucket).remove([job.storage_path]);
  }

  const { error } = await supabase
    .from('import_export_jobs')
    .delete()
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to delete job: ${error.message}`);
  }
}
