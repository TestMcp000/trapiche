/**
 * Payment Config Module (Pure)
 *
 * 遵循 refactor.md：
 * - Pure module：可單測、不可 IO、不可 import Next/React/Supabase
 *
 * 功能：
 * - Stripe key format 基本檢查（pk/sk/whsec 與 test/live 一致）
 * - LinePay/ECPay：Regex/長度 Stub 檢查
 * - maskSecret：後台顯示用（只顯示部分字元）
 */


// =============================================================================
// Types
// =============================================================================

/** 驗證結果 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** 驗證錯誤 */
export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

/** Stripe 設定 */
export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  /** true = test mode, false = live mode */
  testMode: boolean;
}

/** LinePay 設定（V1 Stub） */
export interface LinePayConfig {
  channelId: string;
  channelSecret: string;
  testMode: boolean;
}

/** ECPay 設定（V1 Stub） */
export interface ECPayConfig {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  testMode: boolean;
}

// =============================================================================
// Stripe Validation
// =============================================================================

/** Stripe key prefixes */
const STRIPE_PREFIXES = {
  publishableTest: 'pk_test_',
  publishableLive: 'pk_live_',
  secretTest: 'sk_test_',
  secretLive: 'sk_live_',
  webhookTest: 'whsec_',
  webhookLive: 'whsec_',
} as const;

/**
 * 驗證 Stripe key 格式
 */
export function validateStripeKey(
  key: string,
  type: 'publishable' | 'secret' | 'webhook',
  testMode: boolean
): ValidationError | null {
  if (!key || key.trim() === '') {
    return {
      field: type === 'publishable' ? 'publishableKey' : type === 'secret' ? 'secretKey' : 'webhookSecret',
      code: 'required',
      message: `${type} key is required`,
    };
  }

  const trimmedKey = key.trim();

  if (type === 'publishable') {
    const expectedPrefix = testMode ? STRIPE_PREFIXES.publishableTest : STRIPE_PREFIXES.publishableLive;
    if (!trimmedKey.startsWith(expectedPrefix)) {
      return {
        field: 'publishableKey',
        code: 'invalid_prefix',
        message: `Publishable key must start with "${expectedPrefix}" for ${testMode ? 'test' : 'live'} mode`,
      };
    }
  }

  if (type === 'secret') {
    const expectedPrefix = testMode ? STRIPE_PREFIXES.secretTest : STRIPE_PREFIXES.secretLive;
    if (!trimmedKey.startsWith(expectedPrefix)) {
      return {
        field: 'secretKey',
        code: 'invalid_prefix',
        message: `Secret key must start with "${expectedPrefix}" for ${testMode ? 'test' : 'live'} mode`,
      };
    }
  }

  if (type === 'webhook') {
    if (!trimmedKey.startsWith(STRIPE_PREFIXES.webhookTest)) {
      return {
        field: 'webhookSecret',
        code: 'invalid_prefix',
        message: 'Webhook secret must start with "whsec_"',
      };
    }
  }

  // 長度檢查（Stripe keys 通常很長）
  if (trimmedKey.length < 20) {
    return {
      field: type === 'publishable' ? 'publishableKey' : type === 'secret' ? 'secretKey' : 'webhookSecret',
      code: 'too_short',
      message: `${type} key appears to be too short`,
    };
  }

  return null;
}

/**
 * 驗證 Stripe 設定
 */
export function validateStripeConfig(config: StripeConfig): ValidationResult {
  const errors: ValidationError[] = [];

  const publishableError = validateStripeKey(config.publishableKey, 'publishable', config.testMode);
  if (publishableError) errors.push(publishableError);

  const secretError = validateStripeKey(config.secretKey, 'secret', config.testMode);
  if (secretError) errors.push(secretError);

  const webhookError = validateStripeKey(config.webhookSecret, 'webhook', config.testMode);
  if (webhookError) errors.push(webhookError);

  // 檢查 test/live 模式一致性
  if (errors.length === 0) {
    const pkIsTest = config.publishableKey.startsWith('pk_test_');
    const skIsTest = config.secretKey.startsWith('sk_test_');

    if (pkIsTest !== skIsTest) {
      errors.push({
        field: 'mode',
        code: 'mode_mismatch',
        message: 'Publishable key and secret key must be from the same environment (both test or both live)',
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// LinePay Validation (V1 Stub)
// =============================================================================

/**
 * 驗證 LinePay 設定（V1 Stub：僅做格式/長度檢查）
 */
export function validateLinePayConfig(config: LinePayConfig): ValidationResult {
  const errors: ValidationError[] = [];

  // Channel ID：數字，通常 10 位
  if (!config.channelId || config.channelId.trim() === '') {
    errors.push({
      field: 'channelId',
      code: 'required',
      message: 'Channel ID is required',
    });
  } else if (!/^\d{5,15}$/.test(config.channelId.trim())) {
    errors.push({
      field: 'channelId',
      code: 'invalid_format',
      message: 'Channel ID must be 5-15 digits',
    });
  }

  // Channel Secret：32 字元
  if (!config.channelSecret || config.channelSecret.trim() === '') {
    errors.push({
      field: 'channelSecret',
      code: 'required',
      message: 'Channel Secret is required',
    });
  } else if (config.channelSecret.trim().length < 20) {
    errors.push({
      field: 'channelSecret',
      code: 'too_short',
      message: 'Channel Secret appears to be too short',
    });
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// ECPay Validation (V1 Stub)
// =============================================================================

/**
 * 驗證 ECPay 設定（V1 Stub：僅做格式/長度檢查）
 */
export function validateECPayConfig(config: ECPayConfig): ValidationResult {
  const errors: ValidationError[] = [];

  // Merchant ID：7 位數字
  if (!config.merchantId || config.merchantId.trim() === '') {
    errors.push({
      field: 'merchantId',
      code: 'required',
      message: 'Merchant ID is required',
    });
  } else if (!/^\d{7,10}$/.test(config.merchantId.trim())) {
    errors.push({
      field: 'merchantId',
      code: 'invalid_format',
      message: 'Merchant ID must be 7-10 digits',
    });
  }

  // HashKey：16 字元
  if (!config.hashKey || config.hashKey.trim() === '') {
    errors.push({
      field: 'hashKey',
      code: 'required',
      message: 'HashKey is required',
    });
  } else if (config.hashKey.trim().length !== 16) {
    errors.push({
      field: 'hashKey',
      code: 'invalid_length',
      message: 'HashKey must be exactly 16 characters',
    });
  }

  // HashIV：16 字元
  if (!config.hashIv || config.hashIv.trim() === '') {
    errors.push({
      field: 'hashIv',
      code: 'required',
      message: 'HashIV is required',
    });
  } else if (config.hashIv.trim().length !== 16) {
    errors.push({
      field: 'hashIv',
      code: 'invalid_length',
      message: 'HashIV must be exactly 16 characters',
    });
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// Unified Validation
// =============================================================================

/** 金流設定聯合型別 */
export type GatewayConfig =
  | { gateway: 'stripe'; config: StripeConfig }
  | { gateway: 'linepay'; config: LinePayConfig }
  | { gateway: 'ecpay'; config: ECPayConfig };

/**
 * 驗證任意金流設定
 */
export function validateGatewayConfig(input: GatewayConfig): ValidationResult {
  switch (input.gateway) {
    case 'stripe':
      return validateStripeConfig(input.config);
    case 'linepay':
      return validateLinePayConfig(input.config);
    case 'ecpay':
      return validateECPayConfig(input.config);
    default:
      const _exhaustive: never = input;
      return { valid: false, errors: [{ field: 'gateway', code: 'unknown', message: 'Unknown gateway' }] };
  }
}

// =============================================================================
// Secret Masking
// =============================================================================

/**
 * 遮罩敏感資訊（只顯示前後部分字元）
 *
 * @param secret - 原始密鑰
 * @param showStart - 顯示開頭幾個字元（預設 7）
 * @param showEnd - 顯示結尾幾個字元（預設 4）
 */
export function maskSecret(
  secret: string,
  showStart: number = 7,
  showEnd: number = 4
): string {
  if (!secret) return '';

  const trimmed = secret.trim();

  // 如果太短，全部遮罩
  if (trimmed.length <= showStart + showEnd) {
    return '*'.repeat(trimmed.length);
  }

  const start = trimmed.slice(0, showStart);
  const end = trimmed.slice(-showEnd);
  const middleLength = trimmed.length - showStart - showEnd;

  return `${start}${'*'.repeat(Math.min(middleLength, 10))}${end}`;
}

/**
 * 遮罩 Stripe 設定（回傳安全的顯示版本）
 */
export function maskStripeConfig(config: StripeConfig): {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  testMode: boolean;
} {
  return {
    publishableKey: maskSecret(config.publishableKey),
    secretKey: maskSecret(config.secretKey),
    webhookSecret: maskSecret(config.webhookSecret),
    testMode: config.testMode,
  };
}
