# Embeddings + Preprocessing (Cron + QStash)

> Canonical entry: `../RUNBOOK.md`

[Back to RUNBOOK index](../RUNBOOK.md)

> Last Updated: 2026-01-02  
> Status: Active  
> Scope: Embeddings / Similar Items / Preprocessing（admin-only）

This runbook explains how to enable the **Embeddings + Preprocessing pipeline** in production:

- Embedding generation (Supabase Edge Function)
- Preprocessing pipeline (clean → chunk → judge → optional rerank)
- Async processing via queue + cron dispatcher + worker endpoint
- Scheduled `similar_items` rebuild

> SSoT for behavior/contracts: `doc/SPEC.md` (high-level) + `specs/{completed,proposed}/*-spec.md` (deep technical specs).

---

## 0. Quick Checklist (Production)

- [ ] DB schema applied: `supabase/02_add/13_embeddings.sql` (includes `vector`, `embeddings`, `embedding_queue`, `similar_items`)
- [ ] Supabase Edge Function secrets configured:
  - `OPENAI_API_KEY` (Supabase Dashboard → Edge Functions → Secrets)
- [ ] Edge Functions deployed:
  - `supabase/functions/generate-embedding/`
  - `supabase/functions/judge-preprocessing/`
- [ ] Vercel env vars configured:
  - Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
  - Required for scheduling: `CRON_SECRET`, `WORKER_SECRET`
  - Optional (recommended): `QSTASH_*` (for async dispatch)
- [ ] Cron jobs configured:
  - `/api/cron/embedding-queue` (hourly recommended)
  - `/api/cron/similar-items` (daily recommended)
- [ ] Manual smoke test completed (see §5)

---

## 1. How It Works (Mental Model)

### 1.1 Queue + Dispatcher + Worker

- DB queue table: `public.embedding_queue`
- Dispatcher (cron): `/api/cron/embedding-queue`
  - claims items atomically (lease-based)
  - dispatches each item to worker
- Worker: `/api/worker/embedding-queue`
  - runs preprocessing + embedding generation
  - marks the queue item completed/failed (token-validated)

Deep spec: `doc/specs/completed/embedding-queue-dispatcher-worker-spec.md`

### 1.2 Similar Items Rebuild

- Precomputed table: `public.similar_items`
- Cron endpoint: `/api/cron/similar-items` (recommended daily)

---

## 2. Database Prerequisites

Apply schema via the DB scripts:

- One-shot full install: `npm run db:add` (recommended for fresh DB)
- Or per-feature (ensure dependencies are already applied): `npm run db -- add --feature embedding`

> See: [Database Operations](database-ops.md)

---

## 3. Secrets / Auth

### 3.1 Supabase Edge Functions Secrets (Supabase Dashboard)

- `OPENAI_API_KEY`

Used by:

- `supabase/functions/generate-embedding/` (embeddings API)
- `supabase/functions/judge-preprocessing/` (LLM-as-a-Judge)

### 3.2 App Runtime Secrets (Vercel / Server-only)

- `CRON_SECRET`: protects `/api/cron/*`
- `WORKER_SECRET`: protects `/api/worker/*` (emergency fallback when not using QStash signature)

Canonical security rules: `doc/SECURITY.md` §3.5

### 3.3 Optional: Upstash QStash (Recommended)

If configured, the dispatcher publishes each claimed queue item to QStash for reliable async delivery.

Vercel env vars:

```bash
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
```

Related code:

- Publish + verify: `lib/queue/qstash-io.ts`
- Worker auth priority: `app/api/worker/embedding-queue/route.ts`

---

## 4. Cron Jobs (Vercel)

Recommended schedules (match code comments):

- `/api/cron/embedding-queue`: hourly (e.g. `0 * * * *`)
- `/api/cron/similar-items`: daily (e.g. `0 4 * * *` UTC)

If you use `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/embedding-queue", "schedule": "0 * * * *" },
    { "path": "/api/cron/similar-items", "schedule": "0 4 * * *" }
  ]
}
```

---

## 5. Manual Verification (Smoke Test)

### 5.1 Hit Cron Endpoints (curl)

```bash
curl -i "https://your-domain.com/api/cron/embedding-queue" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -i "https://your-domain.com/api/cron/similar-items" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected behavior:

- `embedding-queue`: returns `No pending items` when queue is empty
- `similar-items`: logs work + returns summary counts

### 5.2 Verify DB State (SQL)

```sql
-- Queue backlog
select status, count(*)
from public.embedding_queue
group by status
order by status;

-- Latest embeddings
select target_type, count(*) as chunks
from public.embeddings
group by target_type
order by target_type;

-- Similar items health check
select target_type, count(*)
from public.similar_items
group by target_type
order by target_type;
```

---

## 6. Troubleshooting

### Unauthorized (401)

- Confirm `CRON_SECRET` (cron endpoints) / `WORKER_SECRET` (worker endpoint) are set and match headers.
- For QStash: ensure signing keys are configured and the request includes `Upstash-Signature`.

### No embeddings generated

- Supabase secrets missing: `OPENAI_API_KEY`
- Edge Functions not deployed
- Queue items stuck in `pending`: cron dispatcher isn’t running

---

## References

- Implemented behavior (SSoT): `doc/SPEC.md` → Embeddings / Preprocessing sections
- Queue dispatcher/worker spec: `doc/specs/completed/embedding-queue-dispatcher-worker-spec.md`
- Embeddings deep spec: `doc/specs/completed/embeddings-semantic-search-spec.md`
- Preprocessing deep spec: `doc/specs/completed/data-preprocessing-pipeline-spec.md`
- Security rules: `doc/SECURITY.md` §3.5
