'use server';

/**
 * Server actions for hamburger navigation editor
 *
 * Provides save draft, publish, and unpublish operations for the
 * visual hamburger nav editor. Reuses existing content IO modules.
 *
 * @module app/[locale]/admin/settings/navigation/actions
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import { revalidatePath, revalidateTag } from 'next/cache';
import { parseHamburgerNav } from '@/lib/validators/hamburger-nav';
import { deepValidateHamburgerNav } from '@/lib/modules/content/hamburger-nav-publish-io';
import {
  getSiteContent,
  updateSiteContent,
  togglePublishSiteContent,
} from '@/lib/modules/content/site-content-io';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';
import type { HamburgerNavV2 } from '@/lib/types/hamburger-nav';

const SECTION_KEY = 'hamburger_nav';

/**
 * Save hamburger nav as draft (schema validation only, no DB existence check)
 */
export async function saveNavDraft(
  nav: HamburgerNavV2,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // Validate structure (cast to Record for parseHamburgerNav)
    const parseResult = parseHamburgerNav(nav as unknown as Record<string, unknown>);
    if (parseResult.errors.length > 0) {
      return {
        success: false,
        errorCode: ADMIN_ERROR_CODES.VALIDATION_ERROR,
        details: {
          validationErrors: parseResult.errors.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        },
      };
    }

    // Save to DB (content_en and content_zh are mirrored for single-language site)
    const result = await updateSiteContent(
      SECTION_KEY,
      nav as unknown as Record<string, unknown>,
      nav as unknown as Record<string, unknown>,
      guard.userId
    );

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Invalidate cache
    revalidateTag('site-content', { expire: 0 });
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/settings/navigation`);

    return actionSuccess();
  } catch (error) {
    console.error('Error saving nav draft:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Publish hamburger nav (deep validation: check all targets exist and are public)
 */
export async function publishNav(locale: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // Fetch current draft content
    const currentContent = await getSiteContent(SECTION_KEY);
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
          })),
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
          })),
        },
      };
    }

    // Toggle publish
    const result = await togglePublishSiteContent(SECTION_KEY, true, guard.userId);

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Invalidate cache
    revalidateTag('site-content', { expire: 0 });
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/settings/navigation`);

    return actionSuccess();
  } catch (error) {
    console.error('Error publishing nav:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Unpublish hamburger nav
 */
export async function unpublishNav(locale: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    const result = await togglePublishSiteContent(SECTION_KEY, false, guard.userId);

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Invalidate cache
    revalidateTag('site-content', { expire: 0 });
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/settings/navigation`);

    return actionSuccess();
  } catch (error) {
    console.error('Error unpublishing nav:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
