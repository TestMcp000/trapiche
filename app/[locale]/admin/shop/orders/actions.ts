'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { isCancellable, isRefundable, isFinal } from '@/lib/modules/shop/order-status';
import {
  getOrderStatusAdmin,
  updateShippingAdmin,
  cancelOrderAdmin,
  markRefundAdmin,
  markOrderCompleteAdmin,
  writeAuditLogAdmin,
} from '@/lib/modules/shop/admin-io';
import type { UnifiedOrderStatus } from '@/lib/types/shop';

export interface ActionResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// Update Shipping
// =============================================================================

export async function updateShipping(
  orderId: string,
  carrier: string,
  trackingNumber: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get current order status
    const order = await getOrderStatusAdmin(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Check if order can be updated (not cancelled/completed)
    if (isFinal(order.status as UnifiedOrderStatus)) {
      return { success: false, error: 'Cannot update shipping for a finalized order' };
    }

    // Update shipping info via lib
    const result = await updateShippingAdmin(
      orderId,
      carrier || null,
      trackingNumber || null,
      order.status
    );

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Write audit log
    const { data: { user } } = await supabase.auth.getUser();
    await writeAuditLogAdmin(
      'order_shipping_updated',
      'order',
      orderId,
      user?.email || 'unknown',
      { carrier, trackingNumber }
    );

    revalidateTag('shop', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateShipping:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Cancel Order
// =============================================================================

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get current order status
    const order = await getOrderStatusAdmin(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Check if order can be cancelled
    if (!isCancellable(order.status as UnifiedOrderStatus)) {
      return { success: false, error: 'Order cannot be cancelled in current status' };
    }

    // Cancel order via lib
    const result = await cancelOrderAdmin(orderId);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Write audit log
    const { data: { user } } = await supabase.auth.getUser();
    await writeAuditLogAdmin(
      'order_cancelled',
      'order',
      orderId,
      user?.email || 'unknown',
      { previousStatus: order.status }
    );

    revalidateTag('shop', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in cancelOrder:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Mark Refund (V1: Only record status, no actual refund)
// =============================================================================

export async function markRefund(
  orderId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get current order status
    const order = await getOrderStatusAdmin(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Check if order can be refunded
    if (!isRefundable(order.status as UnifiedOrderStatus)) {
      return { success: false, error: 'Order cannot be refunded in current status' };
    }

    // Mark refund via lib
    const result = await markRefundAdmin(orderId);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Write audit log
    const { data: { user } } = await supabase.auth.getUser();
    await writeAuditLogAdmin(
      'order_refund_requested',
      'order',
      orderId,
      user?.email || 'unknown',
      { reason, previousStatus: order.status, note: 'V1: Manual refund required' }
    );

    revalidateTag('shop', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in markRefund:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Mark Order Complete
// =============================================================================

export async function markOrderComplete(orderId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get current order status
    const order = await getOrderStatusAdmin(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Only shipped orders can be marked complete
    if (order.status !== 'shipped') {
      return { success: false, error: 'Only shipped orders can be marked complete' };
    }

    // Mark complete via lib
    const result = await markOrderCompleteAdmin(orderId);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Write audit log
    const { data: { user } } = await supabase.auth.getUser();
    await writeAuditLogAdmin(
      'order_completed',
      'order',
      orderId,
      user?.email || 'unknown'
    );

    revalidateTag('shop', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in markOrderComplete:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
