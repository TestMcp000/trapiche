-- ============================================
-- DROP: Embedding Module Tables (pgvector)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- @see uiux_refactor.md §6.3 - Data Intelligence Platform (Module C)
--
-- ============================================


-- ============================================
-- DROP Policies First (must drop before tables)
-- ============================================

-- embeddings policies
DROP POLICY IF EXISTS "Admins can read embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Admins can manage embeddings" ON public.embeddings;

-- embedding_queue policies
DROP POLICY IF EXISTS "Admins can read embedding queue" ON public.embedding_queue;
DROP POLICY IF EXISTS "Admins can manage embedding queue" ON public.embedding_queue;

-- similar_items policies
DROP POLICY IF EXISTS "Anyone can read similar items" ON public.similar_items;
DROP POLICY IF EXISTS "Admins can manage similar items" ON public.similar_items;

-- search_logs policies
DROP POLICY IF EXISTS "Admins can read search logs" ON public.search_logs;
DROP POLICY IF EXISTS "Admins can insert search logs" ON public.search_logs;
DROP POLICY IF EXISTS "Owner can delete search logs" ON public.search_logs;


-- ============================================
-- DROP Indexes (CASCADE will handle, but explicit for clarity)
-- ============================================

DROP INDEX IF EXISTS public.idx_embeddings_vector;
DROP INDEX IF EXISTS public.idx_embeddings_target;
DROP INDEX IF EXISTS public.idx_embeddings_quality;
DROP INDEX IF EXISTS public.idx_embeddings_created;
DROP INDEX IF EXISTS public.idx_embeddings_tsv;
DROP INDEX IF EXISTS public.idx_embedding_queue_status;
DROP INDEX IF EXISTS public.idx_embedding_queue_claimable;
DROP INDEX IF EXISTS public.idx_similar_items_source;
DROP INDEX IF EXISTS public.idx_similar_items_computed;
DROP INDEX IF EXISTS public.idx_search_logs_created;
DROP INDEX IF EXISTS public.idx_search_logs_low_quality;
DROP INDEX IF EXISTS public.idx_search_logs_mode;
DROP INDEX IF EXISTS public.idx_search_logs_created_by;


-- ============================================
-- DROP RPC Functions
-- ============================================

DROP FUNCTION IF EXISTS public.match_embeddings(vector(1536), float, int, text[]);
DROP FUNCTION IF EXISTS public.search_embeddings_keyword(text, int, text[]);
DROP FUNCTION IF EXISTS public.claim_embedding_queue_items(int, int);


-- ============================================
-- DROP Tables
-- ============================================

DROP TABLE IF EXISTS public.search_logs CASCADE;
DROP TABLE IF EXISTS public.similar_items CASCADE;
DROP TABLE IF EXISTS public.embedding_queue CASCADE;
DROP TABLE IF EXISTS public.embeddings CASCADE;


-- ============================================
-- Note: We do NOT drop the vector extension
-- as it may be used by other features.
-- ============================================


-- ============================================
-- 完成 DONE
-- ============================================
