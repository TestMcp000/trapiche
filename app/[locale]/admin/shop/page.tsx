import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import {
  getDashboardStats,
  getRevenueChart,
  getGatewayBreakdown,
  getRecentOrders,
} from '@/lib/modules/shop/dashboard-io';
import ShopDashboardCharts from '@/components/admin/shop/ShopDashboardCharts';

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  pending_shipment: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  refunding: 'bg-orange-100 text-orange-700',
};

function formatCurrency(cents: number): string {
  return `NT$ ${(cents / 100).toLocaleString()}`;
}

export default async function ShopDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin' });

  // Fetch dashboard data in parallel
  const [stats, revenueData, gatewayData, recentOrders] = await Promise.all([
    getDashboardStats(),
    getRevenueChart(7),
    getGatewayBreakdown(),
    getRecentOrders(5),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('shop.dashboard.title')}
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('shop.dashboard.totalRevenue')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.todayRevenue)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('shop.dashboard.totalOrders')}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.monthRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('shop.dashboard.pendingOrders')}
              </p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {stats.pendingOrders}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('shop.dashboard.pendingShipment')}
              </p>
              <p className={`text-2xl font-bold mt-1 ${stats.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.lowStockProducts}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.lowStockProducts > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <svg className={`w-6 h-6 ${stats.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="mb-8">
        <ShopDashboardCharts
          revenueData={revenueData}
          gatewayData={gatewayData}
          locale={adminLocale}
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('shop.dashboard.recentOrders')}
          </h2>
          <Link
            href={`/${locale}/admin/shop/orders`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('shop.dashboard.viewAll')}
          </Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      #{order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.recipientName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {t(`shop.orderStatus.${order.status}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(order.totalCents)}
                  </span>
                  <Link
                    href={`/${locale}/admin/shop/orders/${order.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {t('shop.dashboard.viewAll')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('shop.dashboard.noRecentOrders')}
          </div>
        )}
      </div>
    </div>
  );
}
