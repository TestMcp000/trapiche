'use server';

/**
 * Users Admin Server Actions
 *
 * Server-side CRUD operations for user admin profiles and appointments.
 * Uses server actions pattern for mutations with revalidation.
 *
 * 注意：Owner-only actions 必須做二次 gate（IO 層已有 gate，但 action 層也需確認）
 *
 * @module app/[locale]/admin/users/actions
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireOwner } from '@/lib/modules/auth/admin-guard';
import { updateUserAdminProfile } from '@/lib/modules/user/profiles-admin-io';
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/lib/modules/user/appointments-admin-io';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';
import type { UpdateUserAdminProfileInput, CreateAppointmentInput, UpdateAppointmentInput } from '@/lib/types/user';

// =============================================================================
// Profile Actions
// =============================================================================

/**
 * Update user admin profile
 * Owner-only: updates description and tags
 */
export async function updateUserProfileAction(
  userId: string,
  input: UpdateUserAdminProfileInput,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!userId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await updateUserAdminProfile(userId, input);

    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users`);
    revalidatePath(`/${locale}/admin/users/${userId}`);

    return actionSuccess();
  } catch (error) {
    console.error('Error updating user profile:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

// =============================================================================
// Appointment Actions
// =============================================================================

/**
 * Create a new appointment
 * Owner-only
 */
export async function createAppointmentAction(
  userId: string,
  input: CreateAppointmentInput,
  locale: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!userId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await createAppointment(userId, input);

    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users/${userId}`);

    if (!result.id) {
      return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
    }

    return actionSuccess({ id: result.id });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Update an existing appointment
 * Owner-only
 */
export async function updateAppointmentAction(
  appointmentId: string,
  input: UpdateAppointmentInput,
  userId: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!appointmentId || !userId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await updateAppointment(appointmentId, input);

    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users/${userId}`);

    return actionSuccess();
  } catch (error) {
    console.error('Error updating appointment:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Delete an appointment
 * Owner-only
 */
export async function deleteAppointmentAction(
  appointmentId: string,
  userId: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireOwner(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!appointmentId || !userId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await deleteAppointment(appointmentId);

    if (!result.success) {
      return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users/${userId}`);

    return actionSuccess();
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
