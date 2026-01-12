'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import {
  getSiteAdminsAdmin,
  checkAdminExistsAdmin,
  getSiteAdminByIdAdmin,
  countOwnersAdmin,
  addSiteAdminAdmin,
  updateAdminRoleAdmin,
  removeSiteAdminAdmin,
  type SiteAdminRow,
} from '@/lib/modules/auth/admin-io';
import { writeAuditLogAdmin } from '@/lib/modules/shop/admin-io';

export type { SiteAdminRow as ShopAdminRow };

export interface ActionResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// Get All Shop Admins
// =============================================================================

export async function getShopAdmins(): Promise<SiteAdminRow[]> {
  const supabase = await createClient();
  
  const isOwnerUser = await isOwner(supabase);
  if (!isOwnerUser) {
    return [];
  }

  return getSiteAdminsAdmin();
}

// =============================================================================
// Add Shop Admin
// =============================================================================

export async function addShopAdmin(
  email: string,
  role: 'owner' | 'editor'
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isOwnerUser = await isOwner(supabase);
    if (!isOwnerUser) {
      return { success: false, error: 'Only owners can manage admins' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Check if email already exists
    const exists = await checkAdminExistsAdmin(email);
    if (exists) {
      return { success: false, error: 'This email is already an admin' };
    }

    // Add admin via lib
    const result = await addSiteAdminAdmin(email, role);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Write audit log
    const { data: { user } } = await supabase.auth.getUser();
    await writeAuditLogAdmin(
      'admin_added',
      'site_admin',
      email.toLowerCase(),
      user?.email || 'unknown',
      { role }
    );

    revalidateTag('admins', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in addShopAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Update Admin Role
// =============================================================================

export async function updateAdminRole(
  adminId: string,
  newRole: 'owner' | 'editor'
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isOwnerUser = await isOwner(supabase);
    if (!isOwnerUser) {
      return { success: false, error: 'Only owners can manage admins' };
    }

    // Get current user's email to prevent self-demotion
    const { data: { user } } = await supabase.auth.getUser();
    const targetAdmin = await getSiteAdminByIdAdmin(adminId);

    if (!targetAdmin) {
      return { success: false, error: 'Admin not found' };
    }

    // Prevent self-demotion for safety
    if (targetAdmin.email === user?.email?.toLowerCase() && newRole !== 'owner') {
      return { success: false, error: 'Cannot demote yourself' };
    }

    // Update role via lib
    const result = await updateAdminRoleAdmin(adminId, newRole);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Write audit log
    await writeAuditLogAdmin(
      'admin_role_changed',
      'site_admin',
      targetAdmin.email,
      user?.email || 'unknown',
      { oldRole: targetAdmin.role, newRole }
    );

    revalidateTag('admins', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateAdminRole:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Remove Shop Admin
// =============================================================================

export async function removeShopAdmin(adminId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isOwnerUser = await isOwner(supabase);
    if (!isOwnerUser) {
      return { success: false, error: 'Only owners can manage admins' };
    }

    // Get current user's email to prevent self-removal
    const { data: { user } } = await supabase.auth.getUser();
    const targetAdmin = await getSiteAdminByIdAdmin(adminId);

    if (!targetAdmin) {
      return { success: false, error: 'Admin not found' };
    }

    // Prevent self-removal
    if (targetAdmin.email === user?.email?.toLowerCase()) {
      return { success: false, error: 'Cannot remove yourself' };
    }

    // Check if this is the last owner
    if (targetAdmin.role === 'owner') {
      const ownerCount = await countOwnersAdmin();
      if (ownerCount <= 1) {
        return { success: false, error: 'Cannot remove the last owner' };
      }
    }

    // Remove admin via lib
    const result = await removeSiteAdminAdmin(adminId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Write audit log
    await writeAuditLogAdmin(
      'admin_removed',
      'site_admin',
      targetAdmin.email,
      user?.email || 'unknown',
      { removedRole: targetAdmin.role }
    );

    revalidateTag('admins', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in removeShopAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
