'use server';

import { revalidatePath } from 'next/cache';
import { restoreFromHistory } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';

export type RestoreResult = {
  success: boolean;
  error?: string;
};

/**
 * Server action to restore content from a history record.
 */
export async function restoreHistoryAction(
  historyId: string,
  locale: string
): Promise<RestoreResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const result = await restoreFromHistory(historyId, user.id);
    
    if (!result) {
      return { success: false, error: 'Restore failed' };
    }
    
    // Revalidate relevant paths
    revalidatePath(`/${locale}/admin/history`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/portfolio`);
    revalidatePath(`/${locale}/admin/settings`);
    
    return { success: true };
  } catch (err) {
    console.error('Restore action error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
