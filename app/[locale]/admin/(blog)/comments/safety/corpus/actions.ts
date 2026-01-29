'use server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    getSafetyCorpusItems,
    createSafetyCorpusItem,
    updateSafetyCorpusItem,
    updateSafetyCorpusStatus,
    deleteSafetyCorpusItem,
} from '@/lib/modules/safety-risk-engine/admin-io';
import type { SafetyCorpusItem, SafetyCorpusKind, SafetyCorpusStatus } from '@/lib/types/safety-risk-engine';
import {
    ADMIN_ERROR_CODES,
    actionError,
    actionSuccess,
    type ActionResult,
} from '@/lib/types/action-result';

/**
 * Fetch corpus items with optional filtering.
 */
export async function fetchCorpusItemsAction(
    filters: { kind?: SafetyCorpusKind; status?: SafetyCorpusStatus; search?: string } = {}
): Promise<ActionResult<SafetyCorpusItem[]>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const items = await getSafetyCorpusItems(filters);
        return actionSuccess(items);
    } catch (error) {
        console.error('[fetchCorpusItemsAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Create a new corpus item.
 */
export async function createCorpusItemAction(data: {
    kind: SafetyCorpusKind;
    label: string;
    content: string;
}): Promise<ActionResult<{ itemId: string }>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const itemId = await createSafetyCorpusItem(data, guard.userId);
        if (!itemId) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        return actionSuccess({ itemId });
    } catch (error) {
        console.error('[createCorpusItemAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update a corpus item.
 */
export async function updateCorpusItemAction(
    id: string,
    data: { label?: string; content?: string }
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const success = await updateSafetyCorpusItem(id, data, guard.userId);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        return actionSuccess();
    } catch (error) {
        console.error('[updateCorpusItemAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update corpus item status.
 */
export async function updateCorpusStatusAction(
    id: string,
    status: SafetyCorpusStatus
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const success = await updateSafetyCorpusStatus(id, status, guard.userId);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        return actionSuccess();
    } catch (error) {
        console.error('[updateCorpusStatusAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete a corpus item.
 */
export async function deleteCorpusItemAction(
    id: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const success = await deleteSafetyCorpusItem(id);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        return actionSuccess();
    } catch (error) {
        console.error('[deleteCorpusItemAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
