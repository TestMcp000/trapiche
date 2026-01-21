'use server';

/**
 * Server action for saving site content
 * 
 * Uses lib/content.ts functions for updating and toggling publish.
 * Handles cache invalidation with revalidatePath.
 */

import { updateSiteContent, togglePublishSiteContent, getSiteContent } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { parseHamburgerNav } from '@/lib/validators/hamburger-nav';
import { deepValidateHamburgerNav } from '@/lib/modules/content/hamburger-nav-publish-io';
import type { NavValidationError, NavDeepValidationError } from '@/lib/types/hamburger-nav';

interface SaveResult {
  success: boolean;
  error?: string;
  /** Validation errors with JSON paths for precise error location */
  validationErrors?: Array<{ path: string; message: string }>;
}

/**
 * Save site content (single-language zh; mirror to content_en for legacy)
 */
export async function saveSiteContent(
  sectionKey: string,
  content: Record<string, unknown>,
  locale: string
): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '尚未登入' };
    }

    // Validate hamburger_nav structure before saving
    if (sectionKey === 'hamburger_nav') {
      const parseResult = parseHamburgerNav(content);
      if (parseResult.errors.length > 0) {
        return {
          success: false,
          error: '導航結構驗證失敗',
          validationErrors: parseResult.errors.map(e => ({
            path: e.path,
            message: e.message,
          })),
        };
      }
    }

    // DB schema still has content_en/content_zh; keep them identical for single-language site.
    const result = await updateSiteContent(sectionKey, content, content, user.id);

    if (!result) {
      return { success: false, error: '儲存內容失敗' };
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
    return { success: false, error: '發生未預期的錯誤' };
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
      return { success: false, error: '尚未登入' };
    }

    // Deep validate hamburger_nav before publishing
    if (sectionKey === 'hamburger_nav') {
      // Fetch current draft content
      const currentContent = await getSiteContent(sectionKey);
      if (!currentContent) {
        return { success: false, error: '找不到導航內容' };
      }

      // Parse and validate structure
      const parseResult = parseHamburgerNav(currentContent.content_zh);
      if (parseResult.errors.length > 0 || !parseResult.nav) {
        return {
          success: false,
          error: '導航結構驗證失敗，無法發布',
          validationErrors: parseResult.errors.map(e => ({
            path: e.path,
            message: e.message,
          })),
        };
      }

      // Deep validate: check all targets exist and are public
      const deepResult = await deepValidateHamburgerNav(parseResult.nav);
      if (!deepResult.valid) {
        return {
          success: false,
          error: '導航目標驗證失敗，部分目標不存在或未公開',
          validationErrors: deepResult.errors.map(e => ({
            path: e.path,
            message: e.message,
          })),
        };
      }
    }

    const result = await togglePublishSiteContent(sectionKey, true, user.id);

    if (!result) {
      return { success: false, error: '發布失敗' };
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
    return { success: false, error: '發生未預期的錯誤' };
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
      return { success: false, error: '尚未登入' };
    }

    const result = await togglePublishSiteContent(sectionKey, false, user.id);

    if (!result) {
      return { success: false, error: '取消發布失敗' };
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
    return { success: false, error: '發生未預期的錯誤' };
  }
}
