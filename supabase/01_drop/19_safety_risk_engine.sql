-- ============================================
-- DROP: Safety Risk Engine Tables
-- ============================================
-- 
-- Version: 1.0
-- Last Updated: 2026-01-17
--
-- @see doc/specs/proposed/safety-risk-engine-spec.md
-- @see doc/meta/STEP_PLAN.md PR-1
--
-- ============================================


-- ============================================
-- DROP Policies First (must drop before tables)
-- ============================================

-- safety_corpus_items policies
DROP POLICY IF EXISTS "Admins can read safety corpus items" ON public.safety_corpus_items;
DROP POLICY IF EXISTS "Admins can manage safety corpus items" ON public.safety_corpus_items;

-- safety_settings policies
DROP POLICY IF EXISTS "Admins can read safety settings" ON public.safety_settings;
DROP POLICY IF EXISTS "Admins can manage safety settings" ON public.safety_settings;

-- comment_safety_assessments policies
DROP POLICY IF EXISTS "Admins can read safety assessments" ON public.comment_safety_assessments;
DROP POLICY IF EXISTS "Admins can update safety assessments" ON public.comment_safety_assessments;

-- safety_training_datasets policies
DROP POLICY IF EXISTS "Admins can read safety training datasets" ON public.safety_training_datasets;
DROP POLICY IF EXISTS "Admins can manage safety training datasets" ON public.safety_training_datasets;


-- ============================================
-- DROP Indexes
-- ============================================

-- safety_corpus_items indexes
DROP INDEX IF EXISTS public.idx_safety_corpus_items_status;
DROP INDEX IF EXISTS public.idx_safety_corpus_items_kind_status;
DROP INDEX IF EXISTS public.idx_safety_corpus_items_created;

-- comment_safety_assessments indexes
DROP INDEX IF EXISTS public.idx_comment_safety_assessments_comment;
DROP INDEX IF EXISTS public.idx_comment_safety_assessments_decision;
DROP INDEX IF EXISTS public.idx_comment_safety_assessments_created;
DROP INDEX IF EXISTS public.idx_comment_safety_assessments_human_reviewed_status;

-- safety_training_datasets indexes
DROP INDEX IF EXISTS public.idx_safety_training_datasets_created;
DROP INDEX IF EXISTS public.idx_safety_training_datasets_batch;
DROP INDEX IF EXISTS public.idx_safety_training_datasets_source_log;
DROP INDEX IF EXISTS public.uniq_safety_training_datasets_source_batch;

-- comment_moderation safety indexes
DROP INDEX IF EXISTS public.idx_comment_moderation_safety_decision;


-- ============================================
-- DROP FK Constraints from comment_moderation
-- ============================================

ALTER TABLE public.comment_moderation 
  DROP CONSTRAINT IF EXISTS fk_comment_moderation_safety_assessment;


-- ============================================
-- DROP Safety Columns from comment_moderation
-- ============================================

ALTER TABLE public.comment_moderation
  DROP COLUMN IF EXISTS safety_latest_assessment_id,
  DROP COLUMN IF EXISTS safety_latest_decision,
  DROP COLUMN IF EXISTS safety_latest_risk_level,
  DROP COLUMN IF EXISTS safety_latest_confidence;


-- ============================================
-- DROP Tables
-- ============================================

DROP TABLE IF EXISTS public.safety_training_datasets CASCADE;
DROP TABLE IF EXISTS public.comment_safety_assessments CASCADE;
DROP TABLE IF EXISTS public.safety_corpus_items CASCADE;
DROP TABLE IF EXISTS public.safety_settings CASCADE;


-- ============================================
-- Note: We do NOT drop or modify the embeddings/
-- embedding_queue target_type constraints here,
-- as they may have existing data with safety types.
-- Rollback should be done manually if needed.
-- ============================================


-- ============================================
-- 完成 DONE
-- ============================================
