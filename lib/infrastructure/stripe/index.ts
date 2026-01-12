/**
 * lib/infrastructure/stripe/index.ts
 *
 * Shim file for gradual migration (Phase 1).
 * Re-exports Stripe/payment modules from original location.
 *
 * @see ARCHITECTURE.md §3.4.1
 */

export * from '@/lib/modules/shop/payment-pure';
// Note: payment-config has overlapping exports with payment-pure
// Import specific items from '@/lib/modules/shop/payment-config' directly if needed
export * from '@/lib/modules/shop/payment-io';
