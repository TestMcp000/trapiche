/**
 * Invoice Schema Module (Pure)
 *
 * 遵循 refactor.md：
 * - Pure module：可單測、不可 IO、不可 import Next/React/Supabase
 *
 * 功能：
 * - toggles（簡易模式）-> internal schema
 * - jsonSchema（進階模式）-> internal schema（限制為安全子集）
 * - validateInvoiceInput：依 schema 驗證使用者輸入
 */

import type {
  InvoiceToggles,
  InvoiceFieldSchema,
  InvoiceConfig,
} from '@/lib/types/shop';

// =============================================================================
// Constants
// =============================================================================

/** 預設的發票欄位定義（對應 toggles） */
const INVOICE_FIELD_DEFINITIONS: Record<
  keyof InvoiceToggles,
  Omit<InvoiceFieldSchema, 'required'>
> = {
  taxId: {
    key: 'taxId',
    label: '統一編號',
    type: 'string',
    pattern: '^[0-9]{8}$', // 台灣統一編號格式
  },
  mobileCarrier: {
    key: 'mobileCarrier',
    label: '手機載具',
    type: 'string',
    pattern: '^/[A-Z0-9.+-]{7}$', // 手機載具格式
  },
  citizenCert: {
    key: 'citizenCert',
    label: '自然人憑證',
    type: 'string',
    pattern: '^[A-Z]{2}[0-9]{14}$', // 自然人憑證格式
  },
};

// =============================================================================
// Toggles -> Internal Schema
// =============================================================================

/**
 * 從 toggles 生成 internal schema
 *
 * @param toggles - 簡易模式的開關設定
 * @param allRequired - 是否所有啟用的欄位都必填（預設 false）
 */
export function togglesToSchema(
  toggles: InvoiceToggles,
  allRequired: boolean = false
): InvoiceFieldSchema[] {
  const fields: InvoiceFieldSchema[] = [];

  for (const [key, enabled] of Object.entries(toggles)) {
    if (enabled && key in INVOICE_FIELD_DEFINITIONS) {
      const def = INVOICE_FIELD_DEFINITIONS[key as keyof InvoiceToggles];
      fields.push({
        ...def,
        required: allRequired,
      });
    }
  }

  return fields;
}

// =============================================================================
// JSON Schema -> Internal Schema
// =============================================================================

/** JSON Schema 驗證錯誤 */
export interface JsonSchemaError {
  code: 'invalid_type' | 'missing_properties' | 'invalid_property' | 'unsupported_type';
  message: string;
  path?: string;
}

/**
 * 驗證 JSON Schema 是否為安全子集
 *
 * 安全子集規則：
 * - type 必須是 "object"
 * - properties 必須存在且為 object
 * - 每個 property 的 type 必須是 "string"
 */
export function validateJsonSchema(
  schema: Record<string, unknown>
): JsonSchemaError | null {
  // 檢查 type
  if (schema.type !== 'object') {
    return {
      code: 'invalid_type',
      message: 'Schema type must be "object"',
    };
  }

  // 檢查 properties
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object') {
    return {
      code: 'missing_properties',
      message: 'Schema must have "properties" object',
    };
  }

  // 檢查每個 property
  for (const [key, prop] of Object.entries(properties as Record<string, unknown>)) {
    if (!prop || typeof prop !== 'object') {
      return {
        code: 'invalid_property',
        message: `Property "${key}" must be an object`,
        path: key,
      };
    }

    const propObj = prop as Record<string, unknown>;
    if (propObj.type !== 'string') {
      return {
        code: 'unsupported_type',
        message: `Property "${key}" type must be "string" (got "${propObj.type}")`,
        path: key,
      };
    }
  }

  return null;
}

/**
 * 從 JSON Schema 生成 internal schema
 *
 * @param jsonSchema - 進階模式的 JSON Schema
 * @returns 轉換後的 schema，或 null（驗證失敗時）
 */
export function jsonSchemaToInternalSchema(
  jsonSchema: Record<string, unknown>
): InvoiceFieldSchema[] | null {
  const error = validateJsonSchema(jsonSchema);
  if (error) {
    return null;
  }

  const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;
  const required = Array.isArray(jsonSchema.required)
    ? new Set(jsonSchema.required as string[])
    : new Set<string>();

  const fields: InvoiceFieldSchema[] = [];

  for (const [key, prop] of Object.entries(properties)) {
    fields.push({
      key,
      label: (prop.title as string) || key,
      type: 'string',
      required: required.has(key),
      pattern: prop.pattern as string | undefined,
    });
  }

  return fields;
}

// =============================================================================
// Unified Config -> Internal Schema
// =============================================================================

/**
 * 從 InvoiceConfig 生成 internal schema
 */
export function configToSchema(config: InvoiceConfig): InvoiceFieldSchema[] {
  if (config.mode === 'toggles' && config.toggles) {
    return togglesToSchema(config.toggles);
  }

  if (config.mode === 'jsonSchema' && config.jsonSchema) {
    return jsonSchemaToInternalSchema(config.jsonSchema) ?? [];
  }

  return [];
}

// =============================================================================
// Input Validation
// =============================================================================

/** 欄位驗證錯誤 */
export interface FieldValidationError {
  key: string;
  code: 'required' | 'pattern_mismatch' | 'invalid_type';
  message: string;
}

/**
 * 驗證使用者輸入是否符合 schema
 *
 * @param schema - 內部 schema
 * @param input - 使用者輸入（key-value pairs）
 * @returns 錯誤陣列（空陣列表示驗證通過）
 */
export function validateInvoiceInput(
  schema: InvoiceFieldSchema[],
  input: Record<string, string | undefined>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  for (const field of schema) {
    const value = input[field.key];

    // 檢查必填
    if (field.required && (!value || value.trim() === '')) {
      errors.push({
        key: field.key,
        code: 'required',
        message: `${field.label} is required`,
      });
      continue;
    }

    // 跳過空值（非必填）
    if (!value || value.trim() === '') {
      continue;
    }

    // 檢查 pattern
    if (field.pattern) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        errors.push({
          key: field.key,
          code: 'pattern_mismatch',
          message: `${field.label} format is invalid`,
        });
      }
    }
  }

  return errors;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * 建立空的 toggles 設定
 */
export function createEmptyToggles(): InvoiceToggles {
  return {
    taxId: false,
    mobileCarrier: false,
    citizenCert: false,
  };
}

/**
 * 建立預設的 InvoiceConfig（toggles 模式，全關）
 */
export function createDefaultInvoiceConfig(): InvoiceConfig {
  return {
    mode: 'toggles',
    toggles: createEmptyToggles(),
  };
}
