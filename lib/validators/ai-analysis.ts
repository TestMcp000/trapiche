/**
 * AI Analysis Validators (Pure Functions)
 *
 * Pure validation functions for AI analysis requests.
 * No IO operations - safe for use anywhere.
 *
 * @see lib/types/ai-analysis.ts - Type definitions
 * @see lib/validators/api-common.ts - Common validation patterns
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */

import {
  type ValidationResult,
  validResult,
  invalidResult,
} from './api-common';

import {
  type AnalysisTemplateId,
  type AnalysisDataType,
  type AnalysisMode,
  type AnalysisRequest,
  type AnalysisDateRange,
  type RAGConfig,
  ANALYSIS_TEMPLATES,
  RAG_DEFAULTS,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Constants
// =============================================================================

const VALID_TEMPLATE_IDS: readonly AnalysisTemplateId[] = [
  'user_behavior',
  'sales',
  'rfm',
  'content_recommendation',
  'custom',
];

const VALID_DATA_TYPES: readonly AnalysisDataType[] = [
  'products',
  'orders',
  'members',
  'comments',
];

const VALID_MODES: readonly AnalysisMode[] = ['standard', 'rag'];

/**
 * Allowed model IDs from OpenRouter.
 * This allowlist matches the models returned by fetchAvailableModels().
 */
const ALLOWED_MODEL_IDS: readonly string[] = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'google/gemini-pro-1.5',
  'google/gemini-flash-1.5',
];

/**
 * UUID v4 regex for validating custom template IDs.
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Template Validators
// =============================================================================

/**
 * Check if a string is a valid template ID.
 */
export function isValidTemplateId(value: unknown): value is AnalysisTemplateId {
  return (
    typeof value === 'string' &&
    VALID_TEMPLATE_IDS.includes(value as AnalysisTemplateId)
  );
}

/**
 * Validate template ID with detailed result.
 */
export function validateTemplateId(
  input: unknown
): ValidationResult<AnalysisTemplateId> {
  if (!isValidTemplateId(input)) {
    return invalidResult(
      `Invalid template ID. Must be one of: ${VALID_TEMPLATE_IDS.join(', ')}`
    );
  }
  return validResult(input);
}

/**
 * Validate customTemplateId based on templateId.
 * When templateId is 'custom', customTemplateId must be a valid UUID.
 * When templateId is not 'custom', customTemplateId must be undefined/null.
 */
export function validateCustomTemplateId(
  templateId: AnalysisTemplateId,
  customTemplateId: unknown
): ValidationResult<string | undefined> {
  if (templateId === 'custom') {
    if (
      typeof customTemplateId !== 'string' ||
      !UUID_V4_REGEX.test(customTemplateId)
    ) {
      return invalidResult(
        'customTemplateId is required and must be a valid UUID when templateId is "custom"'
      );
    }
    return validResult(customTemplateId);
  } else {
    if (customTemplateId !== undefined && customTemplateId !== null) {
      return invalidResult(
        'customTemplateId must be undefined when templateId is not "custom"'
      );
    }
    return validResult(undefined);
  }
}

// =============================================================================
// Data Type Validators
// =============================================================================

/**
 * Check if a string is a valid data type.
 */
export function isValidDataType(value: unknown): value is AnalysisDataType {
  return (
    typeof value === 'string' &&
    VALID_DATA_TYPES.includes(value as AnalysisDataType)
  );
}

/**
 * Validate data types array.
 */
export function validateDataTypes(
  input: unknown
): ValidationResult<AnalysisDataType[]> {
  if (!Array.isArray(input)) {
    return invalidResult('Data types must be an array');
  }

  if (input.length === 0) {
    return invalidResult('At least one data type is required');
  }

  const invalidTypes = input.filter((t) => !isValidDataType(t));
  if (invalidTypes.length > 0) {
    return invalidResult(
      `Invalid data types: ${invalidTypes.join(', ')}. Valid types: ${VALID_DATA_TYPES.join(', ')}`
    );
  }

  return validResult(input as AnalysisDataType[]);
}

/**
 * Get required data types for a template.
 */
export function getRequiredDataTypes(
  templateId: AnalysisTemplateId
): AnalysisDataType[] {
  const template = ANALYSIS_TEMPLATES.find((t) => t.id === templateId);
  return template ? [...template.requiredDataTypes] : [];
}

/**
 * Validate that selected data types include all required for template.
 */
export function validateRequiredDataTypes(
  templateId: AnalysisTemplateId,
  selectedTypes: AnalysisDataType[]
): ValidationResult<AnalysisDataType[]> {
  const required = getRequiredDataTypes(templateId);
  const missing = required.filter((r) => !selectedTypes.includes(r));

  if (missing.length > 0) {
    return invalidResult(
      `Missing required data types for ${templateId}: ${missing.join(', ')}`
    );
  }

  return validResult(selectedTypes);
}

/**
 * Merge selected types with required types for template.
 * Returns array with all required types plus any additional selected.
 */
export function mergeWithRequiredTypes(
  templateId: AnalysisTemplateId,
  selectedTypes: AnalysisDataType[]
): AnalysisDataType[] {
  const required = getRequiredDataTypes(templateId);
  const merged = new Set([...required, ...selectedTypes]);
  return Array.from(merged);
}

// =============================================================================
// Mode Validators
// =============================================================================

/**
 * Check if a string is a valid analysis mode.
 */
export function isValidMode(value: unknown): value is AnalysisMode {
  return typeof value === 'string' && VALID_MODES.includes(value as AnalysisMode);
}

/**
 * Validate analysis mode.
 */
export function validateMode(input: unknown): ValidationResult<AnalysisMode> {
  if (!isValidMode(input)) {
    return invalidResult(`Invalid mode. Must be one of: ${VALID_MODES.join(', ')}`);
  }
  return validResult(input);
}

// =============================================================================
// Model ID Validators
// =============================================================================

/**
 * Check if a string is a valid model ID.
 */
export function isValidModelId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    ALLOWED_MODEL_IDS.includes(value)
  );
}

/**
 * Validate model ID against allowlist.
 */
export function validateModelId(input: unknown): ValidationResult<string> {
  if (!isValidModelId(input)) {
    return invalidResult(
      `Invalid model ID. Must be one of: ${ALLOWED_MODEL_IDS.join(', ')}`
    );
  }
  return validResult(input);
}

/**
 * Get the list of allowed model IDs.
 * Useful for populating UI dropdowns.
 */
export function getAllowedModelIds(): readonly string[] {
  return ALLOWED_MODEL_IDS;
}

// =============================================================================
// RAG Config Validators
// =============================================================================

/**
 * Validate RAG configuration.
 * @param input - RAGConfig object (optional)
 * @returns ValidationResult<RAGConfig> with defaults applied if input is undefined
 */
export function validateRagConfig(
  input: unknown
): ValidationResult<RAGConfig> {
  // If not provided, use defaults
  if (input === undefined || input === null) {
    return validResult({
      topK: RAG_DEFAULTS.TOP_K,
      threshold: RAG_DEFAULTS.THRESHOLD,
    });
  }

  if (typeof input !== 'object') {
    return invalidResult('RAG config must be an object');
  }

  const config = input as Record<string, unknown>;

  // Validate topK
  const topK = config.topK;
  if (typeof topK !== 'number' || !Number.isInteger(topK)) {
    return invalidResult('RAG topK must be an integer');
  }
  if (topK < RAG_DEFAULTS.MIN_TOP_K || topK > RAG_DEFAULTS.MAX_TOP_K) {
    return invalidResult(
      `RAG topK must be between ${RAG_DEFAULTS.MIN_TOP_K} and ${RAG_DEFAULTS.MAX_TOP_K}`
    );
  }

  // Validate threshold
  const threshold = config.threshold;
  if (typeof threshold !== 'number') {
    return invalidResult('RAG threshold must be a number');
  }
  if (threshold < RAG_DEFAULTS.MIN_THRESHOLD || threshold > RAG_DEFAULTS.MAX_THRESHOLD) {
    return invalidResult(
      `RAG threshold must be between ${RAG_DEFAULTS.MIN_THRESHOLD} and ${RAG_DEFAULTS.MAX_THRESHOLD}`
    );
  }

  return validResult({
    topK,
    threshold,
  });
}

// =============================================================================
// Date Range Validators
// =============================================================================

/**
 * ISO date string regex (YYYY-MM-DD or full ISO timestamp).
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

/**
 * Check if a string is a valid ISO date.
 */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!ISO_DATE_REGEX.test(value)) return false;

  // Also check if it parses to a valid date
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate date range.
 */
export function validateDateRange(
  input: unknown
): ValidationResult<AnalysisDateRange> {
  if (input === null || input === undefined) {
    // Date range is optional
    return validResult({ from: '', to: '' });
  }

  if (typeof input !== 'object') {
    return invalidResult('Date range must be an object with from and to');
  }

  const range = input as Record<string, unknown>;

  if (!isValidIsoDate(range.from)) {
    return invalidResult('Invalid "from" date. Must be ISO format (YYYY-MM-DD)');
  }

  if (!isValidIsoDate(range.to)) {
    return invalidResult('Invalid "to" date. Must be ISO format (YYYY-MM-DD)');
  }

  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);

  if (fromDate > toDate) {
    return invalidResult('"from" date must be before or equal to "to" date');
  }

  return validResult({ from: range.from, to: range.to });
}

// =============================================================================
// Full Request Validator
// =============================================================================

/**
 * Validation errors for analysis request.
 */
export interface AnalysisRequestErrors {
  templateId?: string;
  customTemplateId?: string;
  dataTypes?: string;
  mode?: string;
  modelId?: string;
  dateRange?: string;
  ragConfig?: string;
}

/**
 * Validate complete analysis request.
 */
export function validateAnalysisRequest(
  input: unknown
): ValidationResult<AnalysisRequest> {
  if (typeof input !== 'object' || input === null) {
    return invalidResult('Request must be an object');
  }

  const req = input as Record<string, unknown>;
  const errors: AnalysisRequestErrors = {};

  // Validate templateId
  const templateResult = validateTemplateId(req.templateId);
  if (!templateResult.valid) {
    errors.templateId = templateResult.error;
  }

  // Validate mode
  const modeResult = validateMode(req.mode);
  if (!modeResult.valid) {
    errors.mode = modeResult.error;
  }

  // Validate modelId
  const modelResult = validateModelId(req.modelId);
  if (!modelResult.valid) {
    errors.modelId = modelResult.error;
  }

  // Validate dataTypes
  const dataTypesResult = validateDataTypes(req.dataTypes);
  if (!dataTypesResult.valid) {
    errors.dataTypes = dataTypesResult.error;
  }

  // Validate dateRange if present
  const filters = (req.filters || {}) as Record<string, unknown>;
  if (filters.dateRange !== undefined) {
    const dateResult = validateDateRange(filters.dateRange);
    if (!dateResult.valid) {
      errors.dateRange = dateResult.error;
    }
  }

  // Check for any errors so far
  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      error: Object.values(errors).filter(Boolean).join('; '),
      errors: errors as Record<string, string>,
    };
  }

  // Validate customTemplateId based on templateId
  const customTemplateResult = validateCustomTemplateId(
    req.templateId as AnalysisTemplateId,
    req.customTemplateId
  );
  if (!customTemplateResult.valid) {
    errors.customTemplateId = customTemplateResult.error;
    return {
      valid: false,
      error: customTemplateResult.error!,
      errors: errors as Record<string, string>,
    };
  }

  // Validate required data types for template (skip for 'custom' which has no built-in requirements)
  if (req.templateId !== 'custom') {
    const requiredResult = validateRequiredDataTypes(
      req.templateId as AnalysisTemplateId,
      req.dataTypes as AnalysisDataType[]
    );
    if (!requiredResult.valid) {
      return invalidResult(requiredResult.error!);
    }
  }

  // Validate ragConfig if mode is 'rag'
  const mode = req.mode as AnalysisMode;
  let validatedRagConfig: RAGConfig | undefined;
  if (mode === 'rag') {
    const ragResult = validateRagConfig(req.ragConfig);
    if (!ragResult.valid) {
      errors.ragConfig = ragResult.error;
      return {
        valid: false,
        error: ragResult.error!,
        errors: errors as Record<string, string>,
      };
    }
    validatedRagConfig = ragResult.data;
  }

  // Build validated request
  const validatedRequest: AnalysisRequest = {
    templateId: req.templateId as AnalysisTemplateId,
    customTemplateId: customTemplateResult.data,
    mode: mode,
    modelId: req.modelId as string,
    dataTypes: req.dataTypes as AnalysisDataType[],
    filters: {
      productIds: Array.isArray(filters.productIds)
        ? (filters.productIds as string[])
        : undefined,
      memberIds: Array.isArray(filters.memberIds)
        ? (filters.memberIds as string[])
        : undefined,
      dateRange: filters.dateRange
        ? (filters.dateRange as AnalysisDateRange)
        : undefined,
    },
    ragConfig: validatedRagConfig,
  };

  return validResult(validatedRequest);
}

// =============================================================================
// Schedule Validators
// =============================================================================

/**
 * Valid cron expression pattern.
 * Supports: @daily, @weekly, @monthly, or 5-field cron (minute hour * * *)
 */
const VALID_CRON_REGEX = /^(@(daily|weekly|monthly)|\d{1,2}\s+\d{1,2}\s+\*\s+\*\s+\*)$/;

/**
 * Check if a string is a valid schedule cron expression.
 */
export function isValidScheduleCron(value: unknown): value is string {
  return typeof value === 'string' && VALID_CRON_REGEX.test(value);
}

/**
 * Validate schedule cron expression.
 */
export function validateScheduleCron(input: unknown): ValidationResult<string> {
  if (!isValidScheduleCron(input)) {
    return invalidResult(
      'Invalid cron expression. Use @daily, @weekly, @monthly, or "minute hour * * *" format (e.g., "0 6 * * *" for 6:00 AM daily)'
    );
  }
  return validResult(input);
}

/**
 * Valid timezone check (simple - just check non-empty string).
 * Full validation would require a timezone database.
 */
export function isValidTimezone(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if a string is a valid schedule name.
 */
export function isValidScheduleName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length >= 1 &&
    value.trim().length <= 100
  );
}

/**
 * Validate schedule name.
 */
export function validateScheduleName(input: unknown): ValidationResult<string> {
  if (!isValidScheduleName(input)) {
    return invalidResult(
      'Schedule name must be 1-100 characters'
    );
  }
  return validResult(input.trim());
}

import type { CreateScheduleRequest } from '@/lib/types/ai-analysis';

/**
 * Validation errors for create schedule request.
 */
export interface CreateScheduleRequestErrors {
  name?: string;
  templateId?: string;
  customTemplateId?: string;
  dataTypes?: string;
  mode?: string;
  modelId?: string;
  scheduleCron?: string;
  timezone?: string;
  ragConfig?: string;
}

/**
 * Validate create schedule request.
 */
export function validateCreateScheduleRequest(
  input: unknown
): ValidationResult<CreateScheduleRequest> {
  if (typeof input !== 'object' || input === null) {
    return invalidResult('Request must be an object');
  }

  const req = input as Record<string, unknown>;
  const errors: CreateScheduleRequestErrors = {};

  // Validate name
  const nameResult = validateScheduleName(req.name);
  if (!nameResult.valid) {
    errors.name = nameResult.error;
  }

  // Validate templateId
  const templateResult = validateTemplateId(req.templateId);
  if (!templateResult.valid) {
    errors.templateId = templateResult.error;
  }

  // Validate mode
  const modeResult = validateMode(req.mode);
  if (!modeResult.valid) {
    errors.mode = modeResult.error;
  }

  // Validate modelId
  const modelResult = validateModelId(req.modelId);
  if (!modelResult.valid) {
    errors.modelId = modelResult.error;
  }

  // Validate dataTypes
  const dataTypesResult = validateDataTypes(req.dataTypes);
  if (!dataTypesResult.valid) {
    errors.dataTypes = dataTypesResult.error;
  }

  // Validate scheduleCron
  const cronResult = validateScheduleCron(req.scheduleCron);
  if (!cronResult.valid) {
    errors.scheduleCron = cronResult.error;
  }

  // Validate timezone if present
  if (req.timezone !== undefined && !isValidTimezone(req.timezone)) {
    errors.timezone = 'Timezone must be a non-empty string';
  }

  // Check for any errors so far
  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      error: Object.values(errors).filter(Boolean).join('; '),
      errors: errors as Record<string, string>,
    };
  }

  // Validate customTemplateId based on templateId
  const customTemplateResult = validateCustomTemplateId(
    req.templateId as AnalysisTemplateId,
    req.customTemplateId
  );
  if (!customTemplateResult.valid) {
    errors.customTemplateId = customTemplateResult.error;
    return {
      valid: false,
      error: customTemplateResult.error!,
      errors: errors as Record<string, string>,
    };
  }

  // Validate required data types for template (skip for 'custom' which has no built-in requirements)
  if (req.templateId !== 'custom') {
    const requiredResult = validateRequiredDataTypes(
      req.templateId as AnalysisTemplateId,
      req.dataTypes as AnalysisDataType[]
    );
    if (!requiredResult.valid) {
      return invalidResult(requiredResult.error!);
    }
  }

  // Build validated request
  const validatedRequest: CreateScheduleRequest = {
    name: (req.name as string).trim(),
    templateId: req.templateId as AnalysisTemplateId,
    customTemplateId: customTemplateResult.data,
    mode: req.mode as AnalysisMode,
    modelId: req.modelId as string,
    dataTypes: req.dataTypes as AnalysisDataType[],
    scheduleCron: req.scheduleCron as string,
    timezone: (req.timezone as string) || 'UTC',
    filters: req.filters as CreateScheduleRequest['filters'],
    ragConfig: req.ragConfig as CreateScheduleRequest['ragConfig'],
    memberId: req.memberId as string | null | undefined,
  };

  return validResult(validatedRequest);
}
