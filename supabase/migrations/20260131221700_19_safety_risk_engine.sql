-- ============================================
-- ADD: Safety Risk Engine Tables
-- ============================================
-- 
-- Version: 1.1
-- Last Updated: 2026-01-17
--
-- Tables:
-- - safety_corpus_items: RAG corpus SSOT (slang/cases)
-- - safety_settings: Singleton configuration
-- - comment_safety_assessments: Audit history
-- - safety_training_datasets: Curated fine-tuning dataset (ETL target)
--
-- Dependencies:
-- - 01_main.sql (auth.users reference)
-- - 02_comments.sql (comments.id FK)
--
-- @see doc/specs/completed/safety-risk-engine-spec.md §9
-- @see doc/meta/STEP_PLAN.md PR-1
--
-- ============================================


-- ============================================
-- PART 1: safety_corpus_items (RAG Corpus SSOT)
-- ============================================
--
-- Manages slang dictionary and historical cases for RAG.
-- Status flow: draft → active → deprecated
-- Only 'active' records are used by RAG queries.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_corpus_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('slang', 'case')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_safety_corpus_items_status 
  ON public.safety_corpus_items(status);
CREATE INDEX IF NOT EXISTS idx_safety_corpus_items_kind_status 
  ON public.safety_corpus_items(kind, status);
CREATE INDEX IF NOT EXISTS idx_safety_corpus_items_created 
  ON public.safety_corpus_items(created_at DESC);


-- ============================================
-- PART 2: safety_settings (Singleton Configuration)
-- ============================================
--
-- Centralized settings for safety risk engine.
-- Singleton pattern: id=1 is the only valid row.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  model_id TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  timeout_ms INTEGER NOT NULL DEFAULT 1500,
  risk_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  training_active_batch VARCHAR(50) NOT NULL DEFAULT '2026-01_cold_start',
  held_message TEXT NOT NULL DEFAULT 'Your comment is being reviewed.',
  rejected_message TEXT NOT NULL DEFAULT 'Your comment could not be posted.',
  layer1_blocklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Ensure default stays aligned (idempotent migration)
ALTER TABLE public.safety_settings
  ALTER COLUMN model_id SET DEFAULT 'gemini-1.5-flash';
ALTER TABLE public.safety_settings
  ADD COLUMN IF NOT EXISTS training_active_batch VARCHAR(50) NOT NULL DEFAULT '2026-01_cold_start';


-- ============================================
-- PART 3: comment_safety_assessments (Audit History)
-- ============================================
--
-- Stores complete safety assessment records for auditing.
-- Each comment may have multiple assessments over time.
-- Latest assessment is referenced by comment_moderation.safety_latest_assessment_id
--
-- @see safety-risk-engine-spec.md §5.2
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.comment_safety_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'HELD', 'REJECTED')),

  -- Layer 1: Keyword/Rule hit
  layer1_hit TEXT,

  -- Layer 2: RAG context (top-k matches)
  layer2_context JSONB DEFAULT '[]'::jsonb,

  -- Layer 3: LLM output
  provider VARCHAR(50) DEFAULT 'gemini',
  model_id TEXT,
  ai_risk_level VARCHAR(20) CHECK (ai_risk_level IS NULL OR ai_risk_level IN ('Safe', 'High_Risk', 'Uncertain')),
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  ai_reason TEXT,
  latency_ms INTEGER,

  -- Feedback loop (human review)
  human_label VARCHAR(30) CHECK (human_label IS NULL OR human_label IN (
    'True_Positive', 'False_Positive', 'True_Negative', 'False_Negative'
  )),
  human_reviewed_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (human_reviewed_status IN (
    'pending', 'verified_safe', 'verified_risk', 'corrected'
  )),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

-- Ensure ETL source column exists (idempotent migration)
ALTER TABLE public.comment_safety_assessments
  ADD COLUMN IF NOT EXISTS human_reviewed_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (human_reviewed_status IN (
    'pending', 'verified_safe', 'verified_risk', 'corrected'
  ));

-- Indexes for queue queries
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_comment 
  ON public.comment_safety_assessments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_decision 
  ON public.comment_safety_assessments(decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_created 
  ON public.comment_safety_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_human_reviewed_status
  ON public.comment_safety_assessments(human_reviewed_status, created_at DESC);


-- ============================================
-- PART 4: safety_training_datasets (Fine-tuning Dataset)
-- ============================================
--
-- Curated training samples for Gemini fine-tuning.
-- Decoupled from operational logs (comment_safety_assessments).
--
-- @see safety-risk-engine-spec.md §9.6
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_messages JSONB NOT NULL CONSTRAINT safety_training_datasets_input_messages_is_array_check CHECK (jsonb_typeof(input_messages) = 'array'),
  output_json JSONB NOT NULL CONSTRAINT safety_training_datasets_output_json_is_object_check CHECK (jsonb_typeof(output_json) = 'object'),
  source_log_id UUID REFERENCES public.comment_safety_assessments(id) ON DELETE SET NULL,
  dataset_batch VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Option C migration: upgrade legacy columns (input_text/output_json TEXT) to JSONB messages
ALTER TABLE public.safety_training_datasets
  ADD COLUMN IF NOT EXISTS input_messages JSONB;

DO $$
BEGIN
  -- Ensure dataset_batch exists (legacy tables may differ)
  ALTER TABLE public.safety_training_datasets
    ADD COLUMN IF NOT EXISTS dataset_batch VARCHAR(50);

  -- Ensure output_json is JSONB (legacy was TEXT)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'safety_training_datasets'
      AND column_name = 'output_json'
      AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE public.safety_training_datasets
      ALTER COLUMN output_json TYPE JSONB USING output_json::jsonb;
  END IF;

  -- Backfill input_messages from legacy input_text when possible
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'safety_training_datasets'
      AND column_name = 'input_text'
  ) THEN
    UPDATE public.safety_training_datasets
    SET input_messages = CASE
      WHEN input_text LIKE '[SYSTEM]%' AND position(E'\n\n[USER]\n' IN input_text) > 0 THEN
        jsonb_build_array(
          jsonb_build_object(
            'role', 'system',
            'content', replace(split_part(input_text, E'\n\n[USER]\n', 1), E'[SYSTEM]\n', '')
          ),
          jsonb_build_object(
            'role', 'user',
            'content', split_part(input_text, E'\n\n[USER]\n', 2)
          )
        )
      ELSE
        jsonb_build_array(jsonb_build_object('role', 'user', 'content', input_text))
    END
    WHERE input_messages IS NULL AND input_text IS NOT NULL;
  END IF;

  -- Fill any remaining NULLs with a minimal placeholder to satisfy NOT NULL
  UPDATE public.safety_training_datasets
  SET input_messages = jsonb_build_array(jsonb_build_object('role', 'user', 'content', ''))
  WHERE input_messages IS NULL;

  -- Enforce NOT NULL for input_messages
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN input_messages SET NOT NULL;

  -- Backfill dataset_batch (avoid NULL which breaks dedupe/cleanup workflows)
  UPDATE public.safety_training_datasets
  SET dataset_batch = COALESCE(
    dataset_batch,
    (SELECT training_active_batch FROM public.safety_settings WHERE id = 1 LIMIT 1),
    'legacy'
  )
  WHERE dataset_batch IS NULL;

  -- Enforce NOT NULL for dataset_batch
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN dataset_batch SET NOT NULL;

  -- Ensure output_json is NOT NULL
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN output_json SET NOT NULL;

  -- Ensure check constraints exist (legacy tables created without named constraints)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'safety_training_datasets_input_messages_is_array_check'
  ) THEN
    ALTER TABLE public.safety_training_datasets
      ADD CONSTRAINT safety_training_datasets_input_messages_is_array_check
      CHECK (jsonb_typeof(input_messages) = 'array');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'safety_training_datasets_output_json_is_object_check'
  ) THEN
    ALTER TABLE public.safety_training_datasets
      ADD CONSTRAINT safety_training_datasets_output_json_is_object_check
      CHECK (jsonb_typeof(output_json) = 'object');
  END IF;

  -- Remove legacy default to avoid accidental hardcoding
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN dataset_batch DROP DEFAULT;
END $$;

-- Drop legacy column after backfill (Option C is input_messages-only)
ALTER TABLE public.safety_training_datasets
  DROP COLUMN IF EXISTS input_text;

-- Indexes for export/selection workflows
CREATE INDEX IF NOT EXISTS idx_safety_training_datasets_created
  ON public.safety_training_datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_training_datasets_batch
  ON public.safety_training_datasets(dataset_batch, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_training_datasets_source_log
  ON public.safety_training_datasets(source_log_id);

-- Dedupe: avoid promoting the same source into the same batch twice
CREATE UNIQUE INDEX IF NOT EXISTS uniq_safety_training_datasets_source_batch
  ON public.safety_training_datasets(source_log_id, dataset_batch);


-- ============================================
-- PART 5: Extend comment_moderation (Safety Pointers)
-- ============================================
--
-- Add pointer columns for quick admin list queries.
-- Avoids joins to comment_safety_assessments for common filters.
--
-- ============================================

ALTER TABLE public.comment_moderation
  ADD COLUMN IF NOT EXISTS safety_latest_assessment_id UUID,
  ADD COLUMN IF NOT EXISTS safety_latest_decision VARCHAR(20),
  ADD COLUMN IF NOT EXISTS safety_latest_risk_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS safety_latest_confidence NUMERIC(4,3);

-- FK constraint (separate ALTER to handle IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_comment_moderation_safety_assessment'
    AND table_name = 'comment_moderation'
  ) THEN
    ALTER TABLE public.comment_moderation
      ADD CONSTRAINT fk_comment_moderation_safety_assessment
      FOREIGN KEY (safety_latest_assessment_id) 
      REFERENCES public.comment_safety_assessments(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Index for safety queue filtering
CREATE INDEX IF NOT EXISTS idx_comment_moderation_safety_decision 
  ON public.comment_moderation(safety_latest_decision);


-- ============================================
-- PART 6: Update embeddings target_type CHECK constraint
-- ============================================
--
-- Extend to include safety_slang and safety_case.
--
-- ============================================

ALTER TABLE public.embeddings 
  DROP CONSTRAINT IF EXISTS embeddings_target_type_check;
ALTER TABLE public.embeddings 
  ADD CONSTRAINT embeddings_target_type_check 
  CHECK (target_type IN ('post', 'gallery_item', 'comment', 'safety_slang', 'safety_case'));


-- ============================================
-- PART 7: Update embedding_queue target_type CHECK constraint
-- ============================================
--
-- Extend to include safety_slang and safety_case.
--
-- ============================================

ALTER TABLE public.embedding_queue 
  DROP CONSTRAINT IF EXISTS embedding_queue_target_type_check;
ALTER TABLE public.embedding_queue 
  ADD CONSTRAINT embedding_queue_target_type_check 
  CHECK (target_type IN ('post', 'gallery_item', 'comment', 'safety_slang', 'safety_case'));


-- ============================================
-- PART 8: Enable RLS
-- ============================================

ALTER TABLE public.safety_corpus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_safety_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_training_datasets ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 9: RLS Policies - safety_corpus_items
-- ============================================
--
-- Admin-only (Owner/Editor).
--
-- ============================================

CREATE POLICY "Admins can read safety corpus items"
  ON public.safety_corpus_items FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage safety corpus items"
  ON public.safety_corpus_items FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 10: RLS Policies - safety_settings
-- ============================================
--
-- Admin-only (Owner/Editor).
--
-- ============================================

CREATE POLICY "Admins can read safety settings"
  ON public.safety_settings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage safety settings"
  ON public.safety_settings FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 11: RLS Policies - comment_safety_assessments
-- ============================================
--
-- Admin read (Owner/Editor).
-- INSERT/UPDATE by service_role (comment submit path).
-- Admin can UPDATE for human_label fields.
--
-- ============================================

CREATE POLICY "Admins can read safety assessments"
  ON public.comment_safety_assessments FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can update safety assessments"
  ON public.comment_safety_assessments FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 12: RLS Policies - safety_training_datasets
-- ============================================
--
-- Admin-only (Owner/Editor).
--
-- ============================================

CREATE POLICY "Admins can read safety training datasets"
  ON public.safety_training_datasets FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage safety training datasets"
  ON public.safety_training_datasets FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 13: Grant Permissions
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
--
-- ============================================

-- safety_corpus_items: admin-only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_corpus_items TO authenticated;

-- safety_settings: admin-only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_settings TO authenticated;

-- comment_safety_assessments: admin read/update, INSERT via service_role
GRANT SELECT, UPDATE ON public.comment_safety_assessments TO authenticated;

-- safety_training_datasets: admin-only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_training_datasets TO authenticated;


-- ============================================
-- PART 14: Data/Constraint Migration (2-state → 3-state)
-- ============================================
--
-- Legacy risk levels used: High/Safe
-- Current risk levels: Safe/High_Risk/Uncertain
--
-- This block is safe to re-run.
--
-- ============================================

DO $$
DECLARE
  c RECORD;
BEGIN
  -- Migrate comment_safety_assessments.ai_risk_level + defaults/constraints
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'comment_safety_assessments'
  ) THEN
    -- Drop any CHECK constraints that reference ai_risk_level (to allow value migration)
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.comment_safety_assessments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%ai_risk_level%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.comment_safety_assessments DROP CONSTRAINT IF EXISTS %I',
        c.conname
      );
    END LOOP;

    -- Ensure provider default
    ALTER TABLE public.comment_safety_assessments
      ALTER COLUMN provider SET DEFAULT 'gemini';

    -- Ensure column exists for ETL source filtering
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'comment_safety_assessments'
        AND column_name = 'human_reviewed_status'
    ) THEN
      ALTER TABLE public.comment_safety_assessments
        ADD COLUMN human_reviewed_status VARCHAR(20) NOT NULL DEFAULT 'pending';
    END IF;

    -- Drop any CHECK constraints that reference human_reviewed_status then re-add
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.comment_safety_assessments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%human_reviewed_status%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.comment_safety_assessments DROP CONSTRAINT IF EXISTS %I',
        c.conname
      );
    END LOOP;

    ALTER TABLE public.comment_safety_assessments
      ADD CONSTRAINT comment_safety_assessments_human_reviewed_status_check
      CHECK (human_reviewed_status IN ('pending', 'verified_safe', 'verified_risk', 'corrected'));

    -- Migrate old values
    UPDATE public.comment_safety_assessments
    SET ai_risk_level = 'High_Risk'
    WHERE ai_risk_level = 'High';

    -- Widen type (safe even if already widened)
    ALTER TABLE public.comment_safety_assessments
      ALTER COLUMN ai_risk_level TYPE VARCHAR(20);

    -- Re-add tri-state constraint
    ALTER TABLE public.comment_safety_assessments
      ADD CONSTRAINT comment_safety_assessments_ai_risk_level_check
      CHECK (ai_risk_level IS NULL OR ai_risk_level IN ('Safe', 'High_Risk', 'Uncertain'));
  END IF;

  -- Migrate comment_moderation.safety_latest_risk_level values (if the column exists)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comment_moderation'
      AND column_name = 'safety_latest_risk_level'
  ) THEN
    UPDATE public.comment_moderation
    SET safety_latest_risk_level = 'High_Risk'
    WHERE safety_latest_risk_level = 'High';

    ALTER TABLE public.comment_moderation
      ALTER COLUMN safety_latest_risk_level TYPE VARCHAR(20);
  END IF;
END $$;


-- ============================================
-- 完成 DONE
-- ============================================
