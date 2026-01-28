-- ============================================
-- DROP: FAQs
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/meta/STEP_PLAN.md (PR-38)
--
-- ============================================


-- ============================================
-- Drop Policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can read visible faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;


-- ============================================
-- Drop Indexes
-- ============================================

DROP INDEX IF EXISTS idx_faqs_sort_order;
DROP INDEX IF EXISTS idx_faqs_visible;


-- ============================================
-- Drop Tables
-- ============================================

DROP TABLE IF EXISTS public.faqs CASCADE;


-- ============================================
-- 完成 DONE (FAQs Drop)
-- ============================================


-- ============================================
-- DROP: Event Tags (event_tags + event_event_tags)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/meta/STEP_PLAN.md (PR-39)
--
-- ============================================


-- ============================================
-- DROP Policies First
-- ============================================

DROP POLICY IF EXISTS "Anyone can read visible event tags" ON public.event_tags;
DROP POLICY IF EXISTS "Admins can manage event tags" ON public.event_tags;
DROP POLICY IF EXISTS "Anyone can read event event tags" ON public.event_event_tags;
DROP POLICY IF EXISTS "Admins can manage event event tags" ON public.event_event_tags;


-- ============================================
-- DROP Indexes
-- ============================================

DROP INDEX IF EXISTS public.idx_event_tags_slug;
DROP INDEX IF EXISTS public.idx_event_tags_sort_order;
DROP INDEX IF EXISTS public.idx_event_tags_visible;
DROP INDEX IF EXISTS public.idx_event_event_tags_tag_id;


-- ============================================
-- DROP Tables
-- ============================================

DROP TABLE IF EXISTS public.event_event_tags;
DROP TABLE IF EXISTS public.event_tags;


-- ============================================
-- 完成 DONE (Drop Event Tags)
-- ============================================

-- ============================================
-- DROP: Events (event_types + events)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C3)
-- @see doc/meta/STEP_PLAN.md (PR-36)
--
-- ============================================


-- ============================================
-- DROP Policies First (must drop before tables)
-- ============================================

-- event_types policies
DROP POLICY IF EXISTS "Anyone can read visible event types" ON public.event_types;
DROP POLICY IF EXISTS "Admins can manage event types" ON public.event_types;

-- events policies
DROP POLICY IF EXISTS "Anyone can read public events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;


-- ============================================
-- DROP Indexes
-- ============================================

-- event_types indexes
DROP INDEX IF EXISTS public.idx_event_types_slug;
DROP INDEX IF EXISTS public.idx_event_types_sort_order;
DROP INDEX IF EXISTS public.idx_event_types_visible;

-- events indexes
DROP INDEX IF EXISTS public.idx_events_slug;
DROP INDEX IF EXISTS public.idx_events_type_id;
DROP INDEX IF EXISTS public.idx_events_visibility;
DROP INDEX IF EXISTS public.idx_events_start_at;
DROP INDEX IF EXISTS public.idx_events_published_at;


-- ============================================
-- DROP Tables (order matters: events first, then event_types)
-- ============================================

DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.event_types CASCADE;


-- ============================================
-- 完成 DONE (Events)
-- ============================================
-- ============================================
-- DROP: Blog Taxonomy v2 (Groups/Topics/Tags)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-B1–B5)
-- @see doc/meta/STEP_PLAN.md (PR-33)
--
-- ============================================


-- ============================================
-- DROP Policies First (must drop before tables)
-- ============================================

-- blog_groups policies
DROP POLICY IF EXISTS "Anyone can read visible blog groups" ON public.blog_groups;
DROP POLICY IF EXISTS "Admins can manage blog groups" ON public.blog_groups;

-- blog_topics policies
DROP POLICY IF EXISTS "Anyone can read visible blog topics" ON public.blog_topics;
DROP POLICY IF EXISTS "Admins can manage blog topics" ON public.blog_topics;

-- blog_tags policies
DROP POLICY IF EXISTS "Anyone can read blog tags" ON public.blog_tags;
DROP POLICY IF EXISTS "Admins can manage blog tags" ON public.blog_tags;

-- post_topics policies
DROP POLICY IF EXISTS "Anyone can read post topics" ON public.post_topics;
DROP POLICY IF EXISTS "Admins can manage post topics" ON public.post_topics;

-- post_tags policies
DROP POLICY IF EXISTS "Anyone can read post tags" ON public.post_tags;
DROP POLICY IF EXISTS "Admins can manage post tags" ON public.post_tags;


-- ============================================
-- DROP Indexes
-- ============================================

-- blog_groups indexes
DROP INDEX IF EXISTS public.idx_blog_groups_slug;
DROP INDEX IF EXISTS public.idx_blog_groups_sort_order;
DROP INDEX IF EXISTS public.idx_blog_groups_visible;

-- blog_topics indexes
DROP INDEX IF EXISTS public.idx_blog_topics_slug;
DROP INDEX IF EXISTS public.idx_blog_topics_group_id;
DROP INDEX IF EXISTS public.idx_blog_topics_sort_order;
DROP INDEX IF EXISTS public.idx_blog_topics_visible;

-- blog_tags indexes
DROP INDEX IF EXISTS public.idx_blog_tags_slug;

-- post_topics indexes
DROP INDEX IF EXISTS public.idx_post_topics_topic_id;

-- post_tags indexes
DROP INDEX IF EXISTS public.idx_post_tags_tag_id;

-- posts.group_id index
DROP INDEX IF EXISTS public.idx_posts_group_id;


-- ============================================
-- DROP Column from posts (group_id)
-- ============================================

ALTER TABLE public.posts DROP COLUMN IF EXISTS group_id;


-- ============================================
-- DROP Tables (order matters: join tables first)
-- ============================================

DROP TABLE IF EXISTS public.post_tags CASCADE;
DROP TABLE IF EXISTS public.post_topics CASCADE;
DROP TABLE IF EXISTS public.blog_tags CASCADE;
DROP TABLE IF EXISTS public.blog_topics CASCADE;
DROP TABLE IF EXISTS public.blog_groups CASCADE;


-- ============================================
-- 完成 DONE (Blog Taxonomy v2)
-- ============================================
-- ============================================
-- DROP: Safety Risk Engine Tables
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-17
--
-- @see doc/specs/completed/safety-risk-engine-spec.md
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
-- ============================================
-- DROP: Import/Export RPC Functions
-- ============================================
-- 
-- 執行此腳本刪除所有 Import/Export 相關函數
-- Must be before main tables as functions reference them
--
-- ============================================

DROP FUNCTION IF EXISTS public.import_blog_bundle_atomic(JSONB, JSONB, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.import_blog_posts_batch(JSONB, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.import_blog_categories_batch(JSONB) CASCADE;

-- Import/Export Jobs Table
DROP TABLE IF EXISTS public.import_export_jobs CASCADE;


-- ============================================
-- DROP: 主網站表格 (Main Website)
-- ============================================
-- 
-- 執行此腳本刪除所有主網站相關表格
--
-- ============================================


DROP FUNCTION IF EXISTS public.increment_cache_version() CASCADE;
DROP FUNCTION IF EXISTS public.handle_site_admin_changes() CASCADE;

-- 刪除表格（使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.content_history CASCADE;
DROP TABLE IF EXISTS public.site_content CASCADE;
DROP TABLE IF EXISTS public.portfolio_items CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.site_admins CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- DROP: 留言系統表格 (Comments)
-- ============================================
-- 
-- 執行此腳本刪除所有留言系統相關表格
--
-- ============================================


-- 刪除表格（使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS public.spam_decision_log CASCADE;
DROP TABLE IF EXISTS public.comment_rate_limits CASCADE;
DROP TABLE IF EXISTS public.comment_public_settings CASCADE;
DROP TABLE IF EXISTS public.comment_settings CASCADE;
-- Note: site_admins is dropped in 01_drop/01_main.sql section
DROP TABLE IF EXISTS public.comment_blacklist CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;

-- 刪除類型
DROP TYPE IF EXISTS public.comment_target_type CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- DROP: 報告系統表格 (Reports)
-- ============================================
-- 
-- 執行此腳本刪除所有報告系統相關表格
--
-- ============================================


-- 刪除表格（使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS public.reports CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- DROP: 畫廊表格 (Gallery)
-- ============================================
-- 
-- 執行此腳本刪除所有畫廊相關表格
--
-- ============================================


-- 刪除表格（按依賴順序；使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS public.gallery_hotspots CASCADE;
DROP TABLE IF EXISTS public.gallery_pins CASCADE;
DROP TABLE IF EXISTS public.gallery_items CASCADE;
DROP TABLE IF EXISTS public.gallery_categories CASCADE;

-- 刪除類型
DROP TYPE IF EXISTS public.gallery_pin_surface CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- DROP: 反應系統表格 (Reactions)
-- ============================================
-- 
-- 執行此腳本刪除所有反應相關表格與觸發器
--
-- ============================================


-- 刪除函數
DROP FUNCTION IF EXISTS public.fn_apply_like_delta() CASCADE;
DROP FUNCTION IF EXISTS public.fn_cleanup_reactions_on_comment_delete() CASCADE;
DROP FUNCTION IF EXISTS public.fn_cleanup_on_post_delete() CASCADE;
DROP FUNCTION IF EXISTS public.fn_cleanup_on_gallery_item_delete() CASCADE;


-- 刪除表格（使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS public.reaction_rate_limits CASCADE;
DROP TABLE IF EXISTS public.reactions CASCADE;

-- 刪除類型
DROP TYPE IF EXISTS public.reaction_target_type CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- DROP: Feature Settings Table
-- Version: 1.0
-- ============================================

-- Drop RPC function
DROP FUNCTION IF EXISTS public.is_feature_enabled(TEXT);

-- Drop table (CASCADE handles policies)
DROP TABLE IF EXISTS public.feature_settings CASCADE;

-- ============================================
-- DONE
-- ============================================

-- ============================================
-- DROP: Landing Sections Table
-- ============================================
--
-- Execute this script to drop all landing sections related objects.
-- Must be run before 02_add/09_landing_sections.sql for clean reinstall.
--
-- ============================================

-- Drop policies first (CASCADE handles this, but explicit for clarity)
DROP POLICY IF EXISTS "Public can read visible landing sections" ON public.landing_sections;
DROP POLICY IF EXISTS "Admins can manage landing sections" ON public.landing_sections;

-- Drop index
DROP INDEX IF EXISTS public.idx_landing_sections_visible_sort;

-- Drop table (CASCADE removes remaining dependencies)
DROP TABLE IF EXISTS public.landing_sections CASCADE;

-- ============================================
-- DONE
-- ============================================

-- ============================================
-- DROP: Theme/Site Config Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-23
--
-- 執行此腳本刪除主題配置相關表格
--
-- ============================================


-- Drop policies first (CASCADE handles this, but explicit for clarity)
DROP POLICY IF EXISTS "Public can read site config" ON public.site_config;
DROP POLICY IF EXISTS "Owner can manage site config" ON public.site_config;

-- Drop table (CASCADE removes remaining dependencies)
DROP TABLE IF EXISTS public.site_config CASCADE;


-- ============================================
-- DONE
-- ============================================
-- ============================================
-- DROP: Users Module Tables
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-28
--
-- 執行此腳本刪除所有使用者模組相關表格
--
-- ============================================


-- ============================================
-- PART 1: 刪除觸發器與函式
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_sync() CASCADE;


-- ============================================
-- PART 2: 刪除表格（按依賴順序）
-- ============================================

-- 使用者預約（無外部依賴）
DROP TABLE IF EXISTS public.user_appointments CASCADE;

-- 使用者後台檔案（無外部依賴）
DROP TABLE IF EXISTS public.user_admin_profiles CASCADE;

-- 使用者短 ID（依賴 user_directory）
DROP TABLE IF EXISTS public.customer_profiles CASCADE;
DROP SEQUENCE IF EXISTS public.customer_short_id_seq;

-- 使用者目錄（被其他表參照，最後刪除）
DROP TABLE IF EXISTS public.user_directory CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- DROP: Page Views Analytics Table & RPC
-- ============================================
--
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-01
--
-- @see doc/SPEC.md (Analytics -> Page Views)
-- @see ARCHITECTURE.md §10 - 資料一致性與安全
--
-- 執行順序 Execution Order:
-- 1. Drop policies
-- 2. Drop indexes (implicit with table drop)
-- 3. Drop function
-- 4. Drop table
--
-- ============================================


-- ============================================
-- PART 1: Drop RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Admins can read page views" ON public.page_view_daily;


-- ============================================
-- PART 2: Drop Function
-- ============================================

DROP FUNCTION IF EXISTS public.increment_page_view(DATE, TEXT, TEXT);


-- ============================================
-- PART 3: Drop Table (cascades indexes)
-- ============================================

DROP TABLE IF EXISTS public.page_view_daily;


-- ============================================
-- 完成 DONE - Page Views Analytics
-- ============================================

-- ============================================
-- DROP: AI Analysis Report Shares (Public Share Links)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- 依賴順序 DROP ORDER:
-- 1. Drop function first (depends on nothing)
-- 2. Drop table (after function)
--
-- Must be before 17_ai_analysis_custom_template_refs.sql drop
-- and 12_ai_analysis.sql drop (FK dependency)
--
-- ============================================


-- ============================================
-- PART 1: Drop Function
-- ============================================

DROP FUNCTION IF EXISTS public.get_shared_ai_report(TEXT);


-- ============================================
-- PART 2: Drop Table
-- ============================================

DROP TABLE IF EXISTS public.ai_analysis_report_shares;


-- ============================================
-- 完成 DONE - AI Analysis Report Shares
-- ============================================

-- ============================================
-- DROP: AI Analysis Custom Template References
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- Must be before 15_ai_analysis_templates.sql drop (FK dependency)
--
-- ============================================

-- Drop cross-field CHECK
ALTER TABLE public.ai_analysis_reports
DROP CONSTRAINT IF EXISTS ai_analysis_reports_custom_template_ref_check;

-- Drop index
DROP INDEX IF EXISTS idx_ai_reports_custom_template;

-- Drop column
ALTER TABLE public.ai_analysis_reports
DROP COLUMN IF EXISTS custom_template_id;

-- Drop new template_id CHECK
ALTER TABLE public.ai_analysis_reports
DROP CONSTRAINT IF EXISTS ai_analysis_reports_template_id_check;

-- Restore original CHECK (built-in templates only)
ALTER TABLE public.ai_analysis_reports
ADD CONSTRAINT ai_analysis_reports_template_id_check 
CHECK (template_id IN ('user_behavior', 'content_recommendation'));

-- Drop cross-field CHECK
ALTER TABLE public.ai_analysis_schedules
DROP CONSTRAINT IF EXISTS ai_analysis_schedules_custom_template_ref_check;

-- Drop index
DROP INDEX IF EXISTS idx_ai_schedules_custom_template;

-- Drop column
ALTER TABLE public.ai_analysis_schedules
DROP COLUMN IF EXISTS custom_template_id;

-- Drop new template_id CHECK
ALTER TABLE public.ai_analysis_schedules
DROP CONSTRAINT IF EXISTS ai_analysis_schedules_template_id_check;

-- Restore original CHECK (built-in templates only)
ALTER TABLE public.ai_analysis_schedules
ADD CONSTRAINT ai_analysis_schedules_template_id_check 
CHECK (template_id IN ('user_behavior', 'content_recommendation'));

-- ============================================
-- 完成 DONE - AI Analysis Custom Template References
-- ============================================

-- ============================================
-- DROP: AI Analysis Custom Templates Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-01
--
-- 執行此腳本刪除自訂分析模板表格
--
-- ============================================


-- ============================================
-- PART 1: 刪除表格
-- ============================================

DROP TABLE IF EXISTS public.ai_analysis_templates CASCADE;


-- ============================================
-- 完成 DONE - AI Analysis Templates
-- ============================================

-- ============================================
-- DROP: AI Analysis Module Tables & RPC
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- 執行此腳本刪除所有 AI 分析模組相關表格與函數
--
-- ============================================


-- ============================================
-- PART 1: 刪除函數
-- ============================================

DROP FUNCTION IF EXISTS public.increment_ai_usage(TEXT, NUMERIC) CASCADE;


-- ============================================
-- PART 2: 刪除表格（按依賴順序）
-- ============================================

-- AI 分析排程（先刪除，因為依賴 ai_analysis_reports）
DROP TABLE IF EXISTS public.ai_analysis_schedules CASCADE;

-- AI 分析報告
DROP TABLE IF EXISTS public.ai_analysis_reports CASCADE;

-- AI 使用量統計
DROP TABLE IF EXISTS public.ai_usage_monthly CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================

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


-- DROP Policies First
DROP POLICY IF EXISTS "Admins can read embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Admins can manage embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Admins can read embedding queue" ON public.embedding_queue;
DROP POLICY IF EXISTS "Admins can manage embedding queue" ON public.embedding_queue;
DROP POLICY IF EXISTS "Anyone can read similar items" ON public.similar_items;
DROP POLICY IF EXISTS "Admins can manage similar items" ON public.similar_items;
DROP POLICY IF EXISTS "Admins can read search logs" ON public.search_logs;
DROP POLICY IF EXISTS "Admins can insert search logs" ON public.search_logs;
DROP POLICY IF EXISTS "Owner can delete search logs" ON public.search_logs;

-- DROP Indexes
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

-- DROP RPC Functions
DROP FUNCTION IF EXISTS public.match_embeddings(vector(1536), float, int, text[]);
DROP FUNCTION IF EXISTS public.search_embeddings_keyword(text, int, text[]);
DROP FUNCTION IF EXISTS public.claim_embedding_queue_items(int, int);

-- DROP Tables
DROP TABLE IF EXISTS public.search_logs CASCADE;
DROP TABLE IF EXISTS public.similar_items CASCADE;
DROP TABLE IF EXISTS public.embedding_queue CASCADE;
DROP TABLE IF EXISTS public.embeddings CASCADE;

-- Note: We do NOT drop the vector extension as it may be used by other features.


-- ============================================
-- 完成 DONE
-- ============================================
