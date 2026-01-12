/**
 * Order Status Module (Pure)
 *
 * 遵循 refactor.md：
 * - Pure module：可單測、不可 IO、不可 import Next/React/Supabase
 *
 * 功能：
 * - 統一訂單狀態 enum（payment + fulfillment）
 * - Stripe status mapping（Checkout Session / PaymentIntent）
 * - LinePay/ECPay stub mapping（V1 先預留入口）
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { PaymentGateway, UnifiedOrderStatus } from '@/lib/types/shop';

// =============================================================================
// Stripe Status Types（from Stripe API）
// =============================================================================

/** Stripe Checkout Session status */
export type StripeCheckoutSessionStatus =
  | 'open'
  | 'complete'
  | 'expired';

/** Stripe PaymentIntent status */
export type StripePaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

/** Stripe combined payment status（用於 mapping） */
export interface StripePaymentStatus {
  checkoutSessionStatus?: StripeCheckoutSessionStatus;
  paymentIntentStatus?: StripePaymentIntentStatus;
}

// =============================================================================
// LinePay / ECPay Status Types（V1 Stub）
// =============================================================================

/** LinePay transaction status（V1 Stub） */
export type LinePayTransactionStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'VOIDED'
  | 'REFUNDED';

/** ECPay transaction status（V1 Stub） */
export type ECPayTransactionStatus =
  | '0' // 待付款
  | '1' // 已付款
  | '2' // 付款失敗
  | '10100058'; // 已退款

// =============================================================================
// Stripe Status Mapping
// =============================================================================

/**
 * 從 Stripe Checkout Session status 映射到統一狀態
 */
export function mapStripeCheckoutSessionStatus(
  status: StripeCheckoutSessionStatus
): UnifiedOrderStatus {
  switch (status) {
    case 'open':
      return 'pending_payment';
    case 'complete':
      return 'paid';
    case 'expired':
      return 'cancelled';
    default:
      // Exhaustive check
      const _exhaustive: never = status;
      return 'pending_payment';
  }
}

/**
 * 從 Stripe PaymentIntent status 映射到統一狀態
 */
export function mapStripePaymentIntentStatus(
  status: StripePaymentIntentStatus
): UnifiedOrderStatus {
  switch (status) {
    case 'succeeded':
      return 'paid';
    case 'canceled':
      return 'cancelled';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
    case 'processing':
    case 'requires_capture':
      return 'pending_payment';
    default:
      const _exhaustive: never = status;
      return 'pending_payment';
  }
}

/**
 * 從 Stripe 狀態映射到統一狀態（優先使用 PaymentIntent）
 */
export function mapStripeStatus(
  status: StripePaymentStatus
): UnifiedOrderStatus {
  // 優先使用 PaymentIntent status（更精確）
  if (status.paymentIntentStatus) {
    return mapStripePaymentIntentStatus(status.paymentIntentStatus);
  }
  // Fallback to Checkout Session status
  if (status.checkoutSessionStatus) {
    return mapStripeCheckoutSessionStatus(status.checkoutSessionStatus);
  }
  return 'pending_payment';
}

// =============================================================================
// LinePay Status Mapping（V1 Stub）
// =============================================================================

/**
 * 從 LinePay status 映射到統一狀態（V1 Stub）
 */
export function mapLinePayStatus(
  status: LinePayTransactionStatus
): UnifiedOrderStatus {
  switch (status) {
    case 'CONFIRMED':
      return 'paid';
    case 'PENDING':
    case 'AUTHORIZED':
      return 'pending_payment';
    case 'EXPIRED':
    case 'VOIDED':
      return 'cancelled';
    case 'REFUNDED':
      return 'refunding';
    default:
      const _exhaustive: never = status;
      return 'pending_payment';
  }
}

// =============================================================================
// ECPay Status Mapping（V1 Stub）
// =============================================================================

/**
 * 從 ECPay status 映射到統一狀態（V1 Stub）
 */
export function mapECPayStatus(
  status: ECPayTransactionStatus
): UnifiedOrderStatus {
  switch (status) {
    case '1':
      return 'paid';
    case '0':
      return 'pending_payment';
    case '2':
      return 'cancelled';
    case '10100058':
      return 'refunding';
    default:
      const _exhaustive: never = status;
      return 'pending_payment';
  }
}

// =============================================================================
// Unified Gateway Status Mapping
// =============================================================================

/** Gateway 原始狀態（聯合型別） */
export type GatewayRawStatus =
  | { gateway: 'stripe'; status: StripePaymentStatus }
  | { gateway: 'linepay'; status: LinePayTransactionStatus }
  | { gateway: 'ecpay'; status: ECPayTransactionStatus };

/**
 * 統一的 gateway status mapping entry point
 */
export function mapGatewayStatusToUnified(
  raw: GatewayRawStatus
): UnifiedOrderStatus {
  switch (raw.gateway) {
    case 'stripe':
      return mapStripeStatus(raw.status);
    case 'linepay':
      return mapLinePayStatus(raw.status);
    case 'ecpay':
      return mapECPayStatus(raw.status);
    default:
      const _exhaustive: never = raw;
      return 'pending_payment';
  }
}

// =============================================================================
// Status Display Helpers
// =============================================================================

/** 統一狀態的顯示文字（雙語） */
export interface StatusLabel {
  en: string;
  zh: string;
}

const STATUS_LABELS: Record<UnifiedOrderStatus, StatusLabel> = {
  pending_payment: { en: 'Pending Payment', zh: '待付款' },
  paid: { en: 'Paid', zh: '已付款' },
  pending_shipment: { en: 'Pending Shipment', zh: '待出貨' },
  shipped: { en: 'Shipped', zh: '已出貨' },
  completed: { en: 'Completed', zh: '已完成' },
  cancelled: { en: 'Cancelled', zh: '已取消' },
  refunding: { en: 'Refunding', zh: '退款中' },
};

/**
 * 取得統一狀態的顯示文字
 */
export function getStatusLabel(
  status: UnifiedOrderStatus,
  locale: 'en' | 'zh' = 'zh'
): string {
  return STATUS_LABELS[status]?.[locale] ?? status;
}

/**
 * 判斷訂單是否可取消
 */
export function isCancellable(status: UnifiedOrderStatus): boolean {
  return status === 'pending_payment';
}

/**
 * 判斷訂單是否可退款
 */
export function isRefundable(status: UnifiedOrderStatus): boolean {
  return status === 'paid' || status === 'pending_shipment';
}

/**
 * 判斷訂單是否已結案（不可再變更）
 */
export function isFinal(status: UnifiedOrderStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}
