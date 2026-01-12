/**
 * Shop Orders Admin IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 *
 * @module lib/modules/shop/orders-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export types and transforms from pure module
export type { OrderListParams } from '@/lib/modules/shop/orders-transform';
export {
  transformOrderToSummary,
  transformOrderToDetail,
} from '@/lib/modules/shop/orders-transform';

// Re-export read operations
export {
  getAllOrders,
  getOrderById,
  getOrderStatusAdmin,
} from '@/lib/modules/shop/orders-read-admin-io';

// Re-export write operations
export {
  updateShippingAdmin,
  cancelOrderAdmin,
  markRefundAdmin,
  markOrderCompleteAdmin,
  writeAuditLogAdmin,
} from '@/lib/modules/shop/orders-write-admin-io';
