'use server';

/**
 * Server Actions for Blog Topics Management
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
    createBlogTopic,
    updateBlogTopic,
    deleteBlogTopic,
    reorderBlogTopics,
    updateBlogGroup,
} from '@/lib/modules/blog/taxonomy-admin-io';
import { syncHamburgerNavAutogen } from '@/lib/modules/content/hamburger-nav-autogen-io';
import {
    ADMIN_ERROR_CODES,
    actionSuccess,
    actionError,
    type ActionResult,
} from '@/lib/types/action-result';
import { isValidSlug } from '@/lib/validators/slug';
import type { BlogTopic, BlogTopicInput } from '@/lib/types/blog-taxonomy';

// =============================================================================
// Types
// =============================================================================

export interface TopicActionInput {
    group_id: string;
    name_zh: string;
    slug: string;
    is_visible?: boolean;
}

// =============================================================================
// Validation
// =============================================================================

function validateTopicInput(input: TopicActionInput): typeof ADMIN_ERROR_CODES.VALIDATION_ERROR | null {
    if (!input.group_id?.trim()) {
        return ADMIN_ERROR_CODES.VALIDATION_ERROR;
    }

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
 * Create a new blog topic
 */
export async function createTopicAction(
    input: TopicActionInput,
    locale: string
): Promise<ActionResult<BlogTopic>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const validationError = validateTopicInput(input);
        if (validationError) {
            return actionError(validationError);
        }

        const topicInput: BlogTopicInput = {
            group_id: input.group_id.trim(),
            name_zh: input.name_zh.trim(),
            slug: input.slug.trim(),
            is_visible: input.is_visible ?? true,
        };

        const topic = await createBlogTopic(topicInput);

        if (!topic) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/topics`);

        return actionSuccess(topic);
    } catch (error) {
        console.error('[topics/actions] createTopicAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update an existing blog topic
 */
export async function updateTopicAction(
    id: string,
    input: TopicActionInput,
    locale: string
): Promise<ActionResult<BlogTopic>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const validationError = validateTopicInput(input);
        if (validationError) {
            return actionError(validationError);
        }

        const topicInput: Partial<BlogTopicInput> = {
            group_id: input.group_id.trim(),
            name_zh: input.name_zh.trim(),
            slug: input.slug.trim(),
            is_visible: input.is_visible,
        };

        const topic = await updateBlogTopic(id, topicInput);

        if (!topic) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/topics`);

        return actionSuccess(topic);
    } catch (error) {
        console.error('[topics/actions] updateTopicAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete a blog topic
 */
export async function deleteTopicAction(
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

        const success = await deleteBlogTopic(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/topics`);

        return actionSuccess();
    } catch (error) {
        console.error('[topics/actions] deleteTopicAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Reorder blog topics within a group
 */
export async function reorderTopicsAction(
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

        const success = await reorderBlogTopics(orderedIds);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/topics`);

        return actionSuccess();
    } catch (error) {
        console.error('[topics/actions] reorderTopicsAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle topic visibility
 */
export async function toggleTopicVisibilityAction(
    id: string,
    isVisible: boolean,
    locale: string
): Promise<ActionResult<BlogTopic>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const topic = await updateBlogTopic(id, { is_visible: isVisible });

        if (!topic) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/topics`);

        return actionSuccess(topic);
    } catch (error) {
        console.error('[topics/actions] toggleTopicVisibilityAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle topic "show in hamburger nav" flag
 * If turning ON, also ensures the parent group is set to show_in_nav for UX consistency.
 */
export async function toggleTopicShowInNavAction(
    id: string,
    showInNav: boolean,
    locale: string
): Promise<ActionResult<BlogTopic>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const topic = await updateBlogTopic(id, { show_in_nav: showInNav });

        if (!topic) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        // If enabling a topic, ensure its parent group is also enabled for nav.
        if (showInNav) {
            await updateBlogGroup(topic.group_id, { show_in_nav: true });
        }

        const sync = await syncHamburgerNavAutogen(guard.userId);
        if (sync.updated) {
            revalidateTag('site-content', { expire: 0 });
            revalidatePath(`/${locale}`);
            revalidatePath(`/${locale}/admin/settings/navigation`);
        }

        revalidateTag('blog', { expire: 0 });
        revalidatePath(`/${locale}/admin/topics`);

        return actionSuccess(topic);
    } catch (error) {
        console.error('[topics/actions] toggleTopicShowInNavAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
