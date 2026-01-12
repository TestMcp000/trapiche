/**
 * Orders JSON Formatter (Pure, Export-only)
 *
 * Formats orders to JSON export envelope.
 * Following PRD §2.7 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.7
 */

import type { OrderRow, OrderItemRow } from '@/lib/types/shop';
import type {
  OrdersExport,
  OrderExportData,
  OrderItemExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

/** Order with items for export */
export interface OrderWithItems extends OrderRow {
  items: OrderItemRow[];
}

/** Options for order export */
export interface OrderExportOptions {
  includeSensitive?: boolean;
}

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform an OrderItemRow to export data format.
 * Note: Uses product_name_en as fallback since we need the slug from somewhere.
 *
 * @param item - The order item to transform
 * @param productSlugMap - Map of product ID to slug
 * @returns Export data object
 */
export function transformOrderItemToExportData(
  item: OrderItemRow,
  productSlugMap: Map<string, string>
): OrderItemExportData {
  return {
    product_slug: item.product_id ? (productSlugMap.get(item.product_id) ?? 'unknown') : 'unknown',
    variant_key: item.variant_key,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
  };
}

/**
 * Transform an Order with items to export data format.
 *
 * @param order - The order to transform
 * @param productSlugMap - Map of product ID to slug
 * @param options - Export options
 * @returns Export data object
 */
export function transformOrderToExportData(
  order: OrderWithItems,
  productSlugMap: Map<string, string>,
  options: OrderExportOptions = {}
): OrderExportData {
  const data: OrderExportData = {
    order_number: order.order_number,
    status: order.status,
    gateway: order.gateway,
    subtotal_cents: order.subtotal_cents,
    discount_cents: order.discount_cents,
    total_cents: order.total_cents,
    currency: order.currency,
    coupon_code: order.coupon_code,
    created_at: order.created_at,
    paid_at: order.paid_at,
    items: order.items.map((item) => transformOrderItemToExportData(item, productSlugMap)),
  };

  // Include sensitive fields if requested
  if (options.includeSensitive) {
    data.recipient_name = order.recipient_name;
    data.recipient_phone = order.recipient_phone;
    data.recipient_address = order.recipient_address;
    data.invoice_data = order.invoice_data ?? undefined;
    data.gateway_transaction_id = order.gateway_transaction_id ?? undefined;
  }

  return data;
}

/**
 * Format an array of orders to JSON export envelope.
 *
 * @param orders - Array of orders with items to export
 * @param productSlugMap - Map of product ID to slug
 * @param options - Export options
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatOrdersToJson(
  orders: OrderWithItems[],
  productSlugMap: Map<string, string>,
  options: OrderExportOptions = {},
  exportedAt?: string
): OrdersExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'orders',
    includeSensitive: options.includeSensitive ?? false,
    data: orders.map((order) => transformOrderToExportData(order, productSlugMap, options)),
  };
}

/**
 * Serialize orders export to JSON string.
 *
 * @param orders - Array of orders with items to export
 * @param productSlugMap - Map of product ID to slug
 * @param options - Export options
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatOrdersToJsonString(
  orders: OrderWithItems[],
  productSlugMap: Map<string, string>,
  options: OrderExportOptions = {},
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatOrdersToJson(orders, productSlugMap, options, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
