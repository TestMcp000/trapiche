/**
 * Shop Customers Admin IO
 *
 * Admin-only customer/member management operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/shop/customers-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import type {
  OrderRow,
  CustomerProfileRow,
  CustomerProfileSummary,
  CustomerProfileDetail,
} from '@/lib/types/shop';
import { transformOrderToSummary } from './orders-admin-io';

// =============================================================================
// Transform Helpers (Pure Functions)
// =============================================================================

/**
 * Transform DB customer profile row to CustomerProfileSummary
 */
export function transformProfileToSummary(
  profile: CustomerProfileRow
): CustomerProfileSummary {
  return {
    id: profile.id,
    userId: profile.user_id,
    email: profile.email,
    displayName: profile.display_name,
    orderCount: profile.order_count,
    ltvCents: profile.ltv_cents,
    firstOrderAt: profile.first_order_at,
    lastOrderAt: profile.last_order_at,
    avgOrderCents: profile.avg_order_cents,
    tags: profile.tags || [],
    isBlocked: profile.is_blocked,
  };
}

/**
 * Transform DB customer profile row + orders to CustomerProfileDetail
 */
export function transformProfileToDetail(
  profile: CustomerProfileRow,
  orders: Array<ReturnType<typeof transformOrderToSummary>>
): CustomerProfileDetail {
  return {
    ...transformProfileToSummary(profile),
    phone: profile.phone,
    addressJson: profile.address_json,
    aiFeatures: profile.ai_features || {},
    blockedAt: profile.blocked_at,
    blockedReason: profile.blocked_reason,
    orders,
  };
}

// =============================================================================
// Customer Read Operations
// =============================================================================

/**
 * Fallback: Get customer list aggregated from orders
 * Used when customer_profiles table is empty
 */
async function getCustomerListFromOrders(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CustomerProfileSummary[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('user_id, total_cents, created_at')
    .not('user_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching orders for customer list:', error);
    return [];
  }

  // Aggregate by user_id
  const customerMap = new Map<string, {
    orderCount: number;
    ltvCents: number;
    firstOrderAt: string;
    lastOrderAt: string;
  }>();

  for (const order of orders || []) {
    if (!order.user_id) continue;

    const existing = customerMap.get(order.user_id);
    if (existing) {
      existing.orderCount += 1;
      existing.ltvCents += order.total_cents;
      existing.lastOrderAt = order.created_at;
    } else {
      customerMap.set(order.user_id, {
        orderCount: 1,
        ltvCents: order.total_cents,
        firstOrderAt: order.created_at,
        lastOrderAt: order.created_at,
      });
    }
  }

  // Convert to array
  const customers: CustomerProfileSummary[] = [];
  for (const [userId, data] of customerMap) {
    customers.push({
      id: userId,
      userId,
      email: null,
      displayName: null,
      orderCount: data.orderCount,
      ltvCents: data.ltvCents,
      firstOrderAt: data.firstOrderAt,
      lastOrderAt: data.lastOrderAt,
      avgOrderCents: Math.round(data.ltvCents / data.orderCount),
      tags: [],
      isBlocked: false,
    });
  }

  // Sort by LTV descending
  customers.sort((a, b) => b.ltvCents - a.ltvCents);

  return customers;
}

/**
 * Get customer list from customer_profiles table
 * Falls back to orders aggregation if no profiles exist
 * Requires authenticated admin session via RLS
 */
export async function getCustomerList(): Promise<CustomerProfileSummary[]> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return [];
  }

  // Try customer_profiles first
  const { data: profiles, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .order('ltv_cents', { ascending: false });

  if (error) {
    console.error('Error fetching customer profiles:', error);
    // Fallback: aggregate from orders
    return getCustomerListFromOrders(supabase);
  }

  if (!profiles || profiles.length === 0) {
    // Fallback: aggregate from orders
    return getCustomerListFromOrders(supabase);
  }

  return profiles.map((p) => transformProfileToSummary(p as CustomerProfileRow));
}

/**
 * Get customer detail by user ID
 * Uses customer_profiles with fallback to orders aggregation
 * Requires authenticated admin session via RLS
 */
export async function getCustomerById(
  userId: string
): Promise<CustomerProfileDetail | null> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return null;
  }

  // Try customer_profiles first
  const { data: profile, error: profileError } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Fetch orders for both paths
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching customer orders:', ordersError);
  }

  const orderSummaries = (orders || []).map((order) =>
    transformOrderToSummary(order as OrderRow)
  );

  // If profile exists, use it
  if (profile && !profileError) {
    return transformProfileToDetail(profile as CustomerProfileRow, orderSummaries);
  }

  // Fallback: build from orders
  if (!orders || orders.length === 0) {
    return null;
  }

  const ltvCents = orders.reduce((sum, o) => sum + o.total_cents, 0);
  const firstOrder = orders[orders.length - 1];
  const lastOrder = orders[0];

  return {
    id: userId,
    userId,
    email: null,
    displayName: null,
    orderCount: orders.length,
    ltvCents,
    firstOrderAt: firstOrder.created_at,
    lastOrderAt: lastOrder.created_at,
    avgOrderCents: Math.round(ltvCents / orders.length),
    tags: [],
    isBlocked: false,
    phone: null,
    addressJson: null,
    aiFeatures: {},
    blockedAt: null,
    blockedReason: null,
    orders: orderSummaries,
  };
}
