'use server';

/**
 * AI Analysis Templates Server Actions
 *
 * Server actions for custom template CRUD operations.
 * RBAC: Owner can CRUD, Editor is read-only.
 *
 * @see lib/modules/ai-analysis/analysis-templates-io.ts
 * @see doc/specs/completed/ai-analysis-spec.md (templates contract)
 */

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getAdminRole } from '@/lib/modules/auth';
import { requireOwner, requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateEnabled,
} from '@/lib/modules/ai-analysis/analysis-templates-io';
import {
    validateCreateCustomTemplateInput,
    validateUpdateCustomTemplateInput,
} from '@/lib/validators/custom-template';
import {
    ADMIN_ERROR_CODES,
    actionError,
    actionSuccess,
    type ActionResult,
} from '@/lib/types/action-result';

import type {
    AnalysisCustomTemplate,
    AnalysisCustomTemplateListItem,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Read Actions
// =============================================================================

/**
 * List templates for current user.
 * Owner sees all templates, Editor sees enabled only.
 */
export async function listTemplatesAction(): Promise<
    ActionResult<AnalysisCustomTemplateListItem[]>
> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const role = await getAdminRole(supabase);

        if (!role) {
            return actionError(ADMIN_ERROR_CODES.FORBIDDEN);
        }

        const templates = await listTemplates(role);
        return actionSuccess(templates);
    } catch (error) {
        console.error('[templates-action] listTemplatesAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Get single template by ID.
 */
export async function getTemplateAction(
    id: string
): Promise<ActionResult<AnalysisCustomTemplate>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const role = await getAdminRole(supabase);

        if (!role) {
            return actionError(ADMIN_ERROR_CODES.FORBIDDEN);
        }

        const template = await getTemplate(id);
        if (!template) {
            return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
        }

        // Editor can only view enabled templates
        if (role === 'editor' && !template.isEnabled) {
            return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
        }

        return actionSuccess(template);
    } catch (error) {
        console.error('[templates-action] getTemplateAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

// =============================================================================
// Write Actions (Owner Only)
// =============================================================================

/**
 * Create a new custom template.
 * Owner only.
 */
export async function createTemplateAction(
    input: unknown,
    locale: string
): Promise<ActionResult<AnalysisCustomTemplate>> {
    try {
        const supabase = await createClient();
        const guard = await requireOwner(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        // Validate input
        const validation = validateCreateCustomTemplateInput(input);
        if (!validation.valid) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Create template
        const template = await createTemplate(validation.data!, guard.userId);

        // Revalidate cache
        revalidatePath(`/${locale}/admin/ai-analysis/templates`, 'page');
        revalidatePath(`/${locale}/admin/ai-analysis`, 'page');

        return actionSuccess(template);
    } catch (error) {
        console.error('[templates-action] createTemplateAction error:', error);
        return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
    }
}

/**
 * Update an existing template.
 * Owner only.
 */
export async function updateTemplateAction(
    id: string,
    input: unknown,
    locale: string
): Promise<ActionResult<AnalysisCustomTemplate>> {
    try {
        const supabase = await createClient();
        const guard = await requireOwner(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Validate input
        const validation = validateUpdateCustomTemplateInput(input);
        if (!validation.valid) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Ensure template exists (better error code)
        const existing = await getTemplate(id);
        if (!existing) {
            return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
        }

        // Update template
        const template = await updateTemplate(id, validation.data!);

        // Revalidate cache
        revalidatePath(`/${locale}/admin/ai-analysis/templates`, 'page');
        revalidatePath(`/${locale}/admin/ai-analysis`, 'page');

        return actionSuccess(template);
    } catch (error) {
        console.error('[templates-action] updateTemplateAction error:', error);
        return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }
}

/**
 * Delete a template.
 * Owner only.
 */
export async function deleteTemplateAction(
    id: string,
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireOwner(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const existing = await getTemplate(id);
        if (!existing) {
            return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
        }

        await deleteTemplate(id);

        // Revalidate cache
        revalidatePath(`/${locale}/admin/ai-analysis/templates`, 'page');
        revalidatePath(`/${locale}/admin/ai-analysis`, 'page');

        return actionSuccess();
    } catch (error) {
        console.error('[templates-action] deleteTemplateAction error:', error);
        return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
    }
}

/**
 * Toggle template enabled state.
 * Owner only.
 */
export async function toggleTemplateEnabledAction(
    id: string,
    isEnabled: boolean,
    locale: string
): Promise<ActionResult<AnalysisCustomTemplate>> {
    try {
        const supabase = await createClient();
        const guard = await requireOwner(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const existing = await getTemplate(id);
        if (!existing) {
            return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
        }

        const template = await toggleTemplateEnabled(id, isEnabled);

        // Revalidate cache
        revalidatePath(`/${locale}/admin/ai-analysis/templates`, 'page');
        revalidatePath(`/${locale}/admin/ai-analysis`, 'page');

        return actionSuccess(template);
    } catch (error) {
        console.error('[templates-action] toggleTemplateEnabledAction error:', error);
        return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }
}
