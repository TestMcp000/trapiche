/**
 * AI Analysis Types (SSOT)
 *
 * Single source of truth for AI analysis type definitions.
 * Aligned with PRD: doc/specs/completed/AI_ANALYSIS_v2.md v2.2
 *
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 * @see doc/specs/completed/AI_ANALYSIS_v2.md - Full specification
 */

// =============================================================================
// Template & Data Type Enums
// =============================================================================

/**
 * Analysis template identifiers.
 * Each template has specific required data types and analysis focus.
 * 'custom' is used with customTemplateId for user-defined templates.
 */
export type AnalysisTemplateId =
  | 'user_behavior'
  | 'sales'
  | 'rfm'
  | 'content_recommendation'
  | 'custom';

/**
 * Data types that can be analyzed.
 * Different templates require different combinations.
 */
export type AnalysisDataType = 'products' | 'orders' | 'members' | 'comments';

/**
 * Analysis mode selection.
 * - standard: All filtered data sent to AI
 * - rag: (Phase 6+) Smart retrieval of relevant data
 */
export type AnalysisMode = 'standard' | 'rag';

/**
 * Analysis job status.
 * Matches PRD §6.5 task status definitions.
 */
export type AnalysisStatus =
  | 'pending'    // Queued, waiting to execute
  | 'running'    // Currently executing
  | 'completed'  // Successfully completed
  | 'incomplete' // Completed but content too short (<100 chars)
  | 'failed';    // Execution failed

// =============================================================================
// Request & Filter Types
// =============================================================================

/**
 * Date range filter for analysis.
 */
export interface AnalysisDateRange {
  from: string; // ISO date string
  to: string;   // ISO date string
}

/**
 * Filters applied to analysis data.
 */
export interface AnalysisFilters {
  productIds?: string[];
  memberIds?: string[];
  dateRange?: AnalysisDateRange;
}

/**
 * Analysis request payload.
 * Sent from client to initiate analysis.
 */
export interface AnalysisRequest {
  templateId: AnalysisTemplateId;
  /** Required when templateId is 'custom' */
  customTemplateId?: string;
  filters: AnalysisFilters;
  dataTypes: AnalysisDataType[];
  mode: AnalysisMode;
  /** Model ID from OpenRouter (e.g., 'openai/gpt-4o-mini') */
  modelId: string;
  /** RAG configuration (required when mode is 'rag') */
  ragConfig?: RAGConfig;
}

// =============================================================================
// Report Types
// =============================================================================

/**
 * Analysis report stored in database.
 */
export interface AnalysisReport {
  id: string;
  userId: string;
  templateId: AnalysisTemplateId;
  /** Custom template ID when templateId is 'custom' */
  customTemplateId: string | null;
  filters: AnalysisFilters;
  dataTypes: AnalysisDataType[];
  mode: AnalysisMode;
  /** Model ID requested by user at creation time */
  modelId: string;
  /** RAG configuration (when mode is 'rag') */
  ragConfig?: RAGConfig;
  status: AnalysisStatus;
  result: string | null;           // Markdown result
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  /** Model ID actually used (from OpenRouter response) */
  model: string | null;
  errorMessage: string | null;
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
  completedAt: string | null;      // ISO timestamp
}

/**
 * Report list item (subset for list views).
 */
export interface AnalysisReportListItem {
  id: string;
  templateId: AnalysisTemplateId;
  status: AnalysisStatus;
  costUsd: number | null;
  createdAt: string;
  completedAt: string | null;
}

// =============================================================================
// Usage & Pricing Types
// =============================================================================

/**
 * Monthly usage tracking record.
 * One record per month for efficient budget checking.
 */
export interface AnalysisUsageMonthly {
  yearMonth: string;       // Format: "2025-01"
  totalCostUsd: number;
  analysisCount: number;
  updatedAt: string;
}

/**
 * Model pricing information.
 * Prices are per million tokens.
 */
export interface ModelPricing {
  modelId: string;
  modelName: string;
  inputPricePerMillion: number;   // USD
  outputPricePerMillion: number;  // USD
}

/**
 * Cost estimation result.
 */
export interface CostEstimate {
  recordCount: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedInputCost: number;     // USD
  estimatedOutputCost: number;    // USD
  estimatedTotalCost: number;     // USD
  warnings: CostWarning[];
}

/**
 * Cost warning types per PRD §4.2.
 */
export type CostWarningType =
  | 'high_cost'        // > $1.00 USD
  | 'large_dataset'    // > 5,000 records
  | 'forced_sampling'; // > 10,000 records

export interface CostWarning {
  type: CostWarningType;
  message: string;
  threshold: number;
  actual: number;
}

// =============================================================================
// Template Metadata
// =============================================================================

/**
 * Template definition with required data types.
 * Used for UI auto-selection and validation.
 */
export interface AnalysisTemplate {
  id: AnalysisTemplateId;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  requiredDataTypes: AnalysisDataType[];
  optionalDataTypes: AnalysisDataType[];
}

/**
 * Predefined templates per PRD §3.
 */
export const ANALYSIS_TEMPLATES: readonly AnalysisTemplate[] = [
  {
    id: 'user_behavior',
    name: { en: 'User Behavior Analysis', zh: '用戶行為分析' },
    description: {
      en: 'Analyze how users interact with content',
      zh: '分析用戶如何與內容互動',
    },
    requiredDataTypes: ['comments', 'orders'],
    optionalDataTypes: ['products'],
  },
  {
    id: 'sales',
    name: { en: 'Sales Analysis', zh: '銷售分析' },
    description: {
      en: 'Analyze product sales and trends',
      zh: '分析商品銷售與趨勢',
    },
    requiredDataTypes: ['products', 'orders'],
    optionalDataTypes: ['members'],
  },
  {
    id: 'rfm',
    name: { en: 'RFM Segmentation', zh: '會員分群 RFM' },
    description: {
      en: 'Segment customers by Recency, Frequency, Monetary',
      zh: '依最近購買、頻率、金額分群',
    },
    requiredDataTypes: ['members', 'orders'],
    optionalDataTypes: [],
  },
  {
    id: 'content_recommendation',
    name: { en: 'Content Recommendation', zh: '內容推薦' },
    description: {
      en: 'Find content-to-purchase correlations',
      zh: '找出內容與購買的關聯',
    },
    requiredDataTypes: ['products', 'orders', 'comments'],
    optionalDataTypes: [],
  },
] as const;

// =============================================================================
// Constants
// =============================================================================

/**
 * Cost control thresholds per PRD §4.
 */
export const COST_THRESHOLDS = {
  /** Warning threshold in USD */
  HIGH_COST_WARNING: 1.0,
  /** Large dataset warning threshold */
  LARGE_DATASET_WARNING: 5000,
  /** Force sampling threshold */
  FORCE_SAMPLING_THRESHOLD: 10000,
  /** Monthly budget limit in USD */
  MONTHLY_BUDGET_LIMIT: 10.0,
  /** Budget warning percentage (80%) */
  BUDGET_WARNING_PERCENT: 0.8,
} as const;

/**
 * Token estimation constants.
 * Approximately 4 characters per token for mixed content.
 */
export const TOKEN_ESTIMATION = {
  CHARS_PER_TOKEN: 4,
  /** Output is typically 25-35% of input, use 30% */
  OUTPUT_RATIO: 0.3,
} as const;

// =============================================================================
// RAG Configuration (Phase 6+)
// =============================================================================

/**
 * Re-rank configuration reference.
 * Full type in lib/rerank/types.ts
 */
export interface RerankConfigRef {
  /** Whether re-ranking is enabled (default: true if API key configured) */
  enabled?: boolean;
  /** Re-rank provider (default: 'cohere') */
  provider?: 'cohere' | 'none';
  /** Model for Cohere (default: 'rerank-multilingual-v3.0') */
  model?: 'rerank-english-v3.0' | 'rerank-multilingual-v3.0';
  /** Number of results to return after re-ranking (default: 10) */
  topN?: number;
}

/**
 * RAG (Retrieval-Augmented Generation) configuration.
 * Controls semantic retrieval behavior for smart analysis.
 *
 * @see uiux_refactor.md §6.3.2 item 4
 */
export interface RAGConfig {
  /** Number of top relevant chunks to retrieve (5-50) */
  topK: number;
  /** Similarity threshold for retrieval (0.5-1.0) */
  threshold: number;
  /** Re-ranking configuration (Phase 6.5+) */
  rerank?: RerankConfigRef;
}

/**
 * Default RAG configuration values.
 */
export const RAG_DEFAULTS = {
  /** Default number of chunks to retrieve */
  TOP_K: 20,
  /** Default similarity threshold */
  THRESHOLD: 0.7,
  /** Minimum allowed topK */
  MIN_TOP_K: 5,
  /** Maximum allowed topK */
  MAX_TOP_K: 50,
  /** Minimum similarity threshold */
  MIN_THRESHOLD: 0.5,
  /** Maximum similarity threshold */
  MAX_THRESHOLD: 1.0,
} as const;

// =============================================================================
// Schedule Types (Phase 3)
// =============================================================================

/**
 * Predefined schedule frequencies.
 */
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Cron expression presets for common frequencies.
 */
export const SCHEDULE_CRON_PRESETS = {
  /** Daily at 6:00 AM */
  daily: '@daily',
  /** Weekly on Monday at 6:00 AM */
  weekly: '@weekly',
  /** Monthly on 1st at 6:00 AM */
  monthly: '@monthly',
} as const;

/**
 * Analysis schedule configuration.
 * @see uiux_refactor.md §4 item 6 - Scheduled Reports
 */
export interface AnalysisSchedule {
  id: string;
  createdBy: string;
  
  // Analysis configuration (mirrors AnalysisRequest)
  templateId: AnalysisTemplateId;
  /** Custom template ID when templateId is 'custom' */
  customTemplateId: string | null;
  dataTypes: AnalysisDataType[];
  mode: AnalysisMode;
  modelId: string;
  filters: AnalysisFilters;
  ragConfig?: RAGConfig;
  
  // Target member (nullable = all members)
  memberId: string | null;
  
  // Schedule configuration
  scheduleCron: string;
  timezone: string;
  isEnabled: boolean;
  
  // Execution tracking
  nextRunAt: string;       // ISO timestamp
  lastRunAt: string | null;
  lastReportId: string | null;
  
  // Metadata
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Schedule list item (subset for list views).
 */
export interface AnalysisScheduleListItem {
  id: string;
  name: string;
  templateId: AnalysisTemplateId;
  scheduleCron: string;
  isEnabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
}

/**
 * Create schedule request payload.
 */
export interface CreateScheduleRequest {
  name: string;
  templateId: AnalysisTemplateId;
  /** Required when templateId is 'custom' */
  customTemplateId?: string;
  dataTypes: AnalysisDataType[];
  mode: AnalysisMode;
  modelId: string;
  filters?: AnalysisFilters;
  ragConfig?: RAGConfig;
  memberId?: string | null;
  scheduleCron: string;
  timezone?: string;
}

/**
 * Update schedule request payload.
 */
export interface UpdateScheduleRequest {
  name?: string;
  templateId?: AnalysisTemplateId;
  /** Required when templateId is 'custom' */
  customTemplateId?: string;
  dataTypes?: AnalysisDataType[];
  mode?: AnalysisMode;
  modelId?: string;
  filters?: AnalysisFilters;
  ragConfig?: RAGConfig;
  memberId?: string | null;
  scheduleCron?: string;
  timezone?: string;
  isEnabled?: boolean;
}

// =============================================================================
// Custom Templates (PR-3)
// =============================================================================

/**
 * Custom analysis template stored in database.
 * Owner can CRUD; Editor can read/use enabled templates.
 */
export interface AnalysisCustomTemplate {
  id: string;
  createdBy: string;
  name: string;
  promptText: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Custom template list item (subset for list views).
 */
export interface AnalysisCustomTemplateListItem {
  id: string;
  name: string;
  isEnabled: boolean;
  createdAt: string;
}

/**
 * Create custom template request payload.
 */
export interface CreateCustomTemplateRequest {
  name: string;
  promptText: string;
}

/**
 * Update custom template request payload.
 */
export interface UpdateCustomTemplateRequest {
  name?: string;
  promptText?: string;
  isEnabled?: boolean;
}

// =============================================================================
// Share Links (PR-4)
// =============================================================================

/**
 * Share link for an AI analysis report.
 * Allows public viewing without authentication.
 */
export interface AnalysisReportShare {
  token: string;
  reportId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

/**
 * Create share request payload.
 */
export interface CreateShareRequest {
  reportId: string;
  /** Optional expiry date (ISO string) */
  expiresAt?: string;
}

/**
 * Shared report data for public viewing.
 * Only whitelisted fields are exposed — no internal IDs, filters, or userId.
 */
export interface SharedReportPublic {
  result: string;
  templateId: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Token format: 64-character hex string (256-bit entropy).
 */
export const SHARE_TOKEN_REGEX = /^[a-f0-9]{64}$/;
