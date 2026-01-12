'use server';

/**
 * Server action for saving site content
 * 
 * Uses lib/content.ts functions for updating and toggling publish.
 * Handles cache invalidation with revalidatePath.
 */

import { updateSiteContent, togglePublishSiteContent } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';

interface SaveResult {
  success: boolean;
  error?: string;
}

/**
 * Save site content (update content_en/content_zh)
 */
export async function saveSiteContent(
  sectionKey: string,
  contentEn: Record<string, unknown>,
  contentZh: Record<string, unknown>,
  locale: string
): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const result = await updateSiteContent(sectionKey, contentEn, contentZh, user.id);
    
    if (!result) {
      return { success: false, error: 'Failed to save content' };
    }
    
    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/content/${sectionKey}`);
    
    // Gallery-specific revalidation
    if (sectionKey === 'gallery') {
      revalidatePath(`/${locale}/gallery`);
      revalidatePath('/sitemap.xml');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving site content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Publish site content section
 */
export async function publishSiteContent(
  sectionKey: string,
  locale: string
): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const result = await togglePublishSiteContent(sectionKey, true, user.id);
    
    if (!result) {
      return { success: false, error: 'Failed to publish content' };
    }
    
    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/content/${sectionKey}`);
    
    // Gallery-specific revalidation
    if (sectionKey === 'gallery') {
      revalidatePath(`/${locale}/gallery`);
      revalidatePath('/sitemap.xml');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error publishing site content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Unpublish site content section
 */
export async function unpublishSiteContent(
  sectionKey: string,
  locale: string
): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const result = await togglePublishSiteContent(sectionKey, false, user.id);
    
    if (!result) {
      return { success: false, error: 'Failed to unpublish content' };
    }
    
    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/content/${sectionKey}`);
    
    // Gallery-specific revalidation
    if (sectionKey === 'gallery') {
      revalidatePath(`/${locale}/gallery`);
      revalidatePath('/sitemap.xml');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error unpublishing site content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
