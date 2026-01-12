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
import { updateUserAdminProfile } from '@/lib/modules/user/profiles-admin-io';
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/lib/modules/user/appointments-admin-io';
import type {
  UpdateUserAdminProfileInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UserActionResult,
  UserActionResultWithId,
} from '@/lib/types/user';

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
): Promise<UserActionResult> {
  try {
    const result = await updateUserAdminProfile(userId, input);

    if (!result.success) {
      return result;
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users`);
    revalidatePath(`/${locale}/admin/users/${userId}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update user profile' };
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
): Promise<UserActionResultWithId> {
  try {
    const result = await createAppointment(userId, input);

    if (!result.success) {
      return result;
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users/${userId}`);

    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: 'Failed to create appointment' };
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
): Promise<UserActionResult> {
  try {
    const result = await updateAppointment(appointmentId, input);

    if (!result.success) {
      return result;
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users/${userId}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error: 'Failed to update appointment' };
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
): Promise<UserActionResult> {
  try {
    const result = await deleteAppointment(appointmentId);

    if (!result.success) {
      return result;
    }

    // Revalidate cache
    revalidatePath(`/${locale}/admin/users/${userId}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return { success: false, error: 'Failed to delete appointment' };
  }
}
