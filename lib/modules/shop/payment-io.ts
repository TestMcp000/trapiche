/**
 * Payment IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 *
 * @module lib/modules/shop/payment-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export config types and functions
export type {
  PaymentProvider,
  StripeConfig,
  ECPayConfig,
  LinePayConfig,
} from '@/lib/modules/shop/payment-config-io';
export {
  readVaultSecret,
  getPaymentProviderConfig,
} from '@/lib/modules/shop/payment-config-io';

// Re-export webhook operations
export type { ProcessPaymentSuccessParams } from '@/lib/modules/shop/payment-webhook-io';
export {
  recordWebhookEvent,
  logPaymentAudit,
  getOrderIdByOrderNumber,
  processPaymentSuccess,
} from '@/lib/modules/shop/payment-webhook-io';
