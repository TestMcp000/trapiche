'use server';

/**
 * Server action for saving site content
 * 
 * Uses lib/content.ts functions for updating and toggling publish.
 * Handles cache invalidation with revalidatePath.
 */

import { updateSiteContent, togglePublishSiteContent, getSiteContent } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import { revalidatePath, revalidateTag } from 'next/cache';
import { buildGalleryListUrl } from '@/lib/seo/url-builders';
import { parseHamburgerNav } from '@/lib/validators/hamburger-nav';
import { deepValidateHamburgerNav } from '@/lib/modules/content/hamburger-nav-publish-io';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

type ValidationErrors = Array<{ path: string; message: string }>;

/**
 * Save site content (single-language zh; mirror to content_en for legacy)
 */
export async function saveSiteContent(
  sectionKey: string,
  content: Record<string, unknown>,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // Validate hamburger_nav structure before saving
    if (sectionKey === 'hamburger_nav') {
      const parseResult = parseHamburgerNav(content);
      if (parseResult.errors.length > 0) {
        return {
          success: false,
          errorCode: ADMIN_ERROR_CODES.VALIDATION_ERROR,
          details: {
            validationErrors: parseResult.errors.map((e) => ({
              path: e.path,
              message: e.message,
            })) satisfies ValidationErrors,
          },
        };
      }
    }

    // DB schema still has content_en/content_zh; keep them identical for single-language site.
    const result = await updateSiteContent(sectionKey, content, content, guard.userId);

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/content/${sectionKey}`);

    // Gallery-specific revalidation
    if (sectionKey === 'gallery') {
      revalidatePath(buildGalleryListUrl(locale));
      revalidatePath('/sitemap.xml');
    }

    return actionSuccess();
  } catch (error) {
    console.error('Error saving site content:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Publish site content section
 */
export async function publishSiteContent(
  sectionKey: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // Deep validate hamburger_nav before publishing
    if (sectionKey === 'hamburger_nav') {
      // Fetch current draft content
      const currentContent = await getSiteContent(sectionKey);
      if (!currentContent) {
        return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
      }

      // Parse and validate structure
      const parseResult = parseHamburgerNav(currentContent.content_zh);
      if (parseResult.errors.length > 0 || !parseResult.nav) {
        return {
          success: false,
          errorCode: ADMIN_ERROR_CODES.VALIDATION_ERROR,
          details: {
            validationErrors: parseResult.errors.map((e) => ({
              path: e.path,
              message: e.message,
            })) satisfies ValidationErrors,
          },
        };
      }

      // Deep validate: check all targets exist and are public
      const deepResult = await deepValidateHamburgerNav(parseResult.nav);
      if (!deepResult.valid) {
        return {
          success: false,
          errorCode: ADMIN_ERROR_CODES.VALIDATION_ERROR,
          details: {
            validationErrors: deepResult.errors.map((e) => ({
              path: e.path,
              message: e.message,
            })) satisfies ValidationErrors,
          },
        };
      }
    }

    const result = await togglePublishSiteContent(sectionKey, true, guard.userId);

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/content/${sectionKey}`);

    // Gallery-specific revalidation
    if (sectionKey === 'gallery') {
      revalidatePath(buildGalleryListUrl(locale));
      revalidatePath('/sitemap.xml');
    }

    return actionSuccess();
  } catch (error) {
    console.error('Error publishing site content:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Unpublish site content section
 */
export async function unpublishSiteContent(
  sectionKey: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    const result = await togglePublishSiteContent(sectionKey, false, guard.userId);

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}/admin/content/${sectionKey}`);

    // Gallery-specific revalidation
    if (sectionKey === 'gallery') {
      revalidatePath(buildGalleryListUrl(locale));
      revalidatePath('/sitemap.xml');
    }

    return actionSuccess();
  } catch (error) {
    console.error('Error unpublishing site content:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
