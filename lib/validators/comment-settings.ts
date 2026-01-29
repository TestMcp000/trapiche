/**
 * Comment Settings Validator (Pure Functions)
 * 
 * Shared between API and UI for consistent validation.
 * No external dependencies - purely synchronous logic.
 */

/** Allowed setting keys */
export const ALLOWED_SETTING_KEYS = [
  'moderation_mode',
  'max_links_before_moderation',
  'enable_honeypot',
  'enable_akismet',
  'enable_recaptcha',
  'recaptcha_threshold',
  'rate_limit_per_minute',
  'max_content_length',
] as const;

export type SettingKey = typeof ALLOWED_SETTING_KEYS[number];

/** Valid moderation modes */
export const MODERATION_MODES = ['auto', 'all', 'first_time'] as const;
export type ModerationMode = typeof MODERATION_MODES[number];

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  /** Normalized value (as string, for DB storage) */
  normalizedValue?: string;
}

/** Batch validation result */
export interface BatchValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  /** Validated and normalized settings */
  validatedSettings?: Record<string, string>;
}

/**
 * Check if a key is a valid setting key
 */
export function isValidSettingKey(key: string): key is SettingKey {
  return ALLOWED_SETTING_KEYS.includes(key as SettingKey);
}

/**
 * Validate a single setting value by key
 */
export function validateSettingValue(
  key: string,
  value: unknown
): ValidationResult {
  // Check key whitelist first
  if (!isValidSettingKey(key)) {
    return { valid: false, error: `未知的設定項目：${key}` };
  }

  switch (key) {
    case 'moderation_mode':
      return validateModerationMode(value);
    case 'enable_honeypot':
    case 'enable_akismet':
    case 'enable_recaptcha':
      return validateBooleanSetting(key, value);
    case 'recaptcha_threshold':
      return validateRecaptchaThreshold(value);
    case 'rate_limit_per_minute':
      return validateRateLimit(value);
    case 'max_content_length':
      return validateMaxContentLength(value);
    case 'max_links_before_moderation':
      return validateMaxLinks(value);
    default:
      // Fallback for any future keys
      return { valid: true, normalizedValue: String(value) };
  }
}

/**
 * Validate moderation_mode
 */
export function validateModerationMode(value: unknown): ValidationResult {
  const strValue = String(value);
  if (!MODERATION_MODES.includes(strValue as ModerationMode)) {
    return {
      valid: false,
      error: 'moderation_mode 必須是 "auto"、"all" 或 "first_time"',
    };
  }
  return { valid: true, normalizedValue: strValue };
}

/**
 * Validate boolean settings (enable_honeypot, enable_akismet, enable_recaptcha)
 */
export function validateBooleanSetting(
  key: string,
  value: unknown
): ValidationResult {
  const strValue = String(value).toLowerCase();
  if (strValue !== 'true' && strValue !== 'false') {
    return { valid: false, error: `${key} 必須是 "true" 或 "false"` };
  }
  return { valid: true, normalizedValue: strValue };
}

/**
 * Validate recaptcha_threshold (0 to 1)
 */
export function validateRecaptchaThreshold(value: unknown): ValidationResult {
  const threshold = parseFloat(String(value));
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    return {
      valid: false,
      error: 'recaptcha_threshold 必須是 0 到 1 之間的數字',
    };
  }
  return { valid: true, normalizedValue: String(threshold) };
}

/**
 * Validate rate_limit_per_minute (1 to 20)
 */
export function validateRateLimit(value: unknown): ValidationResult {
  const rateLimit = parseInt(String(value), 10);
  if (!Number.isFinite(rateLimit) || rateLimit < 1 || rateLimit > 20) {
    return {
      valid: false,
      error: 'rate_limit_per_minute 必須是 1 到 20 之間的整數',
    };
  }
  return { valid: true, normalizedValue: String(rateLimit) };
}

/**
 * Validate max_content_length (100 to 10000)
 */
export function validateMaxContentLength(value: unknown): ValidationResult {
  const maxLength = parseInt(String(value), 10);
  if (!Number.isFinite(maxLength) || maxLength < 100 || maxLength > 10000) {
    return {
      valid: false,
      error: 'max_content_length 必須是 100 到 10000 之間的整數',
    };
  }
  return { valid: true, normalizedValue: String(maxLength) };
}

/**
 * Validate max_links_before_moderation (0 to 20)
 */
export function validateMaxLinks(value: unknown): ValidationResult {
  const maxLinks = parseInt(String(value), 10);
  if (!Number.isFinite(maxLinks) || maxLinks < 0 || maxLinks > 20) {
    return {
      valid: false,
      error: 'max_links_before_moderation 必須是 0 到 20 之間的整數',
    };
  }
  return { valid: true, normalizedValue: String(maxLinks) };
}

/**
 * Validate a batch of settings (used for PATCH requests)
 * Returns all errors at once for better UX
 */
export function validateCommentSettingsPatch(
  settings: unknown
): BatchValidationResult {
  // Check if settings is an object
  if (!settings || typeof settings !== 'object') {
    return {
      valid: false,
      errors: { _: '必須提供 settings 物件' },
    };
  }

  const errors: Record<string, string> = {};
  const validatedSettings: Record<string, string> = {};

  for (const [key, value] of Object.entries(settings)) {
    const result = validateSettingValue(key, value);
    if (!result.valid) {
      errors[key] = result.error!;
    } else {
      validatedSettings[key] = result.normalizedValue!;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: {}, validatedSettings };
}

/**
 * Get constraints for a setting key (for UI hints)
 */
export function getSettingConstraints(key: SettingKey): {
  type: 'boolean' | 'number' | 'enum';
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
} {
  switch (key) {
    case 'moderation_mode':
      return { type: 'enum', options: MODERATION_MODES };
    case 'enable_honeypot':
    case 'enable_akismet':
    case 'enable_recaptcha':
      return { type: 'boolean' };
    case 'recaptcha_threshold':
      return { type: 'number', min: 0, max: 1, step: 0.1 };
    case 'rate_limit_per_minute':
      return { type: 'number', min: 1, max: 20, step: 1 };
    case 'max_content_length':
      return { type: 'number', min: 100, max: 10000, step: 100 };
    case 'max_links_before_moderation':
      return { type: 'number', min: 0, max: 20, step: 1 };
  }
}
