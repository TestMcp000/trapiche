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
import { revalidatePath, revalidateTag } from 'next/cache';
import { parseHamburgerNav } from '@/lib/validators/hamburger-nav';
import { deepValidateHamburgerNav } from '@/lib/modules/content/hamburger-nav-publish-io';
import {
  getSiteContent,
  updateSiteContent,
  togglePublishSiteContent,
} from '@/lib/modules/content/site-content-io';
import type { HamburgerNavV2 } from '@/lib/types/hamburger-nav';

const SECTION_KEY = 'hamburger_nav';

interface ActionResult {
  success: boolean;
  error?: string;
  validationErrors?: Array<{ path: string; message: string }>;
}

/**
 * Save hamburger nav as draft (schema validation only, no DB existence check)
 */
export async function saveNavDraft(
  nav: HamburgerNavV2,
  locale: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '尚未登入' };
    }

    // Validate structure (cast to Record for parseHamburgerNav)
    const parseResult = parseHamburgerNav(nav as unknown as Record<string, unknown>);
    if (parseResult.errors.length > 0) {
      return {
        success: false,
        error: '導航結構驗證失敗',
        validationErrors: parseResult.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      };
    }

    // Save to DB (content_en and content_zh are mirrored for single-language site)
    const result = await updateSiteContent(
      SECTION_KEY,
      nav as unknown as Record<string, unknown>,
      nav as unknown as Record<string, unknown>,
      user.id
    );

    if (!result) {
      return { success: false, error: '儲存草稿失敗' };
    }

    // Invalidate cache
    revalidateTag('site-content', { expire: 0 });
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/settings/navigation`);

    return { success: true };
  } catch (error) {
    console.error('Error saving nav draft:', error);
    return { success: false, error: '發生未預期的錯誤' };
  }
}

/**
 * Publish hamburger nav (deep validation: check all targets exist and are public)
 */
export async function publishNav(locale: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '尚未登入' };
    }

    // Fetch current draft content
    const currentContent = await getSiteContent(SECTION_KEY);
    if (!currentContent) {
      return { success: false, error: '找不到導航內容' };
    }

    // Parse and validate structure
    const parseResult = parseHamburgerNav(currentContent.content_zh);
    if (parseResult.errors.length > 0 || !parseResult.nav) {
      return {
        success: false,
        error: '導航結構驗證失敗，無法發布',
        validationErrors: parseResult.errors.map((e) => ({
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
        validationErrors: deepResult.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      };
    }

    // Toggle publish
    const result = await togglePublishSiteContent(SECTION_KEY, true, user.id);

    if (!result) {
      return { success: false, error: '發布失敗' };
    }

    // Invalidate cache
    revalidateTag('site-content', { expire: 0 });
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/settings/navigation`);

    return { success: true };
  } catch (error) {
    console.error('Error publishing nav:', error);
    return { success: false, error: '發生未預期的錯誤' };
  }
}

/**
 * Unpublish hamburger nav
 */
export async function unpublishNav(locale: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '尚未登入' };
    }

    const result = await togglePublishSiteContent(SECTION_KEY, false, user.id);

    if (!result) {
      return { success: false, error: '取消發布失敗' };
    }

    // Invalidate cache
    revalidateTag('site-content', { expire: 0 });
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/settings/navigation`);

    return { success: true };
  } catch (error) {
    console.error('Error unpublishing nav:', error);
    return { success: false, error: '發生未預期的錯誤' };
  }
}
