/**
 * Reactions Types for Anonymous Like System
 * 
 * 遵循 ARCHITECTURE.md §3.6：
 * - 所有 API request/response types 必須定義在 lib/types/*
 * - API routes 不得 export interface 給 client 用
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Reaction target types
 */
export type ReactionTargetType = 'gallery_item' | 'comment';

/**
 * Reaction DB row (snake_case)
 */
export interface Reaction {
  id: string;
  target_type: ReactionTargetType;
  target_id: string;
  anon_id: string;
  created_at: string;
}

// =============================================================================
// POST /api/reactions
// =============================================================================

/**
 * POST /api/reactions request body
 */
export interface ReactionToggleRequest {
  targetType: ReactionTargetType;
  targetId: string;
}

/**
 * POST /api/reactions response
 */
export interface ReactionToggleResult {
  liked: boolean;
  likeCount: number;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Valid reaction target types (for validation)
 */
export const VALID_REACTION_TARGET_TYPES: readonly ReactionTargetType[] = ['gallery_item', 'comment'];

/**
 * Check if a value is a valid reaction target type
 */
export function isValidReactionTargetType(type: unknown): type is ReactionTargetType {
  return typeof type === 'string' && VALID_REACTION_TARGET_TYPES.includes(type as ReactionTargetType);
}
