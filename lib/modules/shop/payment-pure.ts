/**
 * Payment Pure Module
 *
 * Pure functions for payment webhook processing.
 * No side effects - no fetch, no DB, no console, no Next.js imports.
 *
 * Follows ARCHITECTURE.md principles:
 * - Pure computations only
 * - 100% testable without mocks
 * - Single source of truth for payment validation logic
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface ECPayParams {
  CheckMacValue?: string;
  TradeNo?: string;
  MerchantTradeNo?: string;
  RtnCode?: string;
  [key: string]: string | undefined;
}

export interface LinePayPayload {
  transactionId?: string | number;
  orderId?: string;
  returnCode?: string;
  returnMessage?: string;
  [key: string]: unknown;
}

// =============================================================================
// Parsing Functions
// =============================================================================

/**
 * Parse FormData to a plain object, converting all entries to strings.
 * File values are ignored.
 */
export function parseFormDataPayload(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};

  formData.forEach((value, key) => {
    // Ignore File values
    if (typeof value === 'string') {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Parse JSON string to an object.
 * Throws on invalid JSON or non-object result.
 */
export function parseJsonPayload(rawBody: string): Record<string, unknown> {
  const parsed = JSON.parse(rawBody);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid JSON payload: expected object');
  }

  return parsed as Record<string, unknown>;
}

// =============================================================================
// ECPay Signature Validation
// =============================================================================

/**
 * ECPay URL encode following their specific rules (RFC 1866 with modifications).
 * Certain characters are not encoded or use specific substitutions.
 */
function ecpayUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, '+') // Space -> +
    .replace(/%2d/gi, '-') // - not encoded
    .replace(/%5f/gi, '_') // _ not encoded
    .replace(/%2e/gi, '.') // . not encoded
    .replace(/%21/g, '!') // ! not encoded
    .replace(/%2a/gi, '*') // * not encoded
    .replace(/%28/g, '(') // ( not encoded
    .replace(/%29/g, ')'); // ) not encoded
}

/**
 * Generate ECPay CheckMacValue.
 *
 * Algorithm:
 * 1. Remove CheckMacValue from params
 * 2. Sort params by key (A-Z)
 * 3. Concatenate as key1=value1&key2=value2
 * 4. Prepend HashKey={key}& and append &HashIV={iv}
 * 5. URL encode (ECPay specific rules)
 * 6. Convert to lowercase
 * 7. SHA256 hash
 * 8. Convert to uppercase
 */
export function generateEcpayCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string
): string {
  // 1. Remove CheckMacValue if present
  const { CheckMacValue: _, ...filteredParams } = params;

  // 2. Sort by key
  const sortedKeys = Object.keys(filteredParams).sort();

  // 3. Concatenate
  const queryString = sortedKeys.map((key) => `${key}=${filteredParams[key]}`).join('&');

  // 4. Add HashKey and HashIV
  const raw = `HashKey=${hashKey}&${queryString}&HashIV=${hashIV}`;

  // 5. URL encode
  const encoded = ecpayUrlEncode(raw);

  // 6. Convert to lowercase
  const lowered = encoded.toLowerCase();

  // 7-8. SHA256 and uppercase
  return createHash('sha256').update(lowered).digest('hex').toUpperCase();
}

/**
 * Validate ECPay CheckMacValue using timing-safe comparison.
 */
export function validateEcpayCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string
): boolean {
  const receivedCheckMac = params.CheckMacValue;

  if (!receivedCheckMac) {
    return false;
  }

  const calculatedCheckMac = generateEcpayCheckMacValue(params, hashKey, hashIV);

  // Timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(receivedCheckMac.toUpperCase()),
      Buffer.from(calculatedCheckMac)
    );
  } catch {
    // Length mismatch
    return false;
  }
}

// =============================================================================
// LINE Pay Signature Validation
// =============================================================================

/**
 * Generate LINE Pay signature.
 *
 * Algorithm:
 * Signature = Base64(HMAC-SHA256(channelSecret, channelSecret + uri + rawBody + nonce))
 */
export function generateLinePaySignature(
  rawBody: string,
  uri: string,
  channelSecret: string,
  nonce: string
): string {
  const message = channelSecret + uri + rawBody + nonce;

  return createHmac('sha256', channelSecret).update(message).digest('base64');
}

/**
 * Validate LINE Pay signature using timing-safe comparison.
 */
export function validateLinePaySignature(
  rawBody: string,
  uri: string,
  channelSecret: string,
  nonce: string,
  signature: string
): boolean {
  if (!signature || !nonce) {
    return false;
  }

  const calculatedSignature = generateLinePaySignature(rawBody, uri, channelSecret, nonce);

  // Timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
  } catch {
    // Length mismatch
    return false;
  }
}

// =============================================================================
// Event ID Builders (for Idempotency)
// =============================================================================

/**
 * Build ECPay event ID for idempotency.
 * Uses TradeNo (ECPay's transaction ID), falls back to MerchantTradeNo.
 */
export function buildEcpayEventId(params: ECPayParams): string {
  const primaryId = params.TradeNo || params.MerchantTradeNo;

  if (!primaryId) {
    throw new Error('Cannot build event ID: missing TradeNo and MerchantTradeNo');
  }

  return primaryId;
}

/**
 * Build LINE Pay event ID for idempotency.
 * Uses transactionId from the payload.
 */
export function buildLinePayEventId(payload: LinePayPayload): string {
  const transactionId = payload.transactionId;

  if (!transactionId) {
    throw new Error('Cannot build event ID: missing transactionId');
  }

  // Convert to string (transactionId may be a number in LINE Pay responses)
  return String(transactionId);
}

// =============================================================================
// Stripe Signature Validation
// =============================================================================

export interface StripeWebhookPayload {
  id: string;  // Event ID (e.g., evt_xxx)
  type: string;  // Event type (e.g., checkout.session.completed)
  data: {
    object: {
      id?: string;  // Session/Intent ID
      metadata?: {
        order_id?: string;
      };
      [key: string]: unknown;
    };
  };
  [key: string]: unknown;
}

/**
 * Compute Stripe webhook signature.
 * 
 * Algorithm:
 * 1. Build signed payload = timestamp + "." + rawBody
 * 2. Compute HMAC-SHA256(secret, signed_payload)
 * 3. Convert to hex
 */
export function computeStripeSignature(
  rawBody: string,
  timestamp: number,
  secret: string
): string {
  const signedPayload = `${timestamp}.${rawBody}`;
  return createHmac('sha256', secret).update(signedPayload).digest('hex');
}

/**
 * Parse Stripe signature header.
 * Format: t=timestamp,v1=signature,v0=signature (v1 is what we use)
 */
export function parseStripeSignatureHeader(header: string): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(',');
  let timestamp = 0;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = parseInt(value, 10);
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

/**
 * Validate Stripe webhook signature.
 * 
 * @param rawBody - The raw request body as a string
 * @param signatureHeader - The Stripe-Signature header value
 * @param webhookSecret - The webhook endpoint secret (whsec_xxx)
 * @param tolerance - Maximum age of the event in seconds (default 300 = 5 minutes)
 */
export function validateStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  tolerance: number = 300
): boolean {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) {
    return false;
  }

  const { timestamp, signatures } = parsed;

  // Check timestamp is within tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  // Compute expected signature
  const expectedSignature = computeStripeSignature(rawBody, timestamp, webhookSecret);

  // Check if any of the provided signatures match
  for (const sig of signatures) {
    try {
      if (timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))) {
        return true;
      }
    } catch {
      // Length mismatch, continue
    }
  }

  return false;
}

/**
 * Build Stripe event ID for idempotency.
 * Uses the event ID from the payload (evt_xxx).
 */
export function buildStripeEventId(payload: StripeWebhookPayload): string {
  if (!payload.id) {
    throw new Error('Cannot build event ID: missing id');
  }

  return payload.id;
}

/**
 * Extract order ID from Stripe webhook payload.
 * Looks in session/payment_intent metadata.order_id
 */
export function extractStripeOrderId(payload: StripeWebhookPayload): string | null {
  const orderId = payload.data?.object?.metadata?.order_id;
  return orderId || null;
}
