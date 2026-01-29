/**
 * User Domain Types
 *
 * 遵循 ARCHITECTURE.md 規範：
 * - DB row types: snake_case（對齊 Supabase row）
 * - Response types: camelCase
 * - 禁止 IO/side effects（pure module）
 */

// =============================================================================
// DB Row Types (snake_case, matching Supabase)
// =============================================================================

/**
 * user_directory 表 row (SSOT for users list/email)
 * Synced from auth.users via triggers
 */
export interface UserDirectoryRow {
  user_id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * user_admin_profiles 表 row (Owner-only markdown + tags)
 */
export interface UserAdminProfileRow {
  user_id: string;
  description_en_md: string | null;
  description_zh_md: string | null;
  tags_en: string[];
  tags_zh: string[];
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * user_appointments 表 row (Owner-only calendar events)
 */
export interface UserAppointmentRow {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

// =============================================================================
// Response Types (camelCase, for API/UI)
// =============================================================================

/** 使用者摘要（列表用） */
export interface UserDirectorySummary {
  userId: string;
  email: string | null;
  /** Short ID from customer_profiles (C1, C2, ...) for AI Analysis */
  shortId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 使用者後台檔案詳情 */
export interface UserAdminProfileDetail {
  userId: string;
  descriptionEnMd: string | null;
  descriptionZhMd: string | null;
  tagsEn: string[];
  tagsZh: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

/** 預約摘要 */
export interface UserAppointmentSummary {
  id: string;
  userId: string;
  startAt: string;
  endAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 使用者完整詳情（含 admin profile + appointments + cross-domain data） */
export interface UserDetail {
  directory: UserDirectorySummary;
  adminProfile: UserAdminProfileDetail | null;
  appointments: UserAppointmentSummary[];
  /** Optional: comments from comment domain (cross-domain query) */
  comments?: import('@/lib/modules/comment/moderation-transform').AdminComment[];
}

// =============================================================================
// Input Types (for mutations)
// =============================================================================

/** 更新使用者後台檔案 */
export interface UpdateUserAdminProfileInput {
  descriptionEnMd?: string | null;
  descriptionZhMd?: string | null;
  tagsEn?: string[];
  tagsZh?: string[];
}

/** 新增預約 */
export interface CreateAppointmentInput {
  startAt: string; // ISO 8601 UTC
  endAt: string; // ISO 8601 UTC
  note?: string | null;
}

/** 更新預約 */
export interface UpdateAppointmentInput {
  startAt?: string;
  endAt?: string;
  note?: string | null;
}

// =============================================================================
// Note: Server actions use ActionResult<T> from lib/types/action-result.ts
