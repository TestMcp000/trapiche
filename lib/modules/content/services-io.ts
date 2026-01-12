/**
 * Services IO
 *
 * Server-side data access for services.
 * Manages the services table for displaying offered services.
 *
 * @module lib/modules/content/services-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { Service, ServiceInput } from '@/lib/types/content';
import { recordHistory } from './history-io';

// =============================================================================
// Services Read Operations
// =============================================================================

/**
 * Get all services (for admin)
 */
export async function getAllServices(): Promise<Service[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  return data || [];
}

/**
 * Get visible services (for frontend)
 */
export async function getVisibleServices(): Promise<Service[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching visible services:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single service by ID
 */
export async function getServiceById(id: string): Promise<Service | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching service:', error);
    return null;
  }

  return data;
}

// =============================================================================
// Services Write Operations
// =============================================================================

/**
 * Create a new service
 */
export async function createService(
  service: ServiceInput,
  userId?: string
): Promise<Service | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .insert(service)
    .select()
    .single();

  if (error) {
    console.error('Error creating service:', error);
    return null;
  }

  // Record history
  if (data) {
    await recordHistory('service', data.id, 'create', null, JSON.parse(JSON.stringify(data)), userId);
  }

  return data;
}

/**
 * Update a service
 */
export async function updateService(
  id: string,
  service: Partial<ServiceInput>,
  userId?: string
): Promise<Service | null> {
  const supabase = await createClient();

  const current = await getServiceById(id);

  const { data, error } = await supabase
    .from('services')
    .update({
      ...service,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating service:', error);
    return null;
  }

  // Record history
  if (current && data) {
    await recordHistory('service', id, 'update', JSON.parse(JSON.stringify(current)), JSON.parse(JSON.stringify(data)), userId);
  }

  return data;
}

/**
 * Delete a service
 */
export async function deleteService(id: string, userId?: string): Promise<boolean> {
  const supabase = await createClient();

  const current = await getServiceById(id);

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting service:', error);
    return false;
  }

  // Record history
  if (current) {
    await recordHistory('service', id, 'delete', JSON.parse(JSON.stringify(current)), { deleted: true }, userId);
  }

  return true;
}
