/**
 * Shop Orders Read Admin IO
 *
 * Admin-only order read operations.
 *
 * @module lib/modules/shop/orders-read-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import {
  transformOrderToSummary,
  transformOrderToDetail,
  type OrderListParams,
} from '@/lib/modules/shop/orders-transform';
import type {
  OrderRow,
  OrderItemRow,
  OrderSummary,
  OrderDetail,
} from '@/lib/types/shop';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Get all orders for admin with pagination
 * Requires authenticated admin session via RLS
 */
export async function getAllOrders(
  params: OrderListParams = {}
): Promise<{ items: OrderSummary[]; total: number; hasMore: boolean }> {
  const supabase = await createClient();

  const {
    status,
    gateway,
    search,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  } = params;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (gateway) {
    query = query.eq('gateway', gateway);
  }

  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: orders, count, error } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return { items: [], total: 0, hasMore: false };
  }

  const items = (orders || []).map((order) =>
    transformOrderToSummary(order as OrderRow)
  );

  const total = count || 0;
  const hasMore = offset + items.length < total;

  return { items, total, hasMore };
}

/**
 * Get order detail by ID (for admin)
 * Requires authenticated admin session via RLS
 */
export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) {
    if (orderError) {
      console.error('Error fetching order:', orderError);
    }
    return null;
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  return transformOrderToDetail(
    order as OrderRow,
    (items || []) as OrderItemRow[]
  );
}

/**
 * Get order status for validation
 */
export async function getOrderStatusAdmin(
  orderId: string
): Promise<{ status: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { status: data.status };
}

/**
 * Get orders for a specific user (for admin)
 * Used by user domain for cross-domain queries
 * Requires authenticated admin session via RLS
 */
export async function getOrdersByUserIdForAdmin(
  userId: string
): Promise<OrderSummary[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders for user:', error);
    return [];
  }

  return (orders || []).map((order) =>
    transformOrderToSummary(order as OrderRow)
  );
}
