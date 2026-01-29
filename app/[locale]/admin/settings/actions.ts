'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { updateCompanySetting } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';
import { incrementGlobalCacheVersion } from '@/lib/system/cache-io';

/**
 * Server action to save a company setting.
 */
export async function saveSettingAction(
  key: string,
  value: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!key) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await updateCompanySetting(key, value, guard.userId);

    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Revalidate relevant paths
    revalidatePath(`/${locale}/admin/settings`);
    revalidatePath(`/${locale}`); // Home page may use settings

    return actionSuccess();
  } catch (err) {
    console.error('Save setting action error:', err);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Server action to purge all cached data.
 * Increments the global cache version and revalidates all tags.
 */
export async function purgeAllCache(): Promise<ActionResult<{ newVersion: number }>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // Increment global cache version to invalidate all cached queries
    const newVersion = await incrementGlobalCacheVersion();

    // Revalidate global-system tag to ensure all system caches are purged
    revalidateTag('global-system', { expire: 0 });

    // Revalidate all paths from the root
    // Note: revalidateTag not used because cache versioning handles invalidation via key changes
    revalidatePath('/', 'layout');

    return actionSuccess({ newVersion });
  } catch (err) {
    console.error('Purge cache action error:', err);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
