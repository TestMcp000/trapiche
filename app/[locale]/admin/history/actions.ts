'use server';

import { revalidatePath } from 'next/cache';
import { restoreFromHistory } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

/**
 * Server action to restore content from a history record.
 */
export async function restoreHistoryAction(
  historyId: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!historyId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await restoreFromHistory(historyId, guard.userId);

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }
    
    // Revalidate relevant paths
    revalidatePath(`/${locale}/admin/history`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/portfolio`);
    revalidatePath(`/${locale}/admin/settings`);
    
    return actionSuccess();
  } catch (err) {
    console.error('Restore action error:', err);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
