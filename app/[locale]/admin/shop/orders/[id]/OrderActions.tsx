'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isCancellable, isRefundable, isFinal } from '@/lib/modules/shop/order-status';
import type { UnifiedOrderStatus } from '@/lib/types/shop';
import { updateShipping, cancelOrder, markRefund, markOrderComplete } from '../actions';

interface OrderActionsProps {
  orderId: string;
  status: UnifiedOrderStatus;
  currentCarrier: string | null;
  currentTrackingNumber: string | null;
  routeLocale: string;
}

export default function OrderActions({
  orderId,
  status,
  currentCarrier,
  currentTrackingNumber,
  routeLocale,
}: OrderActionsProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  // Shipping form state
  const [carrier, setCarrier] = useState(currentCarrier || '');
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber || '');

  const canCancel = isCancellable(status);
  const canRefund = isRefundable(status);
  const isFinalStatus = isFinal(status);
  const canMarkComplete = status === 'shipped';
  const canUpdateShipping = !isFinalStatus && status !== 'pending_payment';

  const handleUpdateShipping = async () => {
    setError(null);
    startTransition(async () => {
      const result = await updateShipping(orderId, carrier, trackingNumber);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to update shipping');
      }
    });
  };

  const handleCancel = async () => {
    const confirmed = window.confirm(t('shop.orders.actions.cancelConfirm'));
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to cancel order');
      }
    });
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      setError(t('shop.orders.actions.refundDialog.reasonRequired'));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await markRefund(orderId, refundReason);
      if (result.success) {
        setShowRefundDialog(false);
        setRefundReason('');
        router.refresh();
      } else {
        setError(result.error || 'Failed to request refund');
      }
    });
  };

  const handleMarkComplete = async () => {
    setError(null);
    startTransition(async () => {
      const result = await markOrderComplete(orderId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to mark order complete');
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Shipping Update */}
      {canUpdateShipping && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('shop.orders.actions.updateShipping')}
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shop.orders.actions.carrierLabel')}
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder={t('shop.orders.actions.carrierPlaceholder')}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shop.orders.actions.trackingLabel')}
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>
            <button
              onClick={handleUpdateShipping}
              disabled={isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending
                ? t('shop.orders.actions.updating')
                : t('shop.orders.actions.updateShippingBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('shop.orders.actions.title')}
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {canMarkComplete && (
            <button
              onClick={handleMarkComplete}
              disabled={isPending}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {t('shop.orders.actions.markComplete')}
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
            >
              {t('shop.orders.actions.cancelOrder')}
            </button>
          )}

          {canRefund && (
            <button
              onClick={() => setShowRefundDialog(true)}
              disabled={isPending}
              className="w-full px-4 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20 disabled:opacity-50 transition-colors"
            >
              {t('shop.orders.actions.requestRefund')}
            </button>
          )}

          {isFinalStatus && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('shop.orders.actions.finalized')}
            </p>
          )}
        </div>
      </div>

      {/* Refund Dialog */}
      {showRefundDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('shop.orders.actions.refundDialog.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('shop.orders.actions.refundDialog.notice')}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shop.orders.actions.refundDialog.reasonLabel')}
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefundDialog(false);
                  setRefundReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('shop.orders.actions.refundDialog.cancel')}
              </button>
              <button
                onClick={handleRefund}
                disabled={isPending || !refundReason.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? t('shop.orders.actions.refundDialog.processing')
                  : t('shop.orders.actions.refundDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
