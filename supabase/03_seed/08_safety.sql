-- ============================================
-- SEED: Safety Risk Engine Default Data
-- ============================================
-- 
-- Version: 1.0
-- Last Updated: 2026-01-17
--
-- Inserts default safety_settings singleton row.
--
-- @see doc/specs/proposed/safety-risk-engine-spec.md
--
-- ============================================


-- ============================================
-- Default safety_settings (singleton id=1)
-- ============================================
--
-- is_enabled: false (start disabled, manually enable)
-- model_id: gemini-1.5-flash (Gemini default)
-- timeout_ms: 1500ms (within 2000ms latency budget)
-- risk_threshold: 0.70 (moderate sensitivity)
--
-- ============================================

INSERT INTO public.safety_settings (
  id,
  is_enabled,
  model_id,
  timeout_ms,
  risk_threshold,
  training_active_batch,
  held_message,
  rejected_message,
  layer1_blocklist
)
VALUES (
  1,
  false,
  'gemini-1.5-flash',
  1500,
  0.70,
  '2026-01_cold_start',
  'Your comment is being reviewed and will appear shortly.',
  'Your comment could not be posted. Please try again later.',
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Safe migration: update legacy default model_id if unchanged
UPDATE public.safety_settings
SET model_id = 'gemini-1.5-flash'
WHERE id = 1
  AND model_id = 'openai/gpt-4o-mini';

-- Ensure training_active_batch is present (safe, idempotent)
UPDATE public.safety_settings
SET training_active_batch = COALESCE(training_active_batch, '2026-01_cold_start')
WHERE id = 1;


-- ============================================
-- 完成 DONE
-- ============================================
