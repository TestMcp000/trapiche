/**
 * Stripe Webhook Handler
 *
 * Handles Stripe payment events:
 * - checkout.session.completed: Payment successful
 * - checkout.session.expired: Session expired (cancel order)
 *
 * Follows ARCHITECTURE.md principles:
 * - Signature verification using pure module
 * - Idempotency via webhook_events table
 * - Audit logging via payment_audit_logs
 * - Atomic status update via process_payment_success RPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import {
  parseJsonPayload,
  validateStripeWebhookSignature,
  buildStripeEventId,
  extractStripeOrderId,
  type StripeWebhookPayload,
} from '@/lib/modules/shop/payment-pure';
import {
  getPaymentProviderConfig,
  recordWebhookEvent,
  logPaymentAudit,
  processPaymentSuccess,
} from '@/lib/modules/shop/payment-io';

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('stripe-signature');

    if (!signatureHeader) {
      return new NextResponse('Missing Stripe signature', { status: 400 });
    }

    // 2. Get Stripe config
    const configResult = await getPaymentProviderConfig('stripe');
    if (!configResult.success) {
      console.error('[Stripe Webhook] Config error:', configResult.error);
      return new NextResponse('Stripe not configured', { status: 500 });
    }

    const { webhookSecret } = configResult.config;

    // 3. Verify signature
    const isValid = validateStripeWebhookSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValid) {
      console.error('[Stripe Webhook] Invalid signature');
      // Log signature_invalid event for audit compliance
      await logPaymentAudit(
        null,
        'stripe',
        'signature_invalid',
        signatureHeader.substring(0, 50),
        { rawBodyPreview: rawBody.substring(0, 500) }
      );
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // 4. Parse payload
    let payload: StripeWebhookPayload;
    try {
      payload = parseJsonPayload(rawBody) as StripeWebhookPayload;
    } catch (error) {
      console.error('[Stripe Webhook] Failed to parse payload:', error);
      return new NextResponse('Invalid payload', { status: 400 });
    }

    // 5. Build event ID for idempotency
    let eventId: string;
    try {
      eventId = buildStripeEventId(payload);
    } catch (error) {
      console.error('[Stripe Webhook] Failed to build event ID:', error);
      return new NextResponse('Invalid event', { status: 400 });
    }

    // 6. Check idempotency
    const isDuplicate = await recordWebhookEvent('stripe', eventId, payload.type, payload);
    if (isDuplicate) {
      // Already processed
      return NextResponse.json({ received: true, duplicate: true });
    }

    // 7. Extract order ID from metadata
    const orderId = extractStripeOrderId(payload);

    // 8. Handle different event types
    switch (payload.type) {
      case 'checkout.session.completed': {
        if (!orderId) {
          console.error('[Stripe Webhook] checkout.session.completed without order_id');
          // Log with null order_id for audit compliance
          await logPaymentAudit(
            null,
            'stripe',
            'order_id_missing',
            eventId,
            payload
          );
          return NextResponse.json({ received: true, warning: 'order_id missing' });
        }

        // Log received
        await logPaymentAudit(orderId, 'stripe', 'received', eventId, payload);

        // Process payment success
        try {
          await processPaymentSuccess({
            orderId,
            gateway: 'stripe',
            gatewayTransactionId: payload.data.object.id || eventId,
            gatewayMetadata: {
              stripe_event_id: eventId,
              stripe_session_id: payload.data.object.id,
              ...payload.data.object,
            },
          });

          // Revalidate cache
          revalidateTag('shop', { expire: 0 });

          await logPaymentAudit(orderId, 'stripe', 'payment_success', eventId, payload);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Stripe Webhook] processPaymentSuccess error:', errorMessage);
          await logPaymentAudit(orderId, 'stripe', 'payment_error', eventId, { error: errorMessage, payload });
        }
        break;
      }

      case 'checkout.session.expired': {
        if (!orderId) {
          return NextResponse.json({ received: true, warning: 'order_id missing' });
        }

        // Log session expired - order cancellation is handled by TTL release function
        await logPaymentAudit(orderId, 'stripe', 'session_expired', eventId, payload);
        break;
      }

      case 'payment_intent.payment_failed': {
        if (!orderId) {
          return NextResponse.json({ received: true, warning: 'order_id missing' });
        }

        await logPaymentAudit(orderId, 'stripe', 'payment_failed', eventId, payload);
        break;
      }

      default: {
        // Log unknown event types for monitoring
        console.log(`[Stripe Webhook] Unhandled event type: ${payload.type}`);
        if (orderId) {
          await logPaymentAudit(orderId, 'stripe', payload.type, eventId, payload);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Unexpected error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// Allow GET to check endpoint health
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Stripe webhook endpoint is configured',
    supportedEvents: [
      'checkout.session.completed',
      'checkout.session.expired',
      'payment_intent.payment_failed',
    ],
  });
}
