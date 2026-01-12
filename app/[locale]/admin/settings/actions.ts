'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { updateCompanySetting } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { incrementGlobalCacheVersion } from '@/lib/system/cache-io';

export type SaveSettingResult = {
  success: boolean;
  error?: string;
};

export type PurgeCacheResult = {
  success: boolean;
  newVersion?: number;
  error?: string;
};

/**
 * Server action to save a company setting.
 */
export async function saveSettingAction(
  key: string,
  value: string,
  locale: string
): Promise<SaveSettingResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const result = await updateCompanySetting(key, value, user.id);
    
    if (!result) {
      return { success: false, error: 'Save failed' };
    }
    
    // Revalidate relevant paths
    revalidatePath(`/${locale}/admin/settings`);
    revalidatePath(`/${locale}`); // Home page may use settings
    
    return { success: true };
  } catch (err) {
    console.error('Save setting action error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Server action to purge all cached data.
 * Increments the global cache version and revalidates all tags.
 */
export async function purgeAllCache(): Promise<PurgeCacheResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check admin role via JWT claims
    const role = user.app_metadata?.role;
    if (role !== 'owner' && role !== 'editor') {
      return { success: false, error: 'Unauthorized' };
    }

    // Increment global cache version to invalidate all cached queries
    const newVersion = await incrementGlobalCacheVersion();

    // Revalidate global-system tag to ensure all system caches are purged
    revalidateTag('global-system', { expire: 0 });

    // Revalidate all paths from the root
    // Note: revalidateTag not used because cache versioning handles invalidation via key changes
    revalidatePath('/', 'layout');

    return { success: true, newVersion };
  } catch (err) {
    console.error('Purge cache action error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

