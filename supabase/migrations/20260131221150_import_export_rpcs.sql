-- ============================================
-- ADD: Import/Export RPC Functions
-- ============================================
--
-- Provides transaction-safe batch operations for importing blog data.
-- These RPCs wrap multi-row operations in transactions for atomic rollback.
--
-- @see doc/specs/completed/IMPORT_EXPORT.md §4.4
-- @see uiux_refactor.md §6.1.2 Phase 1 B.3
-- ============================================


-- -----------------------------------------------------------------------------
-- import_blog_categories_batch
-- -----------------------------------------------------------------------------
-- Batch upsert categories with transaction safety.
-- On any error, the entire batch is rolled back.
--
-- @param p_categories JSONB array of category objects with slug, name_en, name_zh
-- @returns JSON with success status and count
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_blog_categories_batch(p_categories JSONB)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT := 0;
  v_category JSONB;
BEGIN
  -- Validate input
  IF p_categories IS NULL OR jsonb_array_length(p_categories) = 0 THEN
    RETURN json_build_object('success', true, 'count', 0);
  END IF;

  -- Process each category
  FOR v_category IN SELECT * FROM jsonb_array_elements(p_categories)
  LOOP
    INSERT INTO public.categories (slug, name_en, name_zh, created_at)
    VALUES (
      v_category->>'slug',
      v_category->>'name_en',
      v_category->>'name_zh',
      COALESCE((v_category->>'created_at')::TIMESTAMPTZ, NOW())
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh;

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'count', 0
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- import_blog_posts_batch
-- -----------------------------------------------------------------------------
-- Batch upsert posts with transaction safety.
-- Resolves category slugs to IDs and sets timestamps.
--
-- @param p_posts JSONB array of post objects
-- @param p_author_id UUID of the author for all posts
-- @returns JSON with success status and count
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_blog_posts_batch(
  p_posts JSONB,
  p_author_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT := 0;
  v_post JSONB;
  v_category_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Validate input
  IF p_posts IS NULL OR jsonb_array_length(p_posts) = 0 THEN
    RETURN json_build_object('success', true, 'count', 0);
  END IF;

  -- Process each post
  FOR v_post IN SELECT * FROM jsonb_array_elements(p_posts)
  LOOP
    -- Resolve category slug to ID
    SELECT id INTO v_category_id
    FROM public.categories
    WHERE slug = v_post->>'category_slug';

    INSERT INTO public.posts (
      slug,
      title_en,
      title_zh,
      content_en,
      content_zh,
      excerpt_en,
      excerpt_zh,
      cover_image_url_en,
      cover_image_url_zh,
      cover_image_alt_en,
      cover_image_alt_zh,
      visibility,
      category_id,
      author_id,
      created_at,
      updated_at,
      published_at
    )
    VALUES (
      v_post->>'slug',
      v_post->>'title_en',
      v_post->>'title_zh',
      v_post->>'content_en',
      v_post->>'content_zh',
      v_post->>'excerpt_en',
      v_post->>'excerpt_zh',
      v_post->>'cover_image_url_en',
      v_post->>'cover_image_url_zh',
      v_post->>'cover_image_alt_en',
      v_post->>'cover_image_alt_zh',
      COALESCE(v_post->>'visibility', 'draft'),
      v_category_id,
      p_author_id,
      COALESCE((v_post->>'created_at')::TIMESTAMPTZ, v_now),
      v_now,
      CASE
        WHEN v_post->>'visibility' = 'public' THEN v_now
        ELSE NULL
      END
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      title_en = EXCLUDED.title_en,
      title_zh = EXCLUDED.title_zh,
      content_en = EXCLUDED.content_en,
      content_zh = EXCLUDED.content_zh,
      excerpt_en = EXCLUDED.excerpt_en,
      excerpt_zh = EXCLUDED.excerpt_zh,
      cover_image_url_en = EXCLUDED.cover_image_url_en,
      cover_image_url_zh = EXCLUDED.cover_image_url_zh,
      cover_image_alt_en = EXCLUDED.cover_image_alt_en,
      cover_image_alt_zh = EXCLUDED.cover_image_alt_zh,
      visibility = EXCLUDED.visibility,
      category_id = EXCLUDED.category_id,
      updated_at = EXCLUDED.updated_at,
      published_at = COALESCE(public.posts.published_at, EXCLUDED.published_at);

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'count', 0
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- import_blog_bundle_atomic
-- -----------------------------------------------------------------------------
-- Atomic import of both categories and posts in a single transaction.
-- If any step fails, the entire import is rolled back.
--
-- @param p_categories JSONB array of category objects
-- @param p_posts JSONB array of post objects
-- @param p_author_id UUID of the author for all posts
-- @returns JSON with success status and counts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_blog_bundle_atomic(
  p_categories JSONB,
  p_posts JSONB,
  p_author_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_count INT := 0;
  v_post_count INT := 0;
  v_category JSONB;
  v_post JSONB;
  v_category_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Step 1: Import categories
  IF p_categories IS NOT NULL AND jsonb_array_length(p_categories) > 0 THEN
    FOR v_category IN SELECT * FROM jsonb_array_elements(p_categories)
    LOOP
      INSERT INTO public.categories (slug, name_en, name_zh, created_at)
      VALUES (
        v_category->>'slug',
        v_category->>'name_en',
        v_category->>'name_zh',
        COALESCE((v_category->>'created_at')::TIMESTAMPTZ, v_now)
      )
      ON CONFLICT (slug)
      DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_zh = EXCLUDED.name_zh;

      v_cat_count := v_cat_count + 1;
    END LOOP;
  END IF;

  -- Step 2: Import posts (categories are now guaranteed to exist)
  IF p_posts IS NOT NULL AND jsonb_array_length(p_posts) > 0 THEN
    FOR v_post IN SELECT * FROM jsonb_array_elements(p_posts)
    LOOP
      -- Resolve category slug to ID
      SELECT id INTO v_category_id
      FROM public.categories
      WHERE slug = v_post->>'category_slug';

      INSERT INTO public.posts (
        slug,
        title_en,
        title_zh,
        content_en,
        content_zh,
        excerpt_en,
        excerpt_zh,
        cover_image_url_en,
        cover_image_url_zh,
        cover_image_alt_en,
        cover_image_alt_zh,
        visibility,
        category_id,
        author_id,
        created_at,
        updated_at,
        published_at
      )
      VALUES (
        v_post->>'slug',
        v_post->>'title_en',
        v_post->>'title_zh',
        v_post->>'content_en',
        v_post->>'content_zh',
        v_post->>'excerpt_en',
        v_post->>'excerpt_zh',
        v_post->>'cover_image_url_en',
        v_post->>'cover_image_url_zh',
        v_post->>'cover_image_alt_en',
        v_post->>'cover_image_alt_zh',
        COALESCE(v_post->>'visibility', 'draft'),
        v_category_id,
        p_author_id,
        COALESCE((v_post->>'created_at')::TIMESTAMPTZ, v_now),
        v_now,
        CASE
          WHEN v_post->>'visibility' = 'public' THEN v_now
          ELSE NULL
        END
      )
      ON CONFLICT (slug)
      DO UPDATE SET
        title_en = EXCLUDED.title_en,
        title_zh = EXCLUDED.title_zh,
        content_en = EXCLUDED.content_en,
        content_zh = EXCLUDED.content_zh,
        excerpt_en = EXCLUDED.excerpt_en,
        excerpt_zh = EXCLUDED.excerpt_zh,
        cover_image_url_en = EXCLUDED.cover_image_url_en,
        cover_image_url_zh = EXCLUDED.cover_image_url_zh,
        cover_image_alt_en = EXCLUDED.cover_image_alt_en,
        cover_image_alt_zh = EXCLUDED.cover_image_alt_zh,
        visibility = EXCLUDED.visibility,
        category_id = EXCLUDED.category_id,
        updated_at = EXCLUDED.updated_at,
        published_at = COALESCE(public.posts.published_at, EXCLUDED.published_at);

      v_post_count := v_post_count + 1;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'categories_count', v_cat_count,
    'posts_count', v_post_count
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically - entire bundle fails
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'categories_count', 0,
    'posts_count', 0
  );
END;
$$;


