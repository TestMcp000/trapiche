/**
 * Import/Export Jobs Storage IO Module (Server-only)
 *
 * Handles storage operations: upload, signed URL generation, download URL.
 *
 * @see ARCHITECTURE.md §3.4 (IO module splitting)
 * @see ARCHITECTURE.md §3.13 (Data Intelligence Platform - Module A)
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getJob } from './jobs-lifecycle-io';

/** Default storage bucket for exports */
const EXPORTS_BUCKET = 'exports';

/** Signed URL expiration (24 hours in seconds) */
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

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
      upsert: false,
    });

  if (uploadError) {
    console.error('[jobs-storage-io] uploadToStorageWithJob failed:', uploadError);
    throw new Error('上傳失敗');
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
    console.error('[jobs-storage-io] createSignedUrl failed:', error);
    throw new Error('建立簽名連結失敗');
  }

  return data.signedUrl;
}

/**
 * Create a signed download URL for a completed job.
 * Used for re-download functionality.
 */
export async function createJobDownloadUrl(jobId: string): Promise<string | null> {
  const supabase = await createClient();

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
    console.error('[jobs-storage-io] createJobDownloadUrl failed:', error);
    throw new Error('建立下載連結失敗');
  }

  return data.signedUrl;
}
