/**
 * Import/Export Jobs IO Module - Facade (Server-only)
 *
 * Re-exports job operations from submodules for backwards compatibility.
 * Original callsites can continue importing from this file.
 *
 * Submodules:
 * - jobs-lifecycle-io.ts: create/mark/get/list/delete operations
 * - jobs-storage-io.ts: upload/signed URL/download URL operations
 * - jobs-audit-io.ts: audit log operations
 *
 * @see ARCHITECTURE.md §3.4 (IO module splitting)
 * @see ARCHITECTURE.md §3.13 (Data Intelligence Platform - Module A)
 */
import 'server-only';

// Lifecycle operations
export {
  createJob,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  getJob,
  listJobs,
  deleteJob,
} from './jobs-lifecycle-io';

// Storage operations
export {
  uploadToStorageWithJob,
  createSignedUrl,
  createJobDownloadUrl,
} from './jobs-storage-io';

// Audit operations
export { writeAuditLog } from './jobs-audit-io';
