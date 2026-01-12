/**
 * Shop Dashboard Data Aggregation
 *
 * Server-side helpers for dashboard statistics and charts.
 * Uses service role client for aggregation queries.
 *
 * 遵循 refactor.md 架構規範：
 * - IO 集中於此（不散落到 UI）
 * - 只在 server 端使用（不進 client bundle）
 */

import 'server-only';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { PaymentGateway, UnifiedOrderStatus } from '@/lib/types/shop';

// =============================================================================
// Types
// =============================================================================

export interface DashboardStats {
  todayRevenue: number;
  monthRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface GatewayBreakdown {
  gateway: PaymentGateway;
  count: number;
  total: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  recipientName: string;
  totalCents: number;
  status: UnifiedOrderStatus;
  gateway: PaymentGateway;
  createdAt: string;
}

// =============================================================================
// Dashboard Stats
// =============================================================================

/**
 * Get dashboard key metrics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Today's revenue (paid orders)
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total_cents')
    .gte('paid_at', todayStart)
    .in('status', ['paid', 'pending_shipment', 'shipped', 'completed']);

  const todayRevenue = todayOrders?.reduce(
    (sum: number, o: { total_cents: number }) => sum + (o.total_cents || 0),
    0
  ) || 0;

  // Month's revenue
  const { data: monthOrders } = await supabase
    .from('orders')
    .select('total_cents')
    .gte('paid_at', monthStart)
    .in('status', ['paid', 'pending_shipment', 'shipped', 'completed']);

  const monthRevenue = monthOrders?.reduce(
    (sum: number, o: { total_cents: number }) => sum + (o.total_cents || 0),
    0
  ) || 0;

  // Pending orders (pending_payment or pending_shipment)
  const { count: pendingOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending_payment', 'pending_shipment']);

  // Low stock products (variants with stock <= 5)
  const { count: lowStockProducts } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true })
    .lte('stock', 5)
    .eq('is_enabled', true);

  return {
    todayRevenue,
    monthRevenue,
    pendingOrders: pendingOrders || 0,
    lowStockProducts: lowStockProducts || 0,
  };
}

// =============================================================================
// Revenue Chart Data
// =============================================================================

/**
 * Get revenue data for chart (last N days)
 */
export async function getRevenueChart(days: number = 7): Promise<RevenueDataPoint[]> {
  const supabase = createAdminClient();
  const result: RevenueDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

    const { data: dayOrders } = await supabase
      .from('orders')
      .select('total_cents')
      .gte('paid_at', dayStart)
      .lt('paid_at', dayEnd)
      .in('status', ['paid', 'pending_shipment', 'shipped', 'completed']);

    const revenue = dayOrders?.reduce(
      (sum: number, o: { total_cents: number }) => sum + (o.total_cents || 0),
      0
    ) || 0;

    result.push({
      date: date.toISOString().split('T')[0],
      revenue,
    });
  }

  return result;
}

// =============================================================================
// Gateway Breakdown
// =============================================================================

/**
 * Get payment gateway breakdown for pie chart
 */
export async function getGatewayBreakdown(): Promise<GatewayBreakdown[]> {
  const supabase = createAdminClient();
  const gateways: PaymentGateway[] = ['stripe', 'linepay', 'ecpay'];
  const result: GatewayBreakdown[] = [];

  for (const gateway of gateways) {
    const { data, count } = await supabase
      .from('orders')
      .select('total_cents', { count: 'exact' })
      .eq('gateway', gateway)
      .in('status', ['paid', 'pending_shipment', 'shipped', 'completed']);

    const total = data?.reduce(
      (sum: number, o: { total_cents: number }) => sum + (o.total_cents || 0),
      0
    ) || 0;

    if (count && count > 0) {
      result.push({
        gateway,
        count: count || 0,
        total,
      });
    }
  }

  return result;
}

// =============================================================================
// Recent Orders
// =============================================================================

/**
 * Get recent orders for dashboard
 */
export async function getRecentOrders(limit: number = 5): Promise<RecentOrder[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, recipient_name, total_cents, status, gateway, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((order: {
    id: string;
    order_number: string;
    recipient_name: string;
    total_cents: number;
    status: string;
    gateway: string;
    created_at: string;
  }) => ({
    id: order.id,
    orderNumber: order.order_number,
    recipientName: order.recipient_name,
    totalCents: order.total_cents,
    status: order.status as UnifiedOrderStatus,
    gateway: order.gateway as PaymentGateway,
    createdAt: order.created_at,
  }));
}
