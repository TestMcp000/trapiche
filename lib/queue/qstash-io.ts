import 'server-only';

/**
 * QStash IO Module
 *
 * Server-only module for Upstash QStash operations.
 * Handles publishing embedding queue items to QStash for async processing.
 *
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 * @see ARCHITECTURE.md §3.4 — IO module conventions
 */

import { Client, Receiver } from '@upstash/qstash';

// =============================================================================
// Configuration
// =============================================================================

/** QStash publish configuration */
const QSTASH_CONFIG = {
  /** Number of retries for failed deliveries */
  retries: 3,
  /** Timeout for worker processing (matches worker maxDuration=60) */
  timeout: '60s',
} as const;

// =============================================================================
// Client Initialization
// =============================================================================

/**
 * Lazy-initialized QStash client.
 * Returns null if QSTASH_TOKEN is not configured.
 */
function getQStashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    console.warn('[QStash] QSTASH_TOKEN not configured');
    return null;
  }
  return new Client({ token });
}

/**
 * Lazy-initialized QStash receiver for signature verification.
 * Returns null if signing keys are not configured.
 */
function getQStashReceiver(): Receiver | null {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey || !nextKey) {
    console.warn('[QStash] QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY not configured');
    return null;
  }

  return new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });
}

// =============================================================================
// Types
// =============================================================================

/** Input for publishing an embedding queue item */
export interface PublishEmbeddingQueueItemInput {
  /** Full URL of the worker endpoint */
  url: string;
  /** Type of content to process */
  targetType: string;
  /** ID of the content item */
  targetId: string;
  /** Processing token for lease validation */
  processingToken: string;
  /** Run ID for tracing */
  runId: string;
}

/** Result of publishing an embedding queue item */
export interface PublishEmbeddingQueueItemResult {
  /** Whether the publish was successful */
  success: boolean;
  /** QStash message ID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/** Result of signature verification */
export interface VerifySignatureResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

// =============================================================================
// Publish Operations
// =============================================================================

/**
 * Publish an embedding queue item to QStash.
 *
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
export async function publishEmbeddingQueueItem(
  input: PublishEmbeddingQueueItemInput
): Promise<PublishEmbeddingQueueItemResult> {
  const client = getQStashClient();

  if (!client) {
    return {
      success: false,
      error: 'QStash client not configured (missing QSTASH_TOKEN)',
    };
  }

  const { url, targetType, targetId, processingToken, runId } = input;

  // Build deduplication ID to prevent duplicate processing
  // @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
  const deduplicationId = `${targetType}:${targetId}:${processingToken}`;

  try {
    const result = await client.publishJSON({
      url,
      body: {
        targetType,
        targetId,
        processingToken,
        runId,
      },
      retries: QSTASH_CONFIG.retries,
      timeout: QSTASH_CONFIG.timeout,
      deduplicationId,
    });

    console.log(`[QStash] Published message: ${result.messageId} (dedupeId=${deduplicationId})`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[QStash] Failed to publish: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify QStash signature on incoming webhook request.
 *
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 *
 * @param signature - The Upstash-Signature header value
 * @param rawBody - The raw request body as string
 * @returns Verification result
 */
export async function verifyQStashSignature(
  signature: string,
  rawBody: string
): Promise<VerifySignatureResult> {
  const receiver = getQStashReceiver();

  if (!receiver) {
    return {
      valid: false,
      error: 'QStash receiver not configured (missing signing keys)',
    };
  }

  try {
    const isValid = await receiver.verify({
      signature,
      body: rawBody,
    });

    return { valid: isValid };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Verification failed';
    console.error(`[QStash] Signature verification failed: ${errorMessage}`);

    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if QStash is configured for publishing.
 */
export function isQStashConfigured(): boolean {
  return !!process.env.QSTASH_TOKEN;
}

/**
 * Check if QStash signature verification is configured.
 */
export function isQStashVerificationConfigured(): boolean {
  return !!(process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY);
}
