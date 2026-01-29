/**
 * Reports API Validators (Pure Functions)
 * 
 * 驗證 Reports API 的 request。
 * 遵循 ARCHITECTURE.md：純函式，無 side effects。
 */

import { type ValidationResult, validResult, invalidResult } from './api-common';
import { type RunReportRequest, type ReportType, isValidReportType } from '@/lib/types/reports';

// =============================================================================
// Run Report Request Validation
// =============================================================================

/**
 * 驗證 run report 請求
 */
export function validateRunReportRequest(body: unknown): ValidationResult<RunReportRequest> {
  if (!body || typeof body !== 'object') {
    return invalidResult('請求內容必須是物件');
  }

  const { type } = body as Record<string, unknown>;

  // Validate type
  if (!isValidReportType(type)) {
    return invalidResult('type 必須是 "lighthouse"、"schema" 或 "links"');
  }

  return validResult({
    type: type as ReportType,
  });
}
