/**
 * Auth Admin IO Layer (Server-only)
 *
 * Provides server-side data access for admin access management.
 * Uses authenticated Supabase client with cookie context for RLS.
 * 
 * @module lib/modules/auth/admin-io
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { AdminRoleType } from '@/lib/modules/auth';

// =============================================================================
// Site Admins Read Operations
// =============================================================================

export interface SiteAdminRow {
  id: string;
  email: string;
  role: AdminRoleType;
  created_at: string;
}

/**
 * Get all site admins
 */
export async function getSiteAdminsAdmin(): Promise<SiteAdminRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('site_admins')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching site admins:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as AdminRoleType,
    created_at: row.created_at,
  }));
}

/**
 * Check if an email is already an admin
 */
export async function checkAdminExistsAdmin(email: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('site_admins')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  return !!data;
}

/**
 * Get admin by ID with role
 */
export async function getSiteAdminByIdAdmin(
  adminId: string
): Promise<{ email: string; role: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('site_admins')
    .select('email, role')
    .eq('id', adminId)
    .single();

  if (error || !data) {
    return null;
  }

  return { email: data.email, role: data.role };
}

/**
 * Count owners (for last-owner check)
 */
export async function countOwnersAdmin(): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase.from('site_admins').select('id').eq('role', 'owner');

  return data?.length ?? 0;
}

// =============================================================================
// Site Admins Write Operations
// =============================================================================

/**
 * Add a new admin
 */
export async function addSiteAdminAdmin(
  email: string,
  role: 'owner' | 'editor'
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('site_admins').insert({
    email: email.toLowerCase(),
    role,
  });

  if (error) {
    console.error('Error adding site admin:', error);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Update admin role
 */
export async function updateAdminRoleAdmin(
  adminId: string,
  newRole: 'owner' | 'editor'
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('site_admins')
    .update({ role: newRole })
    .eq('id', adminId);

  if (error) {
    console.error('Error updating admin role:', error);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Remove admin
 */
export async function removeSiteAdminAdmin(
  adminId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('site_admins').delete().eq('id', adminId);

  if (error) {
    console.error('Error removing site admin:', error);
    return { error: error.message };
  }

  return { success: true };
}
