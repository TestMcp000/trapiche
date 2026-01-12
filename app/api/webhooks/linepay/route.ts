/**
 * LINE Pay Webhook Handler
 *
 * Handles payment notifications from LINE Pay.
 *
 * Flow:
 * 1. Parse JSON body from POST request
 * 2. Validate HMAC-SHA256 signature
 * 3. Check idempotency via webhook_events table
 * 4. Extract and validate orderId (must be UUID)
 * 5. Log audit event
 * 6. Process payment success if returnCode === '0000'
 * 7. Return 200 { ok: true }
 *
 * Reference: doc/RUNBOOK.md (Payments, Section 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  parseJsonPayload,
  validateLinePaySignature,
  buildLinePayEventId,
  type LinePayPayload,
} from '@/lib/modules/shop/payment-pure';
import {
  getPaymentProviderConfig,
  recordWebhookEvent,
  logPaymentAudit,
  processPaymentSuccess,
} from '@/lib/modules/shop/payment-io';

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    // 1. Parse raw body
    const rawBody = await request.text();
    let payload: LinePayPayload;
    try {
      payload = parseJsonPayload(rawBody) as LinePayPayload;
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // 2. Load LINE Pay config
    const configResult = await getPaymentProviderConfig('linepay');
    if (!configResult.success) {
      return NextResponse.json({ ok: false, error: 'Provider disabled' }, { status: 400 });
    }
    const { config } = configResult;

    // 3. Validate signature
    const signature = request.headers.get('X-LINE-Authorization') || '';
    const nonce = request.headers.get('X-LINE-Authorization-Nonce') || '';
    const uri = new URL(request.url).pathname;

    const isValid = validateLinePaySignature(
      rawBody,
      uri,
      config.channelSecret,
      nonce,
      signature
    );

    if (!isValid) {
      // Always log signature failure (orderId may be null if invalid)
      const orderId = payload.orderId;
      await logPaymentAudit(
        orderId && UUID_REGEX.test(orderId) ? orderId : null,
        'linepay',
        'signature_invalid',
        String(payload.transactionId || 'unknown'),
        payload
      );
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
    }

    // 4. Build event ID for idempotency
    let eventId: string;
    try {
      eventId = buildLinePayEventId(payload);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid event' }, { status: 400 });
    }

    // 5. Check idempotency
    const isDuplicate = await recordWebhookEvent('linepay', eventId, 'payment_notify', payload);
    if (isDuplicate) {
      return NextResponse.json({ ok: true });
    }

    // 6. Extract and validate orderId
    const orderId = payload.orderId;
    if (!orderId) {
      // Log order_id_missing event
      await logPaymentAudit(
        null,
        'linepay',
        'order_id_missing',
        String(payload.transactionId || 'unknown'),
        payload
      );
      return NextResponse.json({ ok: true }); // Return OK to prevent retries
    }

    if (!UUID_REGEX.test(orderId)) {
      // Log order_id_invalid event (orderId is not a valid UUID)
      await logPaymentAudit(
        null,
        'linepay',
        'order_id_invalid',
        String(payload.transactionId || 'unknown'),
        payload
      );
      return NextResponse.json({ ok: true }); // Return OK to prevent retries
    }

    // 7. Log audit event
    await logPaymentAudit(
      orderId,
      'linepay',
      'received',
      String(payload.transactionId || 'unknown'),
      payload
    );

    // 8. Process based on returnCode
    if (payload.returnCode === '0000') {
      // Payment successful
      try {
        await processPaymentSuccess({
          orderId,
          gateway: 'linepay',
          gatewayTransactionId: String(payload.transactionId || ''),
          gatewayMetadata: payload as Record<string, unknown>,
        });
      } catch (err) {
        // Log processing error but still return OK
        await logPaymentAudit(
          orderId,
          'linepay',
          'processing_error',
          String(payload.transactionId || 'unknown'),
          { error: err instanceof Error ? err.message : 'Unknown error', payload }
        );
      }
    } else {
      // Payment failed
      await logPaymentAudit(
        orderId,
        'linepay',
        'payment_failed',
        String(payload.transactionId || 'unknown'),
        payload
      );
    }

    // 9. Return success
    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'LINE Pay webhook endpoint',
    version: 'Phase 1',
  });
}
