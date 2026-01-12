/**
 * ECPay Webhook Handler
 *
 * Handles payment result notifications from ECPay (綠界).
 *
 * Flow:
 * 1. Parse form data from POST request
 * 2. Validate CheckMacValue signature
 * 3. Check idempotency via webhook_events table
 * 4. Resolve order by MerchantTradeNo -> order_number
 * 5. Log audit event
 * 6. Process payment success if RtnCode === '1'
 * 7. Return 1|OK
 *
 * Reference: doc/RUNBOOK.md (Payments, Section 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  parseFormDataPayload,
  validateEcpayCheckMacValue,
  buildEcpayEventId,
} from '@/lib/modules/shop/payment-pure';
import {
  getPaymentProviderConfig,
  recordWebhookEvent,
  logPaymentAudit,
  getOrderIdByOrderNumber,
  processPaymentSuccess,
} from '@/lib/modules/shop/payment-io';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    const formData = await request.formData();
    const params = parseFormDataPayload(formData);

    // 2. Load ECPay config
    const configResult = await getPaymentProviderConfig('ecpay');
    if (!configResult.success) {
      return new NextResponse('0|Provider Disabled', { status: 400 });
    }
    const { config } = configResult;

    // 3. Validate CheckMacValue
    const isValid = validateEcpayCheckMacValue(params, config.hashKey, config.hashIv);
    if (!isValid) {
      // Always log signature failure (orderId may be null if order not found)
      const orderNumber = params.MerchantTradeNo || 'unknown';
      const orderId = await getOrderIdByOrderNumber(orderNumber);
      await logPaymentAudit(
        orderId,  // null if order not found
        'ecpay',
        'signature_invalid',
        params.TradeNo || params.MerchantTradeNo || 'unknown',
        params
      );
      return new NextResponse('0|CheckMacValue Error', { status: 400 });
    }

    // 4. Build event ID for idempotency
    let eventId: string;
    try {
      eventId = buildEcpayEventId(params);
    } catch {
      return new NextResponse('0|Invalid Event', { status: 400 });
    }

    // 5. Check idempotency
    const isDuplicate = await recordWebhookEvent('ecpay', eventId, 'payment_result', params);
    if (isDuplicate) {
      return new NextResponse('1|OK');
    }

    // 6. Resolve order ID from MerchantTradeNo
    const orderNumber = params.MerchantTradeNo;
    if (!orderNumber) {
      return new NextResponse('1|OK'); // Return OK to prevent retries
    }

    const orderId = await getOrderIdByOrderNumber(orderNumber);
    if (!orderId) {
      // Log order not found event
      await logPaymentAudit(
        null,
        'ecpay',
        'order_not_found',
        params.TradeNo || params.MerchantTradeNo || 'unknown',
        params
      );
      // ECPay still expects 1|OK
      return new NextResponse('1|OK');
    }

    // 7. Log audit event
    await logPaymentAudit(
      orderId,
      'ecpay',
      'received',
      params.TradeNo || params.MerchantTradeNo || 'unknown',
      params
    );

    // 8. Process based on RtnCode
    if (params.RtnCode === '1') {
      // Payment successful
      try {
        await processPaymentSuccess({
          orderId,
          gateway: 'ecpay',
          gatewayTransactionId: params.MerchantTradeNo || '', // Use as reservation key
          gatewayMetadata: {
            ...params,
            ecpay_trade_no: params.TradeNo,
          },
        });
      } catch (err) {
        // Log processing error but still return OK
        await logPaymentAudit(
          orderId,
          'ecpay',
          'processing_error',
          params.TradeNo || params.MerchantTradeNo || 'unknown',
          { error: err instanceof Error ? err.message : 'Unknown error', params }
        );
      }
    } else {
      // Payment failed
      await logPaymentAudit(
        orderId,
        'ecpay',
        'payment_failed',
        params.TradeNo || params.MerchantTradeNo || 'unknown',
        params
      );
    }

    // 9. Return 1|OK (ECPay requires this exact response)
    return new NextResponse('1|OK');
  } catch (_error) {
    // Unexpected error - return error but log nothing as we may not have orderId
    return new NextResponse('0|Error', { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'ECPay webhook endpoint',
    version: 'Phase 1',
  });
}
