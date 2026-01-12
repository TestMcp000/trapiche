import 'server-only';

/**
 * Embedding Queue Worker Endpoint
 *
 * Handles heavy preprocessing + embedding generation tasks.
 * Called by QStash (or cron dispatcher) to process individual queue items.
 *
 * Authentication priority:
 * 1. QStash signature (Upstash-Signature header)
 * 2. WORKER_SECRET (emergency fallback)
 * 3. Development mode bypass
 *
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 * @see ARCHITECTURE.md §3.7 - API Route IO Guardrails
 */

import { NextResponse } from 'next/server';
import { runPreprocessUseCase } from '@/lib/modules/preprocessing/preprocess-use-case-io';
import {
  verifyQStashSignature,
  isQStashVerificationConfigured,
} from '@/lib/queue/qstash-io';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

// =============================================================================
// Configuration
// =============================================================================

/** Force dynamic rendering (no static optimization) */
export const dynamic = 'force-dynamic';

/** Maximum execution time for worker processing */
export const maxDuration = 60;

// =============================================================================
// Authentication
// =============================================================================

/** Authentication source for logging/observability */
type AuthSource = 'qstash' | 'worker_secret' | 'dev';

interface AuthResult {
  valid: boolean;
  source?: AuthSource;
  error?: string;
}

/**
 * Validate worker request authentication.
 *
 * Priority:
 * 1. QStash signature verification (Upstash-Signature header)
 * 2. WORKER_SECRET header (emergency fallback)
 * 3. Development mode bypass
 *
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
async function validateWorkerAuth(request: Request, rawBody: string): Promise<AuthResult> {
  // 1. Try QStash signature verification first
  const qstashSignature =
    request.headers.get('upstash-signature') || request.headers.get('Upstash-Signature');

  if (qstashSignature && isQStashVerificationConfigured()) {
    const verifyResult = await verifyQStashSignature(qstashSignature, rawBody);
    if (verifyResult.valid) {
      return { valid: true, source: 'qstash' };
    }
    // If QStash signature is present but invalid, log but continue to fallback
    console.warn(`[Worker] QStash signature verification failed: ${verifyResult.error}`);
  }

  // 2. Fall back to WORKER_SECRET (emergency backdoor)
  const workerSecret = process.env.WORKER_SECRET;
  if (workerSecret) {
    const customHeader = request.headers.get('x-worker-secret');
    if (customHeader === workerSecret) {
      return { valid: true, source: 'worker_secret' };
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${workerSecret}`) {
      return { valid: true, source: 'worker_secret' };
    }
  }

  // 3. Development mode bypass
  if (process.env.NODE_ENV === 'development' && !workerSecret && !isQStashVerificationConfigured()) {
    console.warn('[Worker] No authentication configured, allowing in development mode');
    return { valid: true, source: 'dev' };
  }

  return {
    valid: false,
    error: 'No valid authentication: QStash signature or WORKER_SECRET required',
  };
}

// =============================================================================
// Input Validation
// =============================================================================

const VALID_TARGET_TYPES: EmbeddingTargetType[] = ['product', 'post', 'gallery_item', 'comment'];

interface WorkerInput {
  targetType: EmbeddingTargetType;
  targetId: string;
  runId?: string;
  /** Processing token from claim RPC (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md) */
  processingToken?: string;
}

function validateInput(body: unknown): { valid: true; input: WorkerInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const { targetType, targetId, runId, processingToken } = body as Record<string, unknown>;

  if (typeof targetType !== 'string' || !VALID_TARGET_TYPES.includes(targetType as EmbeddingTargetType)) {
    return { valid: false, error: `Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(', ')}` };
  }

  if (typeof targetId !== 'string' || targetId.length === 0) {
    return { valid: false, error: 'targetId must be a non-empty string' };
  }

  // UUID validation (simple pattern check)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(targetId)) {
    return { valid: false, error: 'targetId must be a valid UUID' };
  }

  return {
    valid: true,
    input: {
      targetType: targetType as EmbeddingTargetType,
      targetId,
      runId: typeof runId === 'string' ? runId : undefined,
      processingToken: typeof processingToken === 'string' ? processingToken : undefined,
    },
  };
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: Request) {
  try {
    // Read raw body first (required for signature verification)
    // @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
    const rawBody = await request.text();

    // Validate authentication
    const authResult = await validateWorkerAuth(request, rawBody);
    if (!authResult.valid) {
      console.warn(`[Worker] Auth failed: ${authResult.error}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body after auth (we already have raw text)
    const body = JSON.parse(rawBody);

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { targetType, targetId, runId, processingToken } = validation.input;

    console.log(
      `[Worker] Processing ${targetType}/${targetId} (runId=${runId ?? 'none'}, hasToken=${!!processingToken}, auth=${authResult.source})`
    );

    // Delegate to use case with token for lease validation
    const result = await runPreprocessUseCase({
      targetType,
      targetId,
      source: 'cron',
      runId,
      processingToken,
    });

    return NextResponse.json({
      success: result.success,
      targetType,
      targetId,
      chunksTotal: result.chunksTotal,
      chunksQualified: result.chunksQualified,
      chunksEmbedded: result.chunksEmbedded,
      durationMs: result.durationMs,
      error: result.error,
      skippedIdempotent: result.skippedIdempotent,
    });
  } catch (error) {
    // Handle JSON parse errors specifically
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    console.error('[Worker] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
