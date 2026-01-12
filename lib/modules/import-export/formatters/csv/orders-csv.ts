/**
 * Orders CSV Formatter (Pure, Export-only)
 *
 * Formats orders to CSV with one row per order item.
 * Follows PRD §3.6 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §3.6 (CSV Orders format)
 * @see uiux_refactor.md §4 item 2
 */

import type { OrderWithItems } from '../orders-json';
import {
  escapeCsvCell,
  nullToEmpty,
  toIsoUtc,
  toCsv,
} from './csv-utils';

// =============================================================================
// Types
// =============================================================================

/** CSV row data for an order item */
export interface OrderItemCsvRow {
  order_number: string;
  status: string;
  product_slug: string;
  variant_key: string;
  quantity: string;
  unit_price_cents: string;
  total_cents: string;
  created_at: string;
}

/** Options for order CSV export */
export interface OrderCsvOptions {
  includeSensitive?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** CSV column headers (basic) */
const ORDER_CSV_HEADERS = [
  'order_number',
  'status',
  'product_slug',
  'variant_key',
  'quantity',
  'unit_price_cents',
  'total_cents',
  'created_at',
] as const;

/** Additional sensitive columns */
const ORDER_SENSITIVE_HEADERS = [
  'recipient_name',
  'recipient_phone',
  'recipient_address',
] as const;

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform an order to flattened CSV rows (one per order item).
 *
 * @param order - Order with items
 * @param productSlugMap - Map of product ID to slug
 * @param options - Export options
 * @returns Array of CSV row arrays
 */
export function transformOrderToCsvRows(
  order: OrderWithItems,
  productSlugMap: Map<string, string>,
  options: OrderCsvOptions = {}
): string[][] {
  // If order has no items, create a single row with empty item fields
  if (!order.items || order.items.length === 0) {
    const baseRow = [
      escapeCsvCell(order.order_number),
      escapeCsvCell(order.status),
      '',
      '',
      '',
      '',
      escapeCsvCell(order.total_cents),
      escapeCsvCell(toIsoUtc(order.created_at)),
    ];

    if (options.includeSensitive) {
      baseRow.push(
        escapeCsvCell(nullToEmpty(order.recipient_name)),
        escapeCsvCell(nullToEmpty(order.recipient_phone)),
        escapeCsvCell(nullToEmpty(order.recipient_address))
      );
    }

    return [baseRow];
  }

  return order.items.map((item) => {
    const productSlug = item.product_id
      ? (productSlugMap.get(item.product_id) ?? 'unknown')
      : 'unknown';

    const itemTotal = item.unit_price_cents * item.quantity;

    const row = [
      escapeCsvCell(order.order_number),
      escapeCsvCell(order.status),
      escapeCsvCell(productSlug),
      escapeCsvCell(nullToEmpty(item.variant_key)),
      escapeCsvCell(item.quantity),
      escapeCsvCell(item.unit_price_cents),
      escapeCsvCell(itemTotal),
      escapeCsvCell(toIsoUtc(order.created_at)),
    ];

    if (options.includeSensitive) {
      row.push(
        escapeCsvCell(nullToEmpty(order.recipient_name)),
        escapeCsvCell(nullToEmpty(order.recipient_phone)),
        escapeCsvCell(nullToEmpty(order.recipient_address))
      );
    }

    return row;
  });
}

/**
 * Format orders to CSV string.
 *
 * @param orders - Array of orders with items
 * @param productSlugMap - Map of product ID to slug
 * @param options - Export options
 * @returns CSV string
 */
export function formatOrdersToCsv(
  orders: OrderWithItems[],
  productSlugMap: Map<string, string>,
  options: OrderCsvOptions = {}
): string {
  // Build headers based on options - use mutable string[] to allow push
  const headers: string[] = [...ORDER_CSV_HEADERS];
  if (options.includeSensitive) {
    headers.push(...ORDER_SENSITIVE_HEADERS);
  }

  // Flatten all orders to rows
  const allRows = orders.flatMap((order) =>
    transformOrderToCsvRows(order, productSlugMap, options)
  );

  return toCsv(headers, allRows);
}
