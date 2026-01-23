/**
 * Import/Export Jobs Audit IO Module (Server-only)
 *
 * Handles audit log operations for import/export jobs.
 *
 * @see ARCHITECTURE.md §3.4 (IO module splitting)
 * @see ARCHITECTURE.md §3.13 (Data Intelligence Platform - Module A)
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';

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
    console.error('[jobs-audit-io] Failed to write audit log:', error.message);
  }
}
