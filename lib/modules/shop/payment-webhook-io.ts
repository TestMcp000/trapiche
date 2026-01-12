/**
 * Payment Webhook IO
 *
 * IO operations for payment webhook processing.
 * Uses service role client for database operations.
 *
 * @module lib/modules/shop/payment-webhook-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { PaymentProvider } from '@/lib/modules/shop/payment-config-io';

export interface ProcessPaymentSuccessParams {
  orderId: string;
  gateway: PaymentProvider;
  gatewayTransactionId: string;
  gatewayMetadata: Record<string, unknown>;
}

/**
 * Record a webhook event for idempotency checking.
 * Uses existing webhook_events table.
 *
 * @returns true if this is a duplicate event (already processed)
 * @returns false if this is a new event
 */
export async function recordWebhookEvent(
  gateway: PaymentProvider,
  eventId: string,
  eventType: string,
  payload: unknown
): Promise<boolean> {
  const supabase = createAdminClient();

  // Try to insert; if it already exists, it's a duplicate
  const { error } = await supabase
    .from('webhook_events')
    .insert({
      gateway,
      event_id: eventId,
      event_type: eventType,
      payload,
    });

  if (error) {
    // Check if duplicate key error
    if (error.code === '23505') {
      // Postgres unique violation
      return true; // Duplicate
    }
    console.error('Error recording webhook event:', error);
  }

  return false; // New event
}

/**
 * Log a payment event to the audit log.
 * Stores all webhook payloads for debugging and compliance.
 */
export async function logPaymentAudit(
  orderId: string | null,
  provider: PaymentProvider,
  eventType: string,
  providerEventId: string,
  payload: unknown
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('payment_audit_log').insert({
    order_id: orderId,
    provider,
    event_type: eventType,
    provider_event_id: providerEventId,
    payload,
  });
}

/**
 * Look up order UUID by order_number.
 * ECPay uses MerchantTradeNo which maps to orders.order_number.
 */
export async function getOrderIdByOrderNumber(orderNumber: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (error) {
    console.error('Error looking up order by number:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Process a successful payment using the atomic RPC function.
 * Updates order status, deducts inventory, clears reservations.
 *
 * @throws Error with message 'order_not_found' if order doesn't exist
 * @throws Error with message 'gateway_mismatch' if gateway doesn't match
 */
export async function processPaymentSuccess(
  params: ProcessPaymentSuccessParams
): Promise<'paid'> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .rpc('process_payment_success', {
      p_order_id: params.orderId,
      p_gateway: params.gateway,
      p_gateway_transaction_id: params.gatewayTransactionId,
      p_gateway_metadata: params.gatewayMetadata,
    });

  if (error) {
    console.error('Error processing payment success:', error);
    throw new Error(error.message);
  }

  return data as 'paid';
}
