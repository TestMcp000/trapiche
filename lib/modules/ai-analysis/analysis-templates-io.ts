import 'server-only';

/**
 * AI Analysis Templates IO (Server-only)
 *
 * CRUD operations for custom analysis templates.
 * Owner can CRUD; Editor can read enabled templates only.
 *
 * @see doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md (PR-3: AI Analysis Custom Templates)
 * @see lib/types/ai-analysis.ts - AnalysisCustomTemplate
 */

import { createClient } from '@/lib/infrastructure/supabase/server';

import type {
  AnalysisCustomTemplate,
  AnalysisCustomTemplateListItem,
  CreateCustomTemplateRequest,
  UpdateCustomTemplateRequest,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Types
// =============================================================================

interface TemplateRow {
  id: string;
  created_by: string;
  name: string;
  prompt_text: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Mappers
// =============================================================================

function mapRowToTemplate(row: TemplateRow): AnalysisCustomTemplate {
  return {
    id: row.id,
    createdBy: row.created_by,
    name: row.name,
    promptText: row.prompt_text,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToListItem(row: TemplateRow): AnalysisCustomTemplateListItem {
  return {
    id: row.id,
    name: row.name,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
  };
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * List templates based on user role.
 * Owner: all templates
 * Editor: enabled templates only
 */
export async function listTemplates(
  role: 'owner' | 'editor'
): Promise<AnalysisCustomTemplateListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from('ai_analysis_templates')
    .select('id, name, is_enabled, created_at')
    .order('created_at', { ascending: false });

  // Editor can only see enabled templates
  if (role === 'editor') {
    query = query.eq('is_enabled', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[templates-io] listTemplates error:', error.message);
    throw new Error(`Failed to list templates: ${error.message}`);
  }

  return (data || []).map((row) => mapRowToListItem(row as TemplateRow));
}

/**
 * Get a single template by ID.
 */
export async function getTemplate(
  id: string
): Promise<AnalysisCustomTemplate | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_analysis_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[templates-io] getTemplate error:', error.message);
    throw new Error(`Failed to get template: ${error.message}`);
  }

  return data ? mapRowToTemplate(data) : null;
}

/**
 * Fetch prompt text by template ID.
 * Used by worker to compose prompts for custom templates.
 * Returns null if template not found or disabled.
 */
export async function fetchPromptTextById(
  id: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_analysis_templates')
    .select('prompt_text, is_enabled')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[templates-io] fetchPromptTextById error:', error.message);
    throw new Error(`Failed to fetch template prompt: ${error.message}`);
  }

  // Return null for disabled templates (safety check)
  if (!data?.is_enabled) {
    console.warn(`[templates-io] Template ${id} is disabled`);
    return null;
  }

  return data?.prompt_text ?? null;
}

// =============================================================================
// Write Operations (Owner only - RLS enforces this)
// =============================================================================

/**
 * Create a new custom template.
 * Owner only (enforced by RLS).
 */
export async function createTemplate(
  data: CreateCustomTemplateRequest,
  userId: string
): Promise<AnalysisCustomTemplate> {
  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from('ai_analysis_templates')
    .insert({
      created_by: userId,
      name: data.name.trim(),
      prompt_text: data.promptText,
      is_enabled: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[templates-io] createTemplate error:', error.message);
    throw new Error(`Failed to create template: ${error.message}`);
  }

  return mapRowToTemplate(inserted);
}

/**
 * Update an existing template.
 * Owner only (enforced by RLS).
 */
export async function updateTemplate(
  id: string,
  data: UpdateCustomTemplateRequest
): Promise<AnalysisCustomTemplate> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    updates.name = data.name.trim();
  }
  if (data.promptText !== undefined) {
    updates.prompt_text = data.promptText;
  }
  if (data.isEnabled !== undefined) {
    updates.is_enabled = data.isEnabled;
  }

  const { data: updated, error } = await supabase
    .from('ai_analysis_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[templates-io] updateTemplate error:', error.message);
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return mapRowToTemplate(updated);
}

/**
 * Delete a template.
 * Owner only (enforced by RLS).
 */
export async function deleteTemplate(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ai_analysis_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[templates-io] deleteTemplate error:', error.message);
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

/**
 * Toggle template enabled state.
 * Owner only (enforced by RLS).
 */
export async function toggleTemplateEnabled(
  id: string,
  isEnabled: boolean
): Promise<AnalysisCustomTemplate> {
  return updateTemplate(id, { isEnabled });
}
