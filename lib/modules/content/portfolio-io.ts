/**
 * Portfolio IO
 *
 * Server-side data access for portfolio items.
 * Manages the portfolio_items table for showcasing work.
 *
 * @module lib/modules/content/portfolio-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { PortfolioItem, PortfolioItemInput } from '@/lib/types/content';
import { recordHistory } from './history-io';

// =============================================================================
// Portfolio Read Operations
// =============================================================================

/**
 * Get all portfolio items (for admin)
 */
export async function getAllPortfolioItems(): Promise<PortfolioItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching portfolio items:', error);
    return [];
  }

  return data || [];
}

/**
 * Get visible portfolio items (for frontend)
 */
export async function getVisiblePortfolioItems(): Promise<PortfolioItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching visible portfolio items:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single portfolio item by ID
 */
export async function getPortfolioItemById(id: string): Promise<PortfolioItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching portfolio item:', error);
    return null;
  }

  return data;
}

// =============================================================================
// Portfolio Write Operations
// =============================================================================

/**
 * Create a new portfolio item
 */
export async function createPortfolioItem(
  item: PortfolioItemInput,
  userId?: string
): Promise<PortfolioItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolio_items')
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error('Error creating portfolio item:', error);
    return null;
  }

  // Record history
  if (data) {
    await recordHistory('portfolio', data.id, 'create', null, JSON.parse(JSON.stringify(data)), userId);
  }

  return data;
}

/**
 * Update a portfolio item
 */
export async function updatePortfolioItem(
  id: string,
  item: Partial<PortfolioItemInput>,
  userId?: string
): Promise<PortfolioItem | null> {
  const supabase = await createClient();

  const current = await getPortfolioItemById(id);

  const { data, error } = await supabase
    .from('portfolio_items')
    .update({
      ...item,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating portfolio item:', error);
    return null;
  }

  // Record history
  if (current && data) {
    await recordHistory('portfolio', id, 'update', JSON.parse(JSON.stringify(current)), JSON.parse(JSON.stringify(data)), userId);
  }

  return data;
}

/**
 * Delete a portfolio item
 */
export async function deletePortfolioItem(id: string, userId?: string): Promise<boolean> {
  const supabase = await createClient();

  const current = await getPortfolioItemById(id);

  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting portfolio item:', error);
    return false;
  }

  // Record history
  if (current) {
    await recordHistory('portfolio', id, 'delete', JSON.parse(JSON.stringify(current)), { deleted: true }, userId);
  }

  return true;
}

/**
 * Reorder portfolio items
 */
export async function reorderPortfolioItems(
  items: { id: string; sort_order: number }[]
): Promise<boolean> {
  const supabase = await createClient();

  for (const item of items) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      console.error('Error reordering portfolio items:', error);
      return false;
    }
  }

  return true;
}
