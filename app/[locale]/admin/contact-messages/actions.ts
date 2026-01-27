'use server';

/**
 * Server Actions for Contact Messages Admin Management
 *
 * Follows ARCHITECTURE.md §3.1:
 * - Server actions only do: parse/validate → call lib → revalidate
 * - Uses unified ActionResult type with error codes for i18n/security
 *
 * @see lib/modules/contact/admin-io.ts - IO operations
 * @see lib/types/action-result.ts - ActionResult types
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    getContactMessagesAdmin as getContactMessagesAdminIO,
    markMessageAsRead,
    markMessageAsUnread,
    archiveMessage,
    unarchiveMessage,
    deleteMessage,
    getUnreadMessagesCount,
    purgeOldMessages,
    type ContactMessagesQueryOptions,
} from '@/lib/modules/contact/admin-io';
import {
    ADMIN_ERROR_CODES,
    actionSuccess,
    actionError,
    type ActionResult,
} from '@/lib/types/action-result';
import type { ContactMessageListItem } from '@/lib/types/contact';

// =============================================================================
// Query Actions
// =============================================================================

/**
 * Get contact messages for admin list
 */
export async function getContactMessagesAdmin(
    options: ContactMessagesQueryOptions = {}
): Promise<{ data: ContactMessageListItem[]; total: number }> {
    return getContactMessagesAdminIO(options);
}

/**
 * Get unread messages count
 */
export async function getUnreadCountAction(): Promise<number> {
    return getUnreadMessagesCount();
}

// =============================================================================
// Message Actions
// =============================================================================

/**
 * Mark a message as read
 */
export async function markAsReadAction(
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

        const success = await markMessageAsRead(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidatePath(`/${locale}/admin/contact-messages`);

        return actionSuccess(null);
    } catch (error) {
        console.error('[contact-messages/actions] markAsReadAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Mark a message as unread
 */
export async function markAsUnreadAction(
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

        const success = await markMessageAsUnread(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidatePath(`/${locale}/admin/contact-messages`);

        return actionSuccess(null);
    } catch (error) {
        console.error('[contact-messages/actions] markAsUnreadAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Archive a message
 */
export async function archiveMessageAction(
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

        const success = await archiveMessage(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidatePath(`/${locale}/admin/contact-messages`);

        return actionSuccess(null);
    } catch (error) {
        console.error('[contact-messages/actions] archiveMessageAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Unarchive a message
 */
export async function unarchiveMessageAction(
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

        const success = await unarchiveMessage(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidatePath(`/${locale}/admin/contact-messages`);

        return actionSuccess(null);
    } catch (error) {
        console.error('[contact-messages/actions] unarchiveMessageAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete a message permanently
 */
export async function deleteMessageAction(
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

        const success = await deleteMessage(id);

        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        revalidatePath(`/${locale}/admin/contact-messages`);

        return actionSuccess(null);
    } catch (error) {
        console.error('[contact-messages/actions] deleteMessageAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Purge messages older than specified days
 */
export async function purgeOldMessagesAction(
    daysOld: number,
    locale: string
): Promise<ActionResult<number>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (daysOld < 1) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const deletedCount = await purgeOldMessages(daysOld);

        revalidatePath(`/${locale}/admin/contact-messages`);

        return actionSuccess(deletedCount);
    } catch (error) {
        console.error('[contact-messages/actions] purgeOldMessagesAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
