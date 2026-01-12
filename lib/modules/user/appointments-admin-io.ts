/**
 * User Appointments Admin IO
 *
 * Owner-only calendar event operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/user/appointments-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '@/lib/types/user';

// =============================================================================
// Appointment Write Operations (Owner-only)
// =============================================================================

/**
 * Create a new appointment
 * Owner-only
 */
export async function createAppointment(
  userId: string,
  input: CreateAppointmentInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  // Owner guard
  const isOwnerRole = await isOwner(supabase);
  if (!isOwnerRole) {
    return { success: false, error: 'Unauthorized: Owner role required' };
  }

  // Validate: end_at must be after start_at
  if (new Date(input.endAt) <= new Date(input.startAt)) {
    return { success: false, error: 'End time must be after start time' };
  }

  // Get current user for updated_by
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('user_appointments')
    .insert({
      user_id: userId,
      start_at: input.startAt,
      end_at: input.endAt,
      note: input.note ?? null,
      updated_by: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Update an existing appointment
 * Owner-only
 */
export async function updateAppointment(
  appointmentId: string,
  input: UpdateAppointmentInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Owner guard
  const isOwnerRole = await isOwner(supabase);
  if (!isOwnerRole) {
    return { success: false, error: 'Unauthorized: Owner role required' };
  }

  // Get current user for updated_by
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  };

  if (input.startAt !== undefined) {
    updatePayload.start_at = input.startAt;
  }
  if (input.endAt !== undefined) {
    updatePayload.end_at = input.endAt;
  }
  if (input.note !== undefined) {
    updatePayload.note = input.note;
  }

  const { error } = await supabase
    .from('user_appointments')
    .update(updatePayload)
    .eq('id', appointmentId);

  if (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete an appointment
 * Owner-only
 */
export async function deleteAppointment(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Owner guard
  const isOwnerRole = await isOwner(supabase);
  if (!isOwnerRole) {
    return { success: false, error: 'Unauthorized: Owner role required' };
  }

  const { error } = await supabase
    .from('user_appointments')
    .delete()
    .eq('id', appointmentId);

  if (error) {
    console.error('Error deleting appointment:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
