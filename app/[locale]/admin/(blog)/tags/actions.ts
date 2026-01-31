'use server';

/**
 * Server Actions for Blog Tags Management
 *
 * Follows ARCHITECTURE.md §3.1:
 * - Server actions only do: parse/validate → call lib → revalidate
 * - Uses unified ActionResult type with error codes for i18n/security
 *
 * @see lib/modules/blog/taxonomy-admin-io.ts - IO operations
 * @see lib/types/action-result.ts - ActionResult types
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    createBlogTag,
    updateBlogTag,
    deleteBlogTag,
    mergeBlogTags,
} from '@/lib/modules/blog/taxonomy-admin-io';
import { syncHamburgerNavAutogen } from '@/lib/modules/content/hamburger-nav-autogen-io';
import {
    ADMIN_ERROR_CODES,
    actionSuccess,
    actionError,
    type ActionResult,
} from '@/lib/types/action-result';
import { isValidSlug } from '@/lib/validators/slug';
import type { BlogTag, BlogTagInput } from '@/lib/types/blog-taxonomy';

// =============================================================================
// Types
// =============================================================================

export interface TagActionInput {
    name_zh: string;
    slug: string;
}

// =============================================================================
// Validation
// =============================================================================

function validateTagInput(input: TagActionInput): typeof ADMIN_ERROR_CODES.VALIDATION_ERROR | null {
    if (!input.name_zh?.trim()) {
        return ADMIN_ERROR_CODES.VALIDATION_ERROR;
    }

    if (!input.slug?.trim() || !isValidSlug(input.slug.trim())) {
        return ADMIN_ERROR_CODES.VALIDATION_ERROR;
    }

    return null;
}

// =============================================================================
// Actions
// =============================================================================

/**
 * Create a new blog tag
 */
export async function createTagAction(
    input: TagActionInput,
    locale: string
): Promise<ActionResult<BlogTag>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const validationError = validateTagInput(input);
        if (validationError) {
            return actionError(validationError);
        }

        const tagInput: BlogTagInput = {
            name_zh: input.name_zh.trim(),
            slug: input.slug.trim(),
        };

        const tag = await createBlogTag(tagInput);

        if (!tag) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/tags`);

        return actionSuccess(tag);
    } catch (error) {
        console.error('[tags/actions] createTagAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update an existing blog tag (rename)
 */
export async function updateTagAction(
    id: string,
    input: TagActionInput,
    locale: string
): Promise<ActionResult<BlogTag>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const validationError = validateTagInput(input);
        if (validationError) {
            return actionError(validationError);
        }

        const tagInput: Partial<BlogTagInput> = {
            name_zh: input.name_zh.trim(),
            slug: input.slug.trim(),
        };

        const tag = await updateBlogTag(id, tagInput);

        if (!tag) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/tags`);

        return actionSuccess(tag);
    } catch (error) {
        console.error('[tags/actions] updateTagAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete a blog tag
 */
export async function deleteTagAction(
    id: string,
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await deleteBlogTag(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/tags`);

        return actionSuccess();
    } catch (error) {
        console.error('[tags/actions] deleteTagAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Merge multiple tags into one
 */
export async function mergeTagsAction(
    sourceIds: string[],
    targetId: string,
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!sourceIds || sourceIds.length === 0 || !targetId) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Cannot merge tag into itself
        if (sourceIds.includes(targetId)) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await mergeBlogTags(sourceIds, targetId);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/tags`);

        return actionSuccess();
    } catch (error) {
        console.error('[tags/actions] mergeTagsAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle tag "show in hamburger nav" flag
 */
export async function toggleTagShowInNavAction(
    id: string,
    showInNav: boolean,
    locale: string
): Promise<ActionResult<BlogTag>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const tag = await updateBlogTag(id, { show_in_nav: showInNav });

        if (!tag) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        const sync = await syncHamburgerNavAutogen(guard.userId);
        if (sync.updated) {
            revalidateTag('site-content', { expire: 0 });
            revalidatePath(`/${locale}`);
            revalidatePath(`/${locale}/admin/settings/navigation`);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/tags`);

        return actionSuccess(tag);
    } catch (error) {
        console.error('[tags/actions] toggleTagShowInNavAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
