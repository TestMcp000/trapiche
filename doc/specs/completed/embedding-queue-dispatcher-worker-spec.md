# Embedding Queue Orchestration Spec (Dispatcher / Worker)

> Status: Stable (referenced by in-code `@see`; keep headings stable)

This spec defines how the project processes `embedding_queue` items asynchronously with **lease-based claiming**, optional **QStash dispatch**, and a **worker endpoint** that runs the preprocessing + embedding use case.

## 1. Components (SSoT paths)

- Queue schema + claim RPC: `supabase/02_add/13_embeddings.sql` (`embedding_queue`, `claim_embedding_queue_items`)
- Cron dispatcher endpoint: `app/api/cron/embedding-queue/route.ts`
- Worker endpoint: `app/api/worker/embedding-queue/route.ts`
- Queue IO (claim + token-validated updates): `lib/modules/embedding/embedding-generate-io.ts`
- QStash IO (publish + signature verify): `lib/queue/qstash-io.ts`
- Use case (preprocess → embed → queue status): `lib/modules/preprocessing/preprocess-use-case-io.ts`

## 2. Security Model

- **Dispatcher auth**: `CRON_SECRET` (Vercel Cron `Authorization: Bearer ...` or `x-cron-secret`)
- **Worker auth (priority)**:
  1. QStash signature (`Upstash-Signature`)
  2. `WORKER_SECRET` header (emergency fallback)
  3. Dev bypass (only if no secrets configured)

## 3. Lease + Processing Token (Concurrency Control)

- Claiming is done via the `claim_embedding_queue_items` RPC.
- Each claimed row receives:
  - `processing_token` (opaque token returned to the dispatcher/worker)
  - `lease_expires_at` (TTL-based re-claim window)
  - `processing_started_at` (observability)
- Any completion update must be **token-validated** (`WHERE processing_token = <token>`) to avoid double-processing if the lease was stolen/reclaimed.

## 4. Dispatch Flow (Happy Path)

1. Cron endpoint claims up to N items via RPC (lease-based).
2. For each item, dispatcher publishes to worker:
   - Primary: QStash (with `deduplicationId = <targetType>:<targetId>:<processingToken>`)
   - Fallback: direct `fetch()` to the worker endpoint (with `WORKER_SECRET`)
3. Worker validates auth + parses input + runs the preprocess/embedding use case.
4. Worker marks queue item `completed`/`failed` using token-validated update.

## 5. Idempotency + Cleanup

- Before re-embedding, the use case compares existing `embeddings` chunk hashes to the newly computed chunk hashes.
- When content shrinks, worker deletes stale chunks (`chunk_index >= newChunkCount`) after successful completion.

## 6. Related Docs

- Design (queue + orchestration):
  - `doc/specs/completed/embeddings-semantic-search-spec.md` (§4.3 Queue processing)
  - `doc/specs/completed/data-preprocessing-pipeline-spec.md` (§6 Orchestration)
- Implementation logs:
  - `doc/archive/2025-12-31-admin-performance-archive.md` (cron/worker split)
