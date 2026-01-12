/**
 * AI Analysis Data Mapper Tests
 *
 * Pure function tests for data shape mappers.
 * These test the transformation logic without any DB interaction.
 *
 * @see lib/modules/ai-analysis/analysis-data-mappers.ts
 * @see uiux_refactor.md §6.2.2 - Data collection layer
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import from pure mappers module (no server-only dependency)
import {
  mapProductToAnalysisShape,
  mapOrderToAnalysisShape,
  mapMemberToAnalysisShape,
  mapCommentToAnalysisShape,
} from '../../lib/modules/ai-analysis/analysis-data-mappers';

// =============================================================================
// Product Mapper Tests
// =============================================================================

describe('mapProductToAnalysisShape', () => {
  it('maps product with variants to AI-safe shape', () => {
    const product = {
      id: 'prod-1',
      slug: 'test-product',
      name_en: 'Test Product',
      name_zh: '測試產品',
      category: 'electronics',
      is_visible: true,
      created_at: '2025-01-01T00:00:00Z',
      product_variants: [
        { price_cents: 1000, stock: 10, is_enabled: true },
        { price_cents: 2000, stock: 5, is_enabled: true },
        { price_cents: 500, stock: 0, is_enabled: false }, // disabled
      ],
    };

    const result = mapProductToAnalysisShape(product);

    assert.equal(result.id, 'prod-1');
    assert.equal(result.slug, 'test-product');
    assert.equal(result.nameEn, 'Test Product');
    assert.equal(result.nameZh, '測試產品');
    assert.equal(result.category, 'electronics');
    assert.equal(result.isVisible, true);
    assert.equal(result.minPriceCents, 1000);
    assert.equal(result.maxPriceCents, 2000);
    assert.equal(result.totalStock, 15); // only enabled variants
    assert.equal(result.createdAt, '2025-01-01T00:00:00Z');
  });

  it('handles product with no enabled variants', () => {
    const product = {
      id: 'prod-2',
      slug: 'no-variants',
      name_en: null,
      name_zh: null,
      category: null,
      is_visible: false,
      created_at: '2025-01-01T00:00:00Z',
      product_variants: [
        { price_cents: 1000, stock: 10, is_enabled: false },
      ],
    };

    const result = mapProductToAnalysisShape(product);

    assert.equal(result.minPriceCents, 0);
    assert.equal(result.maxPriceCents, 0);
    assert.equal(result.totalStock, 0);
  });
});

// =============================================================================
// Order Mapper Tests
// =============================================================================

describe('mapOrderToAnalysisShape', () => {
  it('maps order to AI-safe shape with anonymized orderId', () => {
    const order = {
      id: 'order-uuid-123',
      order_number: 'ORD-2025-00001234',
      status: 'paid' as const,
      gateway: 'stripe' as const,
      subtotal_cents: 10000,
      discount_cents: 500,
      total_cents: 9500,
      currency: 'TWD',
      coupon_code: 'SAVE10',
      created_at: '2025-01-15T10:00:00Z',
      paid_at: '2025-01-15T10:05:00Z',
      completed_at: null,
      order_items: [{ id: 'item-1' }, { id: 'item-2' }],
    };

    const result = mapOrderToAnalysisShape(order);

    assert.equal(result.id, 'order-uuid-123');
    assert.equal(result.orderId, 'order_00001234'); // anonymized
    assert.equal(result.status, 'paid');
    assert.equal(result.gateway, 'stripe');
    assert.equal(result.subtotalCents, 10000);
    assert.equal(result.discountCents, 500);
    assert.equal(result.totalCents, 9500);
    assert.equal(result.currency, 'TWD');
    assert.equal(result.itemCount, 2);
    assert.equal(result.hasCoupon, true);
    assert.equal(result.paidAt, '2025-01-15T10:05:00Z');
    assert.equal(result.completedAt, null);
  });

  it('handles order without coupon', () => {
    const order = {
      id: 'order-2',
      order_number: 'ORD-2025-00005678',
      status: 'pending_payment' as const,
      gateway: 'linepay' as const,
      subtotal_cents: 5000,
      discount_cents: 0,
      total_cents: 5000,
      currency: 'TWD',
      coupon_code: null,
      created_at: '2025-01-15T10:00:00Z',
      paid_at: null,
      completed_at: null,
      order_items: [],
    };

    const result = mapOrderToAnalysisShape(order);

    assert.equal(result.hasCoupon, false);
    assert.equal(result.itemCount, 0);
  });
});

// =============================================================================
// Member Mapper Tests
// =============================================================================

describe('mapMemberToAnalysisShape', () => {
  it('maps member to anonymized AI-safe shape', () => {
    const member = {
      id: 'profile-1',
      user_id: 'user-uuid-abc123',
      order_count: 5,
      ltv_cents: 50000,
      avg_order_cents: 10000,
      first_order_at: '2024-06-01T00:00:00Z',
      last_order_at: '2025-01-10T00:00:00Z',
      tags: ['vip', 'repeat'],
      is_blocked: false,
    };

    const result = mapMemberToAnalysisShape(member);

    // Should have anonymized ID
    assert.ok(result.anonId.startsWith('member_'));
    assert.ok(!result.anonId.includes('abc123'));
    assert.equal(result.orderCount, 5);
    assert.equal(result.ltvCents, 50000);
    assert.equal(result.avgOrderCents, 10000);
    assert.equal(result.firstOrderAt, '2024-06-01T00:00:00Z');
    assert.equal(result.lastOrderAt, '2025-01-10T00:00:00Z');
    assert.deepEqual(result.tags, ['vip', 'repeat']);
    assert.equal(result.isBlocked, false);
  });

  it('produces consistent anonymized IDs', () => {
    const member = {
      id: 'profile-1',
      user_id: 'same-user-id',
      order_count: 1,
      ltv_cents: 1000,
      avg_order_cents: 1000,
      first_order_at: null,
      last_order_at: null,
      tags: null,
      is_blocked: false,
    };

    const result1 = mapMemberToAnalysisShape(member);
    const result2 = mapMemberToAnalysisShape(member);

    assert.equal(result1.anonId, result2.anonId);
  });

  it('handles null tags', () => {
    const member = {
      id: 'profile-2',
      user_id: 'user-2',
      order_count: 0,
      ltv_cents: 0,
      avg_order_cents: 0,
      first_order_at: null,
      last_order_at: null,
      tags: null,
      is_blocked: false,
    };

    const result = mapMemberToAnalysisShape(member);

    assert.deepEqual(result.tags, []);
  });
});

// =============================================================================
// Comment Mapper Tests
// =============================================================================

describe('mapCommentToAnalysisShape', () => {
  it('maps comment to AI-safe shape', () => {
    const comment = {
      id: 'comment-1',
      target_type: 'post' as const,
      target_id: 'post-123',
      parent_id: null,
      content: 'Great article! Very helpful.',
      like_count: 5,
      is_approved: true,
      created_at: '2025-01-15T12:00:00Z',
    };

    const result = mapCommentToAnalysisShape(comment);

    assert.equal(result.id, 'comment-1');
    assert.equal(result.targetType, 'post');
    assert.equal(result.targetId, 'post-123');
    assert.equal(result.hasParent, false);
    assert.equal(result.content, 'Great article! Very helpful.');
    assert.equal(result.contentLength, 28);
    assert.equal(result.likeCount, 5);
    assert.equal(result.isApproved, true);
    assert.equal(result.createdAt, '2025-01-15T12:00:00Z');
  });

  it('handles reply comment (has parent)', () => {
    const comment = {
      id: 'comment-2',
      target_type: 'gallery_item' as const,
      target_id: 'gallery-456',
      parent_id: 'comment-1',
      content: 'Thanks!',
      like_count: 0,
      is_approved: true,
      created_at: '2025-01-15T12:30:00Z',
    };

    const result = mapCommentToAnalysisShape(comment);

    assert.equal(result.hasParent, true);
    assert.equal(result.targetType, 'gallery_item');
  });
});

// =============================================================================
// PII Exclusion Tests (verify no sensitive data in shapes)
// =============================================================================

describe('PII Exclusion Verification', () => {
  it('ProductAnalysisShape has no PII fields', () => {
    const product = {
      id: 'prod-1',
      slug: 'test',
      name_en: 'Test',
      name_zh: '測試',
      category: null,
      is_visible: true,
      created_at: '2025-01-01T00:00:00Z',
      product_variants: [],
    };

    const result = mapProductToAnalysisShape(product);
    const keys = Object.keys(result);

    // These fields should NOT exist
    assert.ok(!keys.includes('email'));
    assert.ok(!keys.includes('phone'));
    assert.ok(!keys.includes('address'));
    assert.ok(!keys.includes('userId'));
  });

  it('OrderAnalysisShape excludes customer PII', () => {
    const order = {
      id: 'order-1',
      order_number: 'ORD-00001',
      status: 'paid' as const,
      gateway: 'stripe' as const,
      subtotal_cents: 1000,
      discount_cents: 0,
      total_cents: 1000,
      currency: 'TWD',
      coupon_code: null,
      created_at: '2025-01-01T00:00:00Z',
      paid_at: null,
      completed_at: null,
      order_items: [],
    };

    const result = mapOrderToAnalysisShape(order);
    const keys = Object.keys(result);

    // These fields should NOT exist (they are in OrderRow but not in shape)
    assert.ok(!keys.includes('recipientName'));
    assert.ok(!keys.includes('recipientPhone'));
    assert.ok(!keys.includes('recipientAddress'));
    assert.ok(!keys.includes('customerEmail'));
    assert.ok(!keys.includes('userId'));
  });

  it('MemberAnalysisShape has anonymized ID only', () => {
    const member = {
      id: 'profile-1',
      user_id: 'real-user-uuid',
      order_count: 1,
      ltv_cents: 1000,
      avg_order_cents: 1000,
      first_order_at: null,
      last_order_at: null,
      tags: null,
      is_blocked: false,
    };

    const result = mapMemberToAnalysisShape(member);
    const keys = Object.keys(result);

    // user_id should be transformed to anonId
    assert.ok(keys.includes('anonId'));
    assert.ok(!keys.includes('userId'));
    assert.ok(!keys.includes('user_id'));
    assert.ok(!keys.includes('email'));
    assert.ok(!keys.includes('displayName'));
    assert.ok(!keys.includes('phone'));
    assert.ok(!keys.includes('address'));

    // anonId should not contain original user_id
    assert.ok(!result.anonId.includes('real-user-uuid'));
  });

  it('CommentAnalysisShape excludes user identity', () => {
    const comment = {
      id: 'comment-1',
      target_type: 'post' as const,
      target_id: 'post-1',
      parent_id: null,
      content: 'Test',
      like_count: 0,
      is_approved: true,
      created_at: '2025-01-01T00:00:00Z',
    };

    const result = mapCommentToAnalysisShape(comment);
    const keys = Object.keys(result);

    // These fields should NOT exist
    assert.ok(!keys.includes('userId'));
    assert.ok(!keys.includes('user_id'));
    assert.ok(!keys.includes('userEmail'));
    assert.ok(!keys.includes('userDisplayName'));
    assert.ok(!keys.includes('ipHash'));
    assert.ok(!keys.includes('ip_hash'));
  });
});
