/**
 * AI Analysis Data Shape Mappers (Pure Functions)
 *
 * Pure transformation functions for mapping DB rows to AI-safe shapes.
 * These functions contain no IO operations and are safe for testing.
 *
 * @module lib/modules/ai-analysis/analysis-data-mappers
 * @see uiux_refactor.md §6.2.2 - Data collection layer
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §5 - Data privacy
 */

import { simpleHash } from '@/lib/modules/ai-analysis/analysis-pure';
import type { CommentTargetType } from '@/lib/types/comments';
import type { UnifiedOrderStatus, PaymentGateway } from '@/lib/types/shop';

// =============================================================================
// Product Types and Mapper
// =============================================================================

/**
 * Product data shape for AI analysis.
 * Contains only fields safe and useful for analysis.
 */
export interface ProductAnalysisShape {
  id: string;
  slug: string;
  nameEn: string | null;
  nameZh: string | null;
  category: string | null;
  isVisible: boolean;
  /** Minimum price across variants (cents) */
  minPriceCents: number;
  /** Maximum price across variants (cents) */
  maxPriceCents: number;
  /** Total stock across variants */
  totalStock: number;
  createdAt: string;
}

export interface ProductWithVariants {
  id: string;
  slug: string;
  name_en: string | null;
  name_zh: string | null;
  category: string | null;
  is_visible: boolean;
  created_at: string;
  product_variants: Array<{
    price_cents: number;
    stock: number;
    is_enabled: boolean;
  }>;
}

/**
 * Map raw product row with variants to AI-safe shape.
 * Pure function for easy testing.
 *
 * @param product - Raw product with nested variants
 * @returns AI-safe product shape
 */
export function mapProductToAnalysisShape(
  product: ProductWithVariants
): ProductAnalysisShape {
  const enabledVariants = product.product_variants.filter((v) => v.is_enabled);

  const prices = enabledVariants.map((v) => v.price_cents);
  const minPriceCents = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPriceCents = prices.length > 0 ? Math.max(...prices) : 0;
  const totalStock = enabledVariants.reduce((sum, v) => sum + v.stock, 0);

  return {
    id: product.id,
    slug: product.slug,
    nameEn: product.name_en,
    nameZh: product.name_zh,
    category: product.category,
    isVisible: product.is_visible,
    minPriceCents,
    maxPriceCents,
    totalStock,
    createdAt: product.created_at,
  };
}

// =============================================================================
// Order Types and Mapper
// =============================================================================

/**
 * Order data shape for AI analysis.
 * Contains only fields safe and useful for analysis.
 * PII fields (customer email/name/address/phone) are excluded.
 */
export interface OrderAnalysisShape {
  id: string;
  orderId: string; // anonymized order identifier
  status: UnifiedOrderStatus;
  gateway: PaymentGateway;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  itemCount: number;
  hasCoupon: boolean;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
}

export interface OrderRowForAnalysis {
  id: string;
  order_number: string;
  status: UnifiedOrderStatus;
  gateway: PaymentGateway;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  coupon_code: string | null;
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  order_items: Array<{ id: string }>;
}

/**
 * Map raw order row to AI-safe shape.
 * Pure function for easy testing.
 *
 * @param order - Raw order row (PII already excluded from select)
 * @returns AI-safe order shape
 */
export function mapOrderToAnalysisShape(
  order: OrderRowForAnalysis
): OrderAnalysisShape {
  return {
    id: order.id,
    orderId: `order_${order.order_number.slice(-8)}`, // anonymized
    status: order.status,
    gateway: order.gateway,
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    totalCents: order.total_cents,
    currency: order.currency,
    itemCount: order.order_items?.length ?? 0,
    hasCoupon: order.coupon_code !== null,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    completedAt: order.completed_at,
  };
}

// =============================================================================
// Member Types and Mapper
// =============================================================================

/**
 * Member data shape for AI analysis.
 * Fully anonymized - never includes PII (email, phone, address, real name).
 * Uses hashed identifiers for privacy protection.
 */
export interface MemberAnalysisShape {
  /** Anonymized member identifier */
  anonId: string;
  /** Total number of orders */
  orderCount: number;
  /** Lifetime value in cents */
  ltvCents: number;
  /** Average order value in cents */
  avgOrderCents: number;
  /** First order timestamp (ISO) */
  firstOrderAt: string | null;
  /** Last order timestamp (ISO) */
  lastOrderAt: string | null;
  /** AI-generated tags (if any) */
  tags: string[];
  /** Whether customer is blocked */
  isBlocked: boolean;
}

export interface MemberRowForAnalysis {
  id: string;
  user_id: string;
  order_count: number;
  ltv_cents: number;
  avg_order_cents: number;
  first_order_at: string | null;
  last_order_at: string | null;
  tags: string[] | null;
  is_blocked: boolean;
}

/**
 * Map raw member row to AI-safe anonymized shape.
 * Pure function for easy testing.
 *
 * @param member - Raw member row (email/phone/address already excluded from select)
 * @returns AI-safe anonymized member shape
 */
export function mapMemberToAnalysisShape(
  member: MemberRowForAnalysis
): MemberAnalysisShape {
  return {
    // Use simpleHash for anonymization
    anonId: simpleHash(member.user_id, 'member'),
    orderCount: member.order_count,
    ltvCents: member.ltv_cents,
    avgOrderCents: member.avg_order_cents,
    firstOrderAt: member.first_order_at,
    lastOrderAt: member.last_order_at,
    tags: member.tags || [],
    isBlocked: member.is_blocked,
  };
}

// =============================================================================
// Comment Types and Mapper
// =============================================================================

/**
 * Comment data shape for AI analysis.
 * Contains only fields safe and useful for analysis.
 * user_id, ip_hash, user_email are excluded for privacy.
 */
export interface CommentAnalysisShape {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  hasParent: boolean;
  content: string;
  contentLength: number;
  likeCount: number;
  isApproved: boolean;
  createdAt: string;
}

export interface CommentRowForAnalysis {
  id: string;
  target_type: CommentTargetType;
  target_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  is_approved: boolean;
  created_at: string;
}

/**
 * Map raw comment row to AI-safe shape.
 * Pure function for easy testing.
 *
 * @param comment - Raw comment row (sensitive fields already excluded from select)
 * @returns AI-safe comment shape
 */
export function mapCommentToAnalysisShape(
  comment: CommentRowForAnalysis
): CommentAnalysisShape {
  return {
    id: comment.id,
    targetType: comment.target_type,
    targetId: comment.target_id,
    hasParent: comment.parent_id !== null,
    content: comment.content,
    contentLength: comment.content?.length ?? 0,
    likeCount: comment.like_count,
    isApproved: comment.is_approved,
    createdAt: comment.created_at,
  };
}
