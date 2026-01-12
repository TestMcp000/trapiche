/**
 * Shop Order Status Module Tests
 *
 * 測試 lib/modules/shop/order-status.ts 的 pure functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapStripeCheckoutSessionStatus,
  mapStripePaymentIntentStatus,
  mapStripeStatus,
  mapLinePayStatus,
  mapECPayStatus,
  mapGatewayStatusToUnified,
  getStatusLabel,
  isCancellable,
  isRefundable,
  isFinal,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type StripeCheckoutSessionStatus,
  type StripePaymentIntentStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type LinePayTransactionStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type ECPayTransactionStatus,
} from '../lib/modules/shop/order-status';

describe('mapStripeCheckoutSessionStatus', () => {
  it('maps open to pending_payment', () => {
    assert.equal(mapStripeCheckoutSessionStatus('open'), 'pending_payment');
  });

  it('maps complete to paid', () => {
    assert.equal(mapStripeCheckoutSessionStatus('complete'), 'paid');
  });

  it('maps expired to cancelled', () => {
    assert.equal(mapStripeCheckoutSessionStatus('expired'), 'cancelled');
  });
});

describe('mapStripePaymentIntentStatus', () => {
  it('maps succeeded to paid', () => {
    assert.equal(mapStripePaymentIntentStatus('succeeded'), 'paid');
  });

  it('maps canceled to cancelled', () => {
    assert.equal(mapStripePaymentIntentStatus('canceled'), 'cancelled');
  });

  const pendingStatuses: StripePaymentIntentStatus[] = [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture',
  ];

  pendingStatuses.forEach((status) => {
    it(`maps ${status} to pending_payment`, () => {
      assert.equal(mapStripePaymentIntentStatus(status), 'pending_payment');
    });
  });
});

describe('mapStripeStatus', () => {
  it('prioritizes PaymentIntent status over Checkout Session', () => {
    const result = mapStripeStatus({
      checkoutSessionStatus: 'open',
      paymentIntentStatus: 'succeeded',
    });
    assert.equal(result, 'paid');
  });

  it('falls back to Checkout Session status when PaymentIntent is missing', () => {
    const result = mapStripeStatus({
      checkoutSessionStatus: 'complete',
    });
    assert.equal(result, 'paid');
  });

  it('returns pending_payment when both are missing', () => {
    const result = mapStripeStatus({});
    assert.equal(result, 'pending_payment');
  });
});

describe('mapLinePayStatus', () => {
  it('maps CONFIRMED to paid', () => {
    assert.equal(mapLinePayStatus('CONFIRMED'), 'paid');
  });

  it('maps PENDING to pending_payment', () => {
    assert.equal(mapLinePayStatus('PENDING'), 'pending_payment');
  });

  it('maps AUTHORIZED to pending_payment', () => {
    assert.equal(mapLinePayStatus('AUTHORIZED'), 'pending_payment');
  });

  it('maps EXPIRED to cancelled', () => {
    assert.equal(mapLinePayStatus('EXPIRED'), 'cancelled');
  });

  it('maps VOIDED to cancelled', () => {
    assert.equal(mapLinePayStatus('VOIDED'), 'cancelled');
  });

  it('maps REFUNDED to refunding', () => {
    assert.equal(mapLinePayStatus('REFUNDED'), 'refunding');
  });
});

describe('mapECPayStatus', () => {
  it('maps "1" to paid', () => {
    assert.equal(mapECPayStatus('1'), 'paid');
  });

  it('maps "0" to pending_payment', () => {
    assert.equal(mapECPayStatus('0'), 'pending_payment');
  });

  it('maps "2" to cancelled', () => {
    assert.equal(mapECPayStatus('2'), 'cancelled');
  });

  it('maps "10100058" to refunding', () => {
    assert.equal(mapECPayStatus('10100058'), 'refunding');
  });
});

describe('mapGatewayStatusToUnified', () => {
  it('handles Stripe gateway', () => {
    const result = mapGatewayStatusToUnified({
      gateway: 'stripe',
      status: { paymentIntentStatus: 'succeeded' },
    });
    assert.equal(result, 'paid');
  });

  it('handles LinePay gateway', () => {
    const result = mapGatewayStatusToUnified({
      gateway: 'linepay',
      status: 'CONFIRMED',
    });
    assert.equal(result, 'paid');
  });

  it('handles ECPay gateway', () => {
    const result = mapGatewayStatusToUnified({
      gateway: 'ecpay',
      status: '1',
    });
    assert.equal(result, 'paid');
  });
});

describe('getStatusLabel', () => {
  it('returns Chinese label by default', () => {
    assert.equal(getStatusLabel('paid'), '已付款');
  });

  it('returns English label when specified', () => {
    assert.equal(getStatusLabel('paid', 'en'), 'Paid');
  });

  it('returns Chinese label for all statuses', () => {
    assert.equal(getStatusLabel('pending_payment', 'zh'), '待付款');
    assert.equal(getStatusLabel('pending_shipment', 'zh'), '待出貨');
    assert.equal(getStatusLabel('shipped', 'zh'), '已出貨');
    assert.equal(getStatusLabel('completed', 'zh'), '已完成');
    assert.equal(getStatusLabel('cancelled', 'zh'), '已取消');
    assert.equal(getStatusLabel('refunding', 'zh'), '退款中');
  });
});

describe('status helpers', () => {
  it('isCancellable returns true only for pending_payment', () => {
    assert.equal(isCancellable('pending_payment'), true);
    assert.equal(isCancellable('paid'), false);
    assert.equal(isCancellable('completed'), false);
  });

  it('isRefundable returns true for paid and pending_shipment', () => {
    assert.equal(isRefundable('paid'), true);
    assert.equal(isRefundable('pending_shipment'), true);
    assert.equal(isRefundable('shipped'), false);
    assert.equal(isRefundable('completed'), false);
  });

  it('isFinal returns true for completed and cancelled', () => {
    assert.equal(isFinal('completed'), true);
    assert.equal(isFinal('cancelled'), true);
    assert.equal(isFinal('paid'), false);
    assert.equal(isFinal('refunding'), false);
  });
});
