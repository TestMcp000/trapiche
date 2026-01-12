/**
 * Admin authentication utilities
 * Controls access to the admin panel
 * 
 * Primary source of truth: JWT app_metadata.role (synced from DB `site_admins` table via trigger)
 * Fallback: ADMIN_ALLOWED_EMAILS environment variable
 * 
 * @module lib/modules/auth
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the list of allowed admin emails from environment variables
 * Used as fallback when JWT claims are not available
 */
export function getAllowedAdminEmails(): string[] {
  const emails = process.env.ADMIN_ALLOWED_EMAILS || '';
  return emails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Check if an email is authorized via environment variable (sync, fallback)
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  
  const allowedEmails = getAllowedAdminEmails();
  
  // If no emails are configured, deny all access for security
  if (allowedEmails.length === 0) {
    return false;
  }
  
  return allowedEmails.includes(email.toLowerCase());
}

/**
 * Check if the current user is an admin via JWT `app_metadata.role`
 * The role is synced from site_admins table via database trigger
 * 
 * @param supabase - Supabase client with user session
 * @returns true if user has 'owner' or 'editor' role, false otherwise
 */
export async function isSiteAdmin(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Use JWT claims for performance (no DB query needed)
    const role = user.app_metadata?.role;
    if (role === 'owner' || role === 'editor') {
      return true;
    }

    // Fallback to env-based check for backward compatibility
    return isAdminEmail(user.email);
  } catch (error) {
    console.error('Error in isSiteAdmin:', error);
    return false;
  }
}

/**
 * User role type for RBAC
 * - 'owner': Full access including payment config and revenue
 * - 'admin': Can manage products, orders, coupons (mapped from 'editor' role)
 * - 'authenticated': Logged in user without admin privileges
 * - 'visitor': Not logged in
 */
export type UserRole = 'visitor' | 'authenticated' | 'admin' | 'owner';

/**
 * Get current user info and role
 * Uses JWT app_metadata.role for role determination
 */
export async function getCurrentUserRole(supabase: SupabaseClient): Promise<{
  user: { id: string; email: string } | null;
  isAdmin: boolean;
  role: UserRole;
}> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user?.email) {
      return { user: null, isAdmin: false, role: 'visitor' };
    }

    // Use JWT claims for role
    const jwtRole = user.app_metadata?.role;
    let role: UserRole = 'authenticated';
    let isAdmin = false;
    
    if (jwtRole === 'owner') {
      role = 'owner';
      isAdmin = true;
    } else if (jwtRole === 'editor') {
      role = 'admin';
      isAdmin = true;
    } else if (isAdminEmail(user.email)) {
      // Fallback to env-based check
      role = 'admin';
      isAdmin = true;
    }

    return {
      user: { id: user.id, email: user.email },
      isAdmin,
      role,
    };
  } catch (error) {
    console.error('Error in getCurrentUserRole:', error);
    return { user: null, isAdmin: false, role: 'visitor' };
  }
}

/** Admin role type for RBAC */
export type AdminRoleType = 'owner' | 'editor' | null;

/**
 * Get the role of the current admin user
 * Returns 'owner', 'editor', or null if not an admin
 * 
 * Uses JWT app_metadata.role (synced from site_admins via trigger)
 * This avoids DB queries for better performance
 * 
 * @param supabase - Supabase client with user session
 * @returns AdminRoleType
 */
export async function getAdminRole(supabase: SupabaseClient): Promise<AdminRoleType> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      return null;
    }

    // Use JWT claims for role (synced from site_admins via trigger)
    const jwtRole = user.app_metadata?.role;
    if (jwtRole === 'owner') {
      return 'owner';
    }
    if (jwtRole === 'editor') {
      return 'editor';
    }

    // Fallback: if in env list, treat as editor
    if (isAdminEmail(user.email)) {
      return 'editor';
    }

    return null;
  } catch (error) {
    console.error('Error in getAdminRole:', error);
    return null;
  }
}

/**
 * Check if current user is an owner (highest privilege)
 * Owner can manage payment configs and view financial data
 * 
 * Uses JWT app_metadata.role directly (no DB query)
 * 
 * @param supabase - Supabase client with user session
 * @returns true if user is owner, false otherwise
 */
export async function isOwner(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.app_metadata?.role === 'owner';
  } catch (error) {
    console.error('Error in isOwner:', error);
    return false;
  }
}
