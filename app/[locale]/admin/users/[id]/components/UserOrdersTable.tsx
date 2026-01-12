'use client';

/**
 * User Orders Table Component
 *
 * Displays user's order history in a table.
 * Route-local presentational component.
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { OrderSummary } from '@/lib/types/shop';

interface UserOrdersTableProps {
  orders: OrderSummary[];
  routeLocale: string;
}

export default function UserOrdersTable({ orders, routeLocale }: UserOrdersTableProps) {
  const t = useTranslations('admin.users.detail');

  // Format dates with browser locale
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('orderHistory')}
        </h2>
      </div>
      {orders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('orderNumber')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('amount')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('view')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">
                    #{order.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    NT$ {(order.totalCents / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${routeLocale}/admin/shop/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          {t('noOrders')}
        </div>
      )}
    </div>
  );
}

