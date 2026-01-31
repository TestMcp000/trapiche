-- ============================================
-- ADD: Embedding Module Tables (pgvector)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- 包含表格 TABLES:
-- - embeddings: Vector embeddings with chunking support
-- - embedding_queue: Async processing queue
-- - similar_items: Precomputed recommendations
--
-- 依賴 DEPENDENCIES:
-- - pgvector extension (enabled below)
-- - 01_main.sql (site_admins for RLS role check)
--
-- @see uiux_refactor.md §6.3 - Data Intelligence Platform (Module C)
-- @see doc/specs/completed/SUPABASE_AI.md - Full specification
--
-- ============================================


-- ============================================
-- PART 0: Enable pgvector Extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================
-- PART 1: embeddings (Vector Storage with Chunking)
-- ============================================
--
-- Main embedding storage table.
-- Supports chunking for long content.
-- One row per (target_type, target_id, chunk_index).
--
-- @see SUPABASE_AI.md §2.1.1 for schema design
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item', 'comment')),
  target_id UUID NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_total INT NOT NULL DEFAULT 1,
  embedding vector(1536) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  chunk_content TEXT,
  -- Full-text search vector (generated column for keyword search)
  -- @see SUPABASE_AI.md Phase 7
  chunk_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(chunk_content, ''))
  ) STORED,
  preprocessing_metadata JSONB,
  enrichment_metadata JSONB,
  quality_status VARCHAR(20) DEFAULT 'passed' CHECK (quality_status IN ('passed', 'incomplete', 'failed')),
  quality_score DECIMAL(3,2),
  quality_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(target_type, target_id, chunk_index)
);

-- Vector similarity index (IVFFlat for cosine similarity)
-- Note: IVFFlat requires the table to have data before creation in some cases
-- For empty tables, we create it anyway and it will work after data is inserted
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_embeddings_target ON public.embeddings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_quality ON public.embeddings(quality_status, quality_score);
CREATE INDEX IF NOT EXISTS idx_embeddings_created ON public.embeddings(created_at DESC);

-- GIN index for full-text search (keyword search)
-- @see SUPABASE_AI.md Phase 7
CREATE INDEX IF NOT EXISTS idx_embeddings_tsv ON public.embeddings USING GIN(chunk_tsv);


-- ============================================
-- PART 2: embedding_queue (Async Processing Queue)
-- ============================================
--
-- Queue for async embedding generation.
-- Edge Function / Cron job processes pending items.
--
-- @see SUPABASE_AI.md §4.3 for queue design
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item', 'comment')),
  target_id UUID NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT,
  quality_status VARCHAR(20),
  processing_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  processed_at TIMESTAMPTZ,
  -- Lease columns for concurrency control (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
  processing_token TEXT,
  lease_expires_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,

  UNIQUE(target_type, target_id)
);

-- Index for worker polling (priority DESC, created_at ASC for FIFO within priority)
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status 
  ON public.embedding_queue(status, priority DESC, created_at);

-- Partial index for efficient claim queries (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
CREATE INDEX IF NOT EXISTS idx_embedding_queue_claimable
  ON public.embedding_queue(status, lease_expires_at)
  WHERE status IN ('pending', 'processing');


-- ============================================
-- PART 3: similar_items (Precomputed Recommendations)
-- ============================================
--
-- Precomputed Top-N similar items per target.
-- Computed by daily Cron job, not query-time.
--
-- @see SUPABASE_AI.md §3.2.0 for design
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.similar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('post', 'gallery_item')),
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item')),
  target_id UUID NOT NULL,
  similarity_score DECIMAL(4,3) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 10),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(source_type, source_id, target_type, target_id)
);

-- Index for fetching similar items by source
CREATE INDEX IF NOT EXISTS idx_similar_items_source 
  ON public.similar_items(source_type, source_id, rank);

-- Index for cleanup/refresh queries
CREATE INDEX IF NOT EXISTS idx_similar_items_computed 
  ON public.similar_items(computed_at);


-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.similar_items ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 5: RLS Policies - embeddings
-- ============================================
--
-- Admin-only access (Owner/Editor).
-- No public read of raw embeddings (privacy).
--
-- ============================================

-- Admin SELECT only
CREATE POLICY "Admins can read embeddings"
  ON public.embeddings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admin ALL (for housekeeping)
CREATE POLICY "Admins can manage embeddings"
  ON public.embeddings FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 6: RLS Policies - embedding_queue
-- ============================================
--
-- Admin-only access (Owner/Editor).
-- Service role used for actual processing.
--
-- ============================================

-- Admin SELECT only
CREATE POLICY "Admins can read embedding queue"
  ON public.embedding_queue FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admin ALL (for manual retry/housekeeping)
CREATE POLICY "Admins can manage embedding queue"
  ON public.embedding_queue FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 7: RLS Policies - similar_items
-- ============================================
--
-- Public read (for post/gallery pages).
-- Admin-only write (computed by Cron).
--
-- ============================================

-- Public SELECT (for similar posts/gallery items)
CREATE POLICY "Anyone can read similar items"
  ON public.similar_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin write (Cron job uses service_role, but admin can manually adjust)
CREATE POLICY "Admins can manage similar items"
  ON public.similar_items FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 8: Grant Permissions
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
--
-- ============================================

-- embeddings: authenticated can SELECT (RLS enforces admin-only)
-- Service role handles INSERT/UPDATE/DELETE
GRANT SELECT ON public.embeddings TO authenticated;

-- embedding_queue: authenticated can SELECT (RLS enforces admin-only)
-- Service role handles INSERT/UPDATE/DELETE
GRANT SELECT ON public.embedding_queue TO authenticated;

-- similar_items: anon + authenticated can SELECT (public read)
-- Service role handles INSERT/UPDATE/DELETE
GRANT SELECT ON public.similar_items TO anon;
GRANT SELECT ON public.similar_items TO authenticated;


-- ============================================
-- PART 9: search_logs (Search Analytics)
-- ============================================
--
-- Log table for tracking search queries.
-- Used for analytics and low-quality query identification.
--
-- @see SUPABASE_AI.md Phase 8: Search Analytics
-- @see uiux_refactor.md §4 item 8
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('semantic', 'keyword', 'hybrid')),
  weights JSONB,  -- { semanticWeight: 0.7, keywordWeight: 0.3 } for hybrid mode
  threshold DECIMAL(3,2),
  result_limit INT,
  target_types TEXT[],
  results_count INT NOT NULL DEFAULT 0,
  top_score DECIMAL(4,3),  -- Highest score from results
  is_low_quality BOOLEAN NOT NULL DEFAULT false,  -- results_count = 0 OR top_score < threshold
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  metadata JSONB  -- Additional context (e.g., error_message, search_duration_ms)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_low_quality ON public.search_logs(is_low_quality, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_mode ON public.search_logs(mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_by ON public.search_logs(created_by, created_at DESC);

-- RLS for search_logs
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Admin SELECT only (Owner/Editor can view analytics)
CREATE POLICY "Admins can read search logs"
  ON public.search_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admin INSERT (search actions insert via server)
CREATE POLICY "Admins can insert search logs"
  ON public.search_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Owner-only DELETE (for cleanup)
CREATE POLICY "Owner can delete search logs"
  ON public.search_logs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Grant permissions
GRANT SELECT, INSERT ON public.search_logs TO authenticated;


-- ============================================
-- PART 10: Search RPC Functions
-- ============================================
--
-- RPC functions for semantic and keyword search.
-- SECURITY DEFINER to allow search without direct table access.
--
-- @see SUPABASE_AI.md Phase 7 for hybrid search design
--
-- ============================================

-- Semantic search RPC (vector similarity)
-- Used by lib/modules/embedding/embedding-search-io.ts
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_types text[]
)
RETURNS TABLE(
  target_type text,
  target_id uuid,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.target_type::text,
    e.target_id,
    e.chunk_index,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM public.embeddings e
  WHERE e.target_type = ANY(filter_types)
    AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    AND e.quality_status = 'passed'
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Keyword search RPC (PostgreSQL Full-Text Search)
-- Used by lib/modules/embedding/embedding-search-io.ts
-- @see SUPABASE_AI.md Phase 7
CREATE OR REPLACE FUNCTION public.search_embeddings_keyword(
  query_text text,
  result_limit int,
  filter_types text[]
)
RETURNS TABLE(
  target_type text,
  target_id uuid,
  chunk_index int,
  ts_rank float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsquery_value tsquery;
BEGIN
  -- Convert query text to tsquery using plainto_tsquery for safer handling
  tsquery_value := plainto_tsquery('english', query_text);
  
  -- Return empty if query is empty
  IF tsquery_value IS NULL OR tsquery_value = ''::tsquery THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    e.target_type::text,
    e.target_id,
    e.chunk_index,
    ts_rank(e.chunk_tsv, tsquery_value)::float AS ts_rank
  FROM public.embeddings e
  WHERE e.target_type = ANY(filter_types)
    AND e.chunk_tsv @@ tsquery_value
    AND e.quality_status = 'passed'
  ORDER BY ts_rank DESC
  LIMIT result_limit;
END;
$$;

-- P0 Security: Lock down SECURITY DEFINER RPCs (service_role only)
REVOKE ALL ON FUNCTION public.match_embeddings(vector(1536), float, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_embeddings(vector(1536), float, int, text[]) TO service_role;

REVOKE ALL ON FUNCTION public.search_embeddings_keyword(text, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_embeddings_keyword(text, int, text[]) TO service_role;


-- ============================================
-- PART 11: Claim Queue Items RPC (Lease Mechanism)
-- ============================================
--
-- Atomically claim pending or stale-leased queue items.
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions.
--
-- @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md for design spec
--
-- ============================================

CREATE OR REPLACE FUNCTION public.claim_embedding_queue_items(
  claim_limit INT DEFAULT 5,
  lease_seconds INT DEFAULT 120
)
RETURNS TABLE(
  target_type TEXT,
  target_id UUID,
  processing_token TEXT,
  lease_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  new_lease_expires TIMESTAMPTZ;
BEGIN
  -- Generate token and lease expiry
  new_token := gen_random_uuid()::TEXT;
  new_lease_expires := NOW() + (lease_seconds || ' seconds')::INTERVAL;
  
  RETURN QUERY
  WITH claimable AS (
    SELECT q.id, q.target_type AS t_type, q.target_id AS t_id
    FROM public.embedding_queue q
    WHERE (
      -- Pending items
      q.status = 'pending'
      -- OR processing but lease expired (stale)
      OR (q.status = 'processing' AND q.lease_expires_at < NOW())
    )
    AND q.attempts < 3  -- Max retries
    ORDER BY q.priority DESC, q.created_at ASC
    LIMIT claim_limit
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.embedding_queue eq
    SET
      status = 'processing',
      attempts = eq.attempts + 1,
      processing_token = new_token,
      lease_expires_at = new_lease_expires,
      processing_started_at = NOW(),
      error_message = NULL
    FROM claimable c
    WHERE eq.id = c.id
    RETURNING eq.target_type, eq.target_id, eq.processing_token, eq.lease_expires_at
  )
  SELECT u.target_type::TEXT, u.target_id, u.processing_token, u.lease_expires_at
  FROM updated u;
END;
$$;

-- P0 Security: Lock down claim RPC (service_role only)
REVOKE ALL ON FUNCTION public.claim_embedding_queue_items(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_embedding_queue_items(INT, INT) TO service_role;


-- ============================================
-- 完成 DONE
-- ============================================

