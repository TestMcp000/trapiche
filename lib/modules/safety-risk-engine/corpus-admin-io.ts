/**
 * Safety Risk Engine - Corpus Admin IO Module
 *
 * Server-only module for safety corpus CRUD operations.
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import { enqueueEmbedding } from '@/lib/embeddings';
import type {
    SafetyCorpusItem,
    SafetyCorpusStatus,
    SafetyCorpusKind,
} from '@/lib/types/safety-risk-engine';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

// =============================================================================
// Corpus CRUD Operations
// =============================================================================

/**
 * Get safety corpus items with optional filtering.
 */
export async function getSafetyCorpusItems(
    filters: { kind?: SafetyCorpusKind; status?: SafetyCorpusStatus; search?: string } = {}
): Promise<SafetyCorpusItem[]> {
    const supabase = createAdminClient();

    let query = supabase
        .from('safety_corpus_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.kind) {
        query = query.eq('kind', filters.kind);
    }
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.search) {
        query = query.or(`label.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[getSafetyCorpusItems] Query error:', error);
        return [];
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        kind: row.kind as SafetyCorpusKind,
        status: row.status as SafetyCorpusStatus,
        label: row.label,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
    }));
}

/**
 * Create a new safety corpus item (defaults to draft status).
 */
export async function createSafetyCorpusItem(
    data: { kind: SafetyCorpusKind; label: string; content: string },
    userId: string
): Promise<string | null> {
    const supabase = createAdminClient();

    const { data: result, error } = await supabase
        .from('safety_corpus_items')
        .insert({
            kind: data.kind,
            status: 'draft',
            label: data.label,
            content: data.content,
            created_by: userId,
            updated_by: userId,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[createSafetyCorpusItem] Insert error:', error);
        return null;
    }

    return result?.id ?? null;
}

/**
 * Update a safety corpus item.
 */
export async function updateSafetyCorpusItem(
    id: string,
    data: { label?: string; content?: string },
    userId: string
): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('safety_corpus_items')
        .update({
            ...data,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('[updateSafetyCorpusItem] Update error:', error);
        return false;
    }

    return true;
}

/**
 * Update safety corpus item status.
 * When activating, automatically enqueues embedding generation.
 */
export async function updateSafetyCorpusStatus(
    id: string,
    status: SafetyCorpusStatus,
    userId: string
): Promise<boolean> {
    const supabase = createAdminClient();

    // First get current item to determine kind for embedding target type
    const { data: item } = await supabase
        .from('safety_corpus_items')
        .select('kind')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('safety_corpus_items')
        .update({
            status,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('[updateSafetyCorpusStatus] Update error:', error);
        return false;
    }

    // If activating, enqueue embedding
    if (status === 'active' && item) {
        const targetType: EmbeddingTargetType = item.kind === 'slang' ? 'safety_slang' : 'safety_case';
        const result = await enqueueEmbedding({
            targetType,
            targetId: id,
            priority: 'high',
        });

        if (!result.success) {
            console.warn('[updateSafetyCorpusStatus] Embedding enqueue failed:', result.error);
            // Don't fail the status update, embedding can be retried
        }
    }

    return true;
}

/**
 * Delete a safety corpus item.
 */
export async function deleteSafetyCorpusItem(id: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('safety_corpus_items')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[deleteSafetyCorpusItem] Delete error:', error);
        return false;
    }

    return true;
}

// =============================================================================
// Promote to Corpus
// =============================================================================

/**
 * Promote a text snippet to safety corpus (from comment review).
 * Creates a draft corpus item and optionally activates it.
 */
export async function promoteToCorpus(
    data: { text: string; label: string; kind: SafetyCorpusKind; activate?: boolean },
    userId: string
): Promise<string | null> {
    // Create the corpus item
    const itemId = await createSafetyCorpusItem(
        { kind: data.kind, label: data.label, content: data.text },
        userId
    );

    if (!itemId) {
        return null;
    }

    // Optionally activate (which triggers embedding enqueue)
    if (data.activate) {
        await updateSafetyCorpusStatus(itemId, 'active', userId);
    }

    return itemId;
}
