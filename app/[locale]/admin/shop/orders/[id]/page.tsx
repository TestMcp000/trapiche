import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAdminLocale, getAdminMessages } from '@/lib/i18n/admin-locale.server';
import { getOrderById } from '@/lib/modules/shop/admin-io';
import type { UnifiedOrderStatus } from '@/lib/types/shop';
import type { Locale } from '@/lib/i18n/locales';
import { NextIntlClientProvider } from 'next-intl';
import OrderActions from './OrderActions';

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  pending_shipment: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  refunding: 'bg-orange-100 text-orange-700 border-orange-200',
};

function formatCurrency(cents: number): string {
  return `NT$ ${(cents / 100).toLocaleString()}`;
}

function formatDate(dateStr: string | null, adminLocale: Locale): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString(adminLocale === 'zh' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin' });
  const messages = await getAdminMessages(adminLocale);
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  // Helper to get status label from messages
  const getStatusLabel = (status: string) => {
    return t(`shop.orderStatus.${status}` as Parameters<typeof t>[0]);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/${locale}/admin/shop/orders`}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('shop.orders.detail.title')}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            #{order.orderNumber}
          </p>
        </div>
        <span className={`px-4 py-2 text-sm font-medium rounded-full border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('shop.orders.detail.orderItems')}
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.product_name_zh || item.product_name_en || 'Unnamed Product'}
                    </p>
                    {item.variant_key && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.variant_key}
                        {item.sku && ` · SKU: ${item.sku}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.total_cents)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(item.unit_price_cents)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.subtotal')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(order.subtotalCents)}
                  </span>
                </div>
                {order.discountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('shop.orders.detail.discount')}
                      {order.couponCode && ` (${order.couponCode})`}
                    </span>
                    <span className="text-green-600">
                      -{formatCurrency(order.discountCents)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-900 dark:text-white">
                    {t('shop.orders.detail.total')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(order.totalCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gateway Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('shop.orders.detail.paymentInfo')}
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('shop.orders.detail.gateway')}
                </span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {order.gateway}
                </span>
              </div>
              {order.gatewayTransactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.transactionId')}
                  </span>
                  <span className="font-mono text-sm text-gray-900 dark:text-white">
                    {order.gatewayTransactionId}
                  </span>
                </div>
              )}
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.paidAt')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(order.paidAt, adminLocale)}
                  </span>
                </div>
              )}
              {order.gatewayMetadata && Object.keys(order.gatewayMetadata).length > 0 && (
                <details className="pt-2">
                  <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                    {t('shop.orders.detail.rawMetadata')}
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
                    {JSON.stringify(order.gatewayMetadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer/User Link */}
          {order.userId && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('shop.orders.detail.customer')}
                </h2>
              </div>
              <div className="p-4">
                <Link
                  href={`/${locale}/admin/users/${order.userId}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('shop.orders.detail.viewUserProfile')}
                </Link>
              </div>
            </div>
          )}

          {/* Recipient Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('shop.orders.detail.recipientInfo')}
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('shop.orders.detail.name')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.recipientName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('shop.orders.detail.phone')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.recipientPhone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('shop.orders.detail.address')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.recipientAddress}
                </p>
              </div>
              {order.recipientNote && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.note')}
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {order.recipientNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('shop.orders.detail.shippingInfo')}
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('shop.orders.detail.carrier')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.shippingCarrier || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('shop.orders.detail.trackingNumber')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.shippingTrackingNumber || '-'}
                </p>
              </div>
              {order.shippedAt && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.shippedAt')}
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(order.shippedAt, adminLocale)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('shop.orders.detail.timeline')}
              </h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('shop.orders.detail.created')}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formatDate(order.createdAt, adminLocale)}
                </span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.paid')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(order.paidAt, adminLocale)}
                  </span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.shipped')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(order.shippedAt, adminLocale)}
                  </span>
                </div>
              )}
              {order.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.completed')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(order.completedAt, adminLocale)}
                  </span>
                </div>
              )}
              {order.cancelledAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('shop.orders.detail.cancelled')}
                  </span>
                  <span className="text-red-600">
                    {formatDate(order.cancelledAt, adminLocale)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Actions */}
          <NextIntlClientProvider locale={adminLocale} messages={messages}>
            <OrderActions
              orderId={order.id}
              status={order.status as UnifiedOrderStatus}
              currentCarrier={order.shippingCarrier}
              currentTrackingNumber={order.shippingTrackingNumber}
              routeLocale={locale}
            />
          </NextIntlClientProvider>
        </div>
      </div>
    </div>
  );
}
