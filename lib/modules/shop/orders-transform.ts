/**
 * Shop Orders Transform Helpers (Pure Module)
 *
 * Transform functions for converting between order database rows
 * and typed models. These are pure functions with no I/O dependencies.
 *
 * @module lib/modules/shop/orders-transform
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import type {
  OrderRow,
  OrderItemRow,
  OrderSummary,
  OrderDetail,
} from '@/lib/types/shop';

/** List params for order queries */
export interface OrderListParams {
  status?: string;
  gateway?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Transform DB order row to OrderSummary
 * Maps snake_case DB columns to camelCase response type
 */
export function transformOrderToSummary(order: OrderRow): OrderSummary {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    gateway: order.gateway,
    totalCents: order.total_cents,
    currency: order.currency,
    recipientName: order.recipient_name,
    createdAt: order.created_at,
    paidAt: order.paid_at,
  };
}

/**
 * Transform DB order row + items to OrderDetail
 * Maps snake_case DB columns to camelCase response type
 * Note: OrderDetail.items expects OrderItemRow[] (snake_case DB rows)
 */
export function transformOrderToDetail(
  order: OrderRow,
  items: OrderItemRow[]
): OrderDetail {
  return {
    ...transformOrderToSummary(order),
    userId: order.user_id,
    gatewayTransactionId: order.gateway_transaction_id,
    gatewayMetadata: order.gateway_metadata,
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    couponCode: order.coupon_code,
    recipientPhone: order.recipient_phone,
    recipientAddress: order.recipient_address,
    recipientNote: order.recipient_note,
    invoiceData: order.invoice_data,
    shippingCarrier: order.shipping_carrier,
    shippingTrackingNumber: order.shipping_tracking_number,
    shippedAt: order.shipped_at,
    updatedAt: order.updated_at,
    completedAt: order.completed_at,
    cancelledAt: order.cancelled_at,
    items, // OrderDetail expects OrderItemRow[] directly
  };
}
