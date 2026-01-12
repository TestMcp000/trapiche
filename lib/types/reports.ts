/**
 * Reports Types
 *
 * API types for Reports endpoints (admin-only).
 * 
 * 遵循 ARCHITECTURE.md §3.6：
 * - 所有 API request/response types 必須定義在 lib/types/*
 * - API routes 不得 export interface 給 client 用
 */

/**
 * 報告類型
 */
export type ReportType = 'lighthouse' | 'schema' | 'links';

/**
 * 報告狀態
 */
export type ReportStatus = 'queued' | 'running' | 'success' | 'failed';

/**
 * 報告 DB Row (snake_case)
 */
export interface ReportRow {
  id: string;
  type: ReportType;
  status: ReportStatus;
  summary: Record<string, unknown> | null;
  error: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// GET /api/reports
// =============================================================================

/**
 * 報告列表回應
 */
export interface ReportsListResponse {
  success: true;
  reports: ReportRow[];
}

// =============================================================================
// POST /api/reports/run
// =============================================================================

/**
 * 執行報告請求
 */
export interface RunReportRequest {
  type: ReportType;
}

/**
 * 執行報告成功回應
 */
export interface RunReportSuccessResponse {
  success: true;
  report_id: string;
  message: string;
}

/**
 * 執行報告節流回應（429）
 */
export interface RunReportThrottledResponse {
  error: string;
  existing_id: string;
}

/**
 * 有效的報告類型列表（用於驗證）
 */
export const VALID_REPORT_TYPES: readonly ReportType[] = ['lighthouse', 'schema', 'links'];

/**
 * 檢查是否為有效的報告類型
 */
export function isValidReportType(type: unknown): type is ReportType {
  return typeof type === 'string' && VALID_REPORT_TYPES.includes(type as ReportType);
}
