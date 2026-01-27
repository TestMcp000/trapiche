'use server';

/**
 * Server Actions for Blog Groups Management
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
    createBlogGroup,
    updateBlogGroup,
    deleteBlogGroup,
    reorderBlogGroups,
} from '@/lib/modules/blog/taxonomy-admin-io';
import {
    ADMIN_ERROR_CODES,
    actionSuccess,
    actionError,
    type ActionResult,
} from '@/lib/types/action-result';
import { isValidSlug } from '@/lib/validators/slug';
import type { BlogGroup, BlogGroupInput } from '@/lib/types/blog-taxonomy';

// =============================================================================
// Types
// =============================================================================

export interface GroupActionInput {
    name_zh: string;
    slug: string;
    is_visible?: boolean;
}

// =============================================================================
// Validation
// =============================================================================

function validateGroupInput(input: GroupActionInput): typeof ADMIN_ERROR_CODES.VALIDATION_ERROR | null {
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
 * Create a new blog group
 */
export async function createGroupAction(
    input: GroupActionInput,
    locale: string
): Promise<ActionResult<BlogGroup>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const validationError = validateGroupInput(input);
        if (validationError) {
            return actionError(validationError);
        }

        const groupInput: BlogGroupInput = {
            name_zh: input.name_zh.trim(),
            slug: input.slug.trim(),
            is_visible: input.is_visible ?? true,
        };

        const group = await createBlogGroup(groupInput);

        if (!group) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/groups`);

        return actionSuccess(group);
    } catch (error) {
        console.error('[groups/actions] createGroupAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update an existing blog group
 */
export async function updateGroupAction(
    id: string,
    input: GroupActionInput,
    locale: string
): Promise<ActionResult<BlogGroup>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const validationError = validateGroupInput(input);
        if (validationError) {
            return actionError(validationError);
        }

        const groupInput: Partial<BlogGroupInput> = {
            name_zh: input.name_zh.trim(),
            slug: input.slug.trim(),
            is_visible: input.is_visible,
        };

        const group = await updateBlogGroup(id, groupInput);

        if (!group) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/groups`);

        return actionSuccess(group);
    } catch (error) {
        console.error('[groups/actions] updateGroupAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete a blog group
 */
export async function deleteGroupAction(
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

        const success = await deleteBlogGroup(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/groups`);

        return actionSuccess();
    } catch (error) {
        console.error('[groups/actions] deleteGroupAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Reorder blog groups
 */
export async function reorderGroupsAction(
    orderedIds: string[],
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!orderedIds || orderedIds.length === 0) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await reorderBlogGroups(orderedIds);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/groups`);

        return actionSuccess();
    } catch (error) {
        console.error('[groups/actions] reorderGroupsAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle group visibility
 */
export async function toggleGroupVisibilityAction(
    id: string,
    isVisible: boolean,
    locale: string
): Promise<ActionResult<BlogGroup>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const group = await updateBlogGroup(id, { is_visible: isVisible });

        if (!group) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/groups`);

        return actionSuccess(group);
    } catch (error) {
        console.error('[groups/actions] toggleGroupVisibilityAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
