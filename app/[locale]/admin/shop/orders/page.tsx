import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getAllOrders } from '@/lib/modules/shop/admin-io';
import type { UnifiedOrderStatus, PaymentGateway } from '@/lib/types/shop';
import type { Locale } from '@/lib/i18n/locales';

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  pending_shipment: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  refunding: 'bg-orange-100 text-orange-700',
};

const GATEWAY_ICONS: Record<PaymentGateway, string> = {
  stripe: '💳',
  linepay: '🟢',
  ecpay: '🏦',
};

function formatCurrency(cents: number): string {
  return `NT$ ${(cents / 100).toLocaleString()}`;
}

function formatDate(dateStr: string, adminLocale: Locale): string {
  return new Date(dateStr).toLocaleDateString(adminLocale === 'zh' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; gateway?: string; search?: string; page?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin' });

  const page = parseInt(filters.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const { items: orders, total, hasMore } = await getAllOrders({
    status: filters.status,
    gateway: filters.gateway,
    search: filters.search,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);
  const statuses: UnifiedOrderStatus[] = [
    'pending_payment',
    'paid',
    'pending_shipment',
    'shipped',
    'completed',
    'cancelled',
    'refunding',
  ];
  const gateways: PaymentGateway[] = ['stripe', 'linepay', 'ecpay'];

  // Helper to get status label from messages
  const getStatusLabel = (status: string) => {
    return t(`shop.orderStatus.${status}` as Parameters<typeof t>[0]);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('shop.orders.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('shop.orders.totalCount', { count: total })}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <form className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shop.orders.filters.status')}
            </label>
            <select
              name="status"
              defaultValue={filters.status || ''}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('shop.orders.filters.all')}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {/* Gateway Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shop.orders.filters.gateway')}
            </label>
            <select
              name="gateway"
              defaultValue={filters.gateway || ''}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('shop.orders.filters.all')}</option>
              {gateways.map((gw) => (
                <option key={gw} value={gw}>
                  {gw.charAt(0).toUpperCase() + gw.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shop.orders.filters.search')}
            </label>
            <input
              type="text"
              name="search"
              placeholder={t('shop.orders.filters.searchPlaceholder')}
              defaultValue={filters.search || ''}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('shop.orders.filters.filter')}
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shop.orders.table.orderNumber')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shop.orders.table.date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shop.orders.table.customer')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shop.orders.table.amount')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shop.orders.table.gateway')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shop.orders.table.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shop.orders.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 dark:text-white">
                        #{order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.createdAt, adminLocale)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.recipientName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(order.totalCents)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span title={order.gateway}>
                        {GATEWAY_ICONS[order.gateway]} {order.gateway}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/${locale}/admin/shop/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {t('shop.orders.details')}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('shop.orders.noOrders')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('shop.orders.pagination.page', { page, total: totalPages })}
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/${locale}/admin/shop/orders?${new URLSearchParams({
                    ...filters,
                    page: String(page - 1),
                  }).toString()}`}
                  className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('shop.orders.pagination.previous')}
                </Link>
              )}
              {hasMore && (
                <Link
                  href={`/${locale}/admin/shop/orders?${new URLSearchParams({
                    ...filters,
                    page: String(page + 1),
                  }).toString()}`}
                  className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('shop.orders.pagination.next')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
