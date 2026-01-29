/**
 * Reactions API Validators (Pure Functions)
 * 
 * 驗證 Reactions API 的 request。
 * 遵循 ARCHITECTURE.md：純函式，無 side effects。
 */

import { isValidUUID, type ValidationResult, validResult, invalidResult } from './api-common';
import { 
  type ReactionToggleRequest, 
  type ReactionTargetType,
  isValidReactionTargetType 
} from '@/lib/types/reactions';

// =============================================================================
// Reaction Toggle Request Validation
// =============================================================================

/**
 * 驗證 reaction toggle 請求
 */
export function validateReactionToggleRequest(body: unknown): ValidationResult<ReactionToggleRequest> {
  if (!body || typeof body !== 'object') {
    return invalidResult('請求內容必須是物件');
  }

  const { targetType, targetId } = body as Record<string, unknown>;

  // Validate targetType
  if (!isValidReactionTargetType(targetType)) {
    return invalidResult('targetType 必須是 "gallery_item" 或 "comment"');
  }

  // Validate targetId
  if (!isValidUUID(targetId)) {
    return invalidResult('targetId 必須是有效的 UUID');
  }

  return validResult({
    targetType: targetType as ReactionTargetType,
    targetId: targetId as string,
  });
}
