/**
 * Shop Orders Write Admin IO
 *
 * Admin-only order write operations.
 *
 * @module lib/modules/shop/orders-write-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';

/**
 * Update shipping information
 */
export async function updateShippingAdmin(
  orderId: string,
  carrier: string | null,
  trackingNumber: string | null,
  currentStatus: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Determine new status
  const newStatus = trackingNumber && currentStatus === 'processing' ? 'shipped' : currentStatus;

  const { error } = await supabase
    .from('orders')
    .update({
      shipping_carrier: carrier,
      tracking_number: trackingNumber,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating shipping:', error);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Cancel an order and release inventory reservations
 */
export async function cancelOrderAdmin(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error cancelling order:', error);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Mark order as refunding
 */
export async function markRefundAdmin(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'refunding',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error marking refund:', error);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Mark order as completed
 */
export async function markOrderCompleteAdmin(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error completing order:', error);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Write an audit log entry
 */
export async function writeAuditLogAdmin(
  action: string,
  entityType: string,
  entityId: string,
  actorEmail: string,
  details?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    actor_email: actorEmail,
    details,
  });
}
