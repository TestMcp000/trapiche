-- ============================================
-- ADD: Users Module Tables
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-28
--
-- 包含表格 TABLES:
-- - user_directory: 使用者目錄（同步 auth.users，SSOT）
-- - customer_profiles: 使用者短 ID（C1, C2, ...；admin-only display）
-- - user_admin_profiles: 使用者後台檔案（Owner-only markdown + tags）
-- - user_appointments: 使用者預約（Owner-only calendar events）
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
--
-- ============================================


-- ============================================
-- PART 1: user_directory (Users list/email SSOT)
-- ============================================
--
-- Single source of truth for backend Users list.
-- Synced from auth.users via triggers (minimal fields only).
-- RLS: Owner/Editor can read; no public access.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_directory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_user_directory_email ON public.user_directory(email);
CREATE INDEX IF NOT EXISTS idx_user_directory_created_at ON public.user_directory(created_at DESC);


-- ============================================
-- PART 2: customer_profiles (Admin-only short ID)
-- ============================================
--
-- Stores a stable, non-PII short id for admin UX (C1, C2, ...).
-- Relationship: customer_profiles.user_id -> user_directory.user_id (1:1)
-- so PostgREST can embed `customer_profiles` when selecting from `user_directory`.
--
-- ============================================

CREATE SEQUENCE IF NOT EXISTS public.customer_short_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.user_directory(user_id) ON DELETE CASCADE,
  short_id TEXT NOT NULL UNIQUE
    DEFAULT ('C' || nextval('public.customer_short_id_seq')::text)
    CHECK (short_id ~ '^C[1-9][0-9]*$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_short_id ON public.customer_profiles(short_id);

-- Backfill for existing users (safe on fresh DB)
INSERT INTO public.customer_profiles (user_id)
SELECT user_id FROM public.user_directory
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- PART 3: Triggers for auth.users sync
-- ============================================
--
-- Sync insert/update/delete from auth.users to user_directory (+ customer_profiles).
-- SECURITY DEFINER to access auth schema.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_directory (user_id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.created_at, TIMEZONE('utc', NOW())), TIMEZONE('utc', NOW()))
    ON CONFLICT (user_id) DO NOTHING;

    -- Ensure every user gets a stable short id for admin UX (C1, C2, ...)
    INSERT INTO public.customer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.user_directory
    SET email = NEW.email,
        updated_at = TIMEZONE('utc', NOW())
    WHERE user_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- CASCADE handles deletion, but explicit for clarity
    DELETE FROM public.user_directory WHERE user_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_sync
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();


-- ============================================
-- PART 4: user_admin_profiles (Owner-only profiles)
-- ============================================
--
-- Owner-authored markdown descriptions and tags for users.
-- Following gallery-style tag structure (single-language zh; en fields kept for legacy).
-- RLS: Owner can write, Owner/Editor can read.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Owner-authored, admin-controlled markdown (NOT user-submitted)
  description_en_md TEXT,
  description_zh_md TEXT,
  
  -- Tags (legacy en/zh columns; single-language uses zh and mirrors to en)
  tags_en TEXT[] NOT NULL DEFAULT '{}',
  tags_zh TEXT[] NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id)
);

-- GIN indexes for tag filtering
CREATE INDEX IF NOT EXISTS idx_user_admin_profiles_tags_en ON public.user_admin_profiles USING GIN(tags_en);
CREATE INDEX IF NOT EXISTS idx_user_admin_profiles_tags_zh ON public.user_admin_profiles USING GIN(tags_zh);


-- ============================================
-- PART 5: user_appointments (Owner-only calendar)
-- ============================================
--
-- Calendar events for users (multiple events per user).
-- Timestamps stored as UTC (TIMESTAMPTZ).
-- RLS: Owner can write, Owner/Editor can read.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Validation: end_at must be after start_at
  CONSTRAINT valid_appointment_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_user_appointments_user_id ON public.user_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_appointments_start_at ON public.user_appointments(start_at DESC);


-- ============================================
-- PART 6: 啟用 RLS
-- ============================================

ALTER TABLE public.user_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_appointments ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 7: RLS Policies - user_directory
-- ============================================
--
-- Admin read-only (Owner/Editor can read; no public access)
--
-- ============================================

CREATE POLICY "Admins can read user directory"
  ON public.user_directory FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 8: RLS Policies - customer_profiles
-- ============================================
--
-- Admin read-only (Owner/Editor can read; no public access)
-- Writes happen via trigger on auth.users insert.
--
-- ============================================

CREATE POLICY "Admins can read customer profiles"
  ON public.customer_profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 9: RLS Policies - user_admin_profiles
-- ============================================
--
-- Owner can write (INSERT/UPDATE/DELETE)
-- Owner/Editor can read
--
-- ============================================

CREATE POLICY "Admins can read user admin profiles"
  ON public.user_admin_profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Owners can manage user admin profiles"
  ON public.user_admin_profiles FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 10: RLS Policies - user_appointments
-- ============================================
--
-- Owner can write (INSERT/UPDATE/DELETE)
-- Owner/Editor can read
--
-- ============================================

CREATE POLICY "Admins can read user appointments"
  ON public.user_appointments FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Owners can manage user appointments"
  ON public.user_appointments FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 11: Grant Permissions (Table-level access)
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.
--
-- ============================================

-- user_directory: admin read only
GRANT SELECT ON public.user_directory TO authenticated;

-- customer_profiles: admin read only (writes happen via trigger)
GRANT SELECT ON public.customer_profiles TO authenticated;

-- user_admin_profiles: admin read, owner write (RLS enforces owner-only)
GRANT SELECT ON public.user_admin_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_admin_profiles TO authenticated;

-- user_appointments: admin read, owner write (RLS enforces owner-only)
GRANT SELECT ON public.user_appointments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_appointments TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
