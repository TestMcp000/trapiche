'use server';

/**
 * Server Actions for FAQs Admin Management
 *
 * Follows ARCHITECTURE.md §3.1:
 * - Server actions only do: parse/validate → call lib → revalidate
 * - Uses unified ActionResult type with error codes for i18n/security
 *
 * @see lib/modules/faq/admin-io.ts - IO operations
 * @see lib/types/action-result.ts - ActionResult types
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    getAllFAQsAdmin,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    reorderFAQs,
    toggleFAQVisibility,
} from '@/lib/modules/faq/admin-io';
import {
    ADMIN_ERROR_CODES,
    actionSuccess,
    actionError,
    type ActionResult,
} from '@/lib/types/action-result';
import type { FAQ, FAQInput } from '@/lib/types/faq';

// =============================================================================
// FAQ List Actions
// =============================================================================

/**
 * Get all FAQs for admin list
 */
export async function getAllFAQsAdminAction(): Promise<FAQ[]> {
    return getAllFAQsAdmin();
}

// Re-export for server component use
export { getAllFAQsAdmin };

// =============================================================================
// FAQ CRUD Actions
// =============================================================================

/**
 * Create a new FAQ
 */
export async function createFAQAction(
    input: FAQInput,
    locale: string
): Promise<ActionResult<FAQ>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        // Validate input
        if (!input.question_zh?.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }
        if (!input.answer_zh?.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const faq = await createFAQ({
            question_zh: input.question_zh.trim(),
            answer_zh: input.answer_zh.trim(),
            is_visible: input.is_visible ?? true,
        });

        if (!faq) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        revalidateTag('faqs', { expire: 0 });
        revalidatePath(`/${locale}/admin/faqs`);
        revalidatePath(`/${locale}/faq`);

        return actionSuccess(faq);
    } catch (error) {
        console.error('[faqs/actions] createFAQAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update an existing FAQ
 */
export async function updateFAQAction(
    id: string,
    input: Partial<FAQInput>,
    locale: string
): Promise<ActionResult<FAQ>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Validate question_zh if provided
        if (input.question_zh !== undefined && !input.question_zh.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Validate answer_zh if provided
        if (input.answer_zh !== undefined && !input.answer_zh.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const faq = await updateFAQ(id, {
            ...(input.question_zh !== undefined && { question_zh: input.question_zh.trim() }),
            ...(input.answer_zh !== undefined && { answer_zh: input.answer_zh.trim() }),
            ...(input.is_visible !== undefined && { is_visible: input.is_visible }),
        });

        if (!faq) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('faqs', { expire: 0 });
        revalidatePath(`/${locale}/admin/faqs`);
        revalidatePath(`/${locale}/faq`);

        return actionSuccess(faq);
    } catch (error) {
        console.error('[faqs/actions] updateFAQAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete a FAQ
 */
export async function deleteFAQAction(
    id: string,
    locale: string
): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await deleteFAQ(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        revalidateTag('faqs', { expire: 0 });
        revalidatePath(`/${locale}/admin/faqs`);
        revalidatePath(`/${locale}/faq`);

        return actionSuccess(null);
    } catch (error) {
        console.error('[faqs/actions] deleteFAQAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle FAQ visibility
 */
export async function toggleFAQVisibilityAction(
    id: string,
    isVisible: boolean,
    locale: string
): Promise<ActionResult<FAQ>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const faq = await toggleFAQVisibility(id, isVisible);

        if (!faq) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('faqs', { expire: 0 });
        revalidatePath(`/${locale}/admin/faqs`);
        revalidatePath(`/${locale}/faq`);

        return actionSuccess(faq);
    } catch (error) {
        console.error('[faqs/actions] toggleFAQVisibilityAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Reorder FAQs
 */
export async function reorderFAQsAction(
    orderedIds: string[],
    locale: string
): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!orderedIds || orderedIds.length === 0) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await reorderFAQs(orderedIds);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('faqs', { expire: 0 });
        revalidatePath(`/${locale}/admin/faqs`);
        revalidatePath(`/${locale}/faq`);

        return actionSuccess(null);
    } catch (error) {
        console.error('[faqs/actions] reorderFAQsAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
