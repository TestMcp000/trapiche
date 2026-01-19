'use server';

/**
 * AI Analysis Templates Server Actions
 *
 * Server actions for custom template CRUD operations.
 * RBAC: Owner can CRUD, Editor is read-only.
 *
 * @see lib/modules/ai-analysis/analysis-templates-io.ts
 * @see doc/meta/STEP_PLAN.md - PR-2A
 */

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getAdminRole } from '@/lib/modules/auth';
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

import type {
    AnalysisCustomTemplate,
    AnalysisCustomTemplateListItem,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Types
// =============================================================================

interface ActionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

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
        const role = await getAdminRole(supabase);

        if (!role) {
            return { success: false, error: 'Unauthorized' };
        }

        const templates = await listTemplates(role);
        return { success: true, data: templates };
    } catch (error) {
        console.error('[templates-action] listTemplatesAction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list templates',
        };
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
        const role = await getAdminRole(supabase);

        if (!role) {
            return { success: false, error: 'Unauthorized' };
        }

        const template = await getTemplate(id);
        if (!template) {
            return { success: false, error: 'Template not found' };
        }

        // Editor can only view enabled templates
        if (role === 'editor' && !template.isEnabled) {
            return { success: false, error: 'Template not found' };
        }

        return { success: true, data: template };
    } catch (error) {
        console.error('[templates-action] getTemplateAction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get template',
        };
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
    input: unknown
): Promise<ActionResult<AnalysisCustomTemplate>> {
    try {
        const supabase = await createClient();
        const role = await getAdminRole(supabase);

        if (role !== 'owner') {
            return { success: false, error: 'Only owner can create templates' };
        }

        // Get user ID
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // Validate input
        const validation = validateCreateCustomTemplateInput(input);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Create template
        const template = await createTemplate(validation.data!, user.id);

        // Revalidate cache
        revalidatePath('/[locale]/admin/(data)/ai-analysis/templates', 'page');
        revalidatePath('/[locale]/admin/(data)/ai-analysis', 'page');

        return { success: true, data: template };
    } catch (error) {
        console.error('[templates-action] createTemplateAction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create template',
        };
    }
}

/**
 * Update an existing template.
 * Owner only.
 */
export async function updateTemplateAction(
    id: string,
    input: unknown
): Promise<ActionResult<AnalysisCustomTemplate>> {
    try {
        const supabase = await createClient();
        const role = await getAdminRole(supabase);

        if (role !== 'owner') {
            return { success: false, error: 'Only owner can update templates' };
        }

        // Validate input
        const validation = validateUpdateCustomTemplateInput(input);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Update template
        const template = await updateTemplate(id, validation.data!);

        // Revalidate cache
        revalidatePath('/[locale]/admin/(data)/ai-analysis/templates', 'page');
        revalidatePath('/[locale]/admin/(data)/ai-analysis', 'page');

        return { success: true, data: template };
    } catch (error) {
        console.error('[templates-action] updateTemplateAction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update template',
        };
    }
}

/**
 * Delete a template.
 * Owner only.
 */
export async function deleteTemplateAction(
    id: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const role = await getAdminRole(supabase);

        if (role !== 'owner') {
            return { success: false, error: 'Only owner can delete templates' };
        }

        await deleteTemplate(id);

        // Revalidate cache
        revalidatePath('/[locale]/admin/(data)/ai-analysis/templates', 'page');
        revalidatePath('/[locale]/admin/(data)/ai-analysis', 'page');

        return { success: true };
    } catch (error) {
        console.error('[templates-action] deleteTemplateAction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete template',
        };
    }
}

/**
 * Toggle template enabled state.
 * Owner only.
 */
export async function toggleTemplateEnabledAction(
    id: string,
    isEnabled: boolean
): Promise<ActionResult<AnalysisCustomTemplate>> {
    try {
        const supabase = await createClient();
        const role = await getAdminRole(supabase);

        if (role !== 'owner') {
            return { success: false, error: 'Only owner can toggle templates' };
        }

        const template = await toggleTemplateEnabled(id, isEnabled);

        // Revalidate cache
        revalidatePath('/[locale]/admin/(data)/ai-analysis/templates', 'page');
        revalidatePath('/[locale]/admin/(data)/ai-analysis', 'page');

        return { success: true, data: template };
    } catch (error) {
        console.error('[templates-action] toggleTemplateEnabledAction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle template',
        };
    }
}
