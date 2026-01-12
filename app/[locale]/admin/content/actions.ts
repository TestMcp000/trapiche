'use server';

import { togglePublishSiteContent } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function toggleSectionVisibility(
  sectionKey: string,
  publish: boolean,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Toggle the publish status
    const result = await togglePublishSiteContent(sectionKey, publish, user?.id);
    
    if (!result) {
      return { success: false, error: 'Failed to update section visibility' };
    }
    
    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}`); // Revalidate homepage
    
    // Gallery-specific revalidations
    if (sectionKey === 'gallery') {
      revalidatePath(`/${locale}/gallery`);
      revalidatePath('/sitemap.xml');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling section visibility:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
