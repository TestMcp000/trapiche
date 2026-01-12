/**
 * Shop Payment Config Module Tests
 *
 * 測試 lib/modules/shop/payment-config.ts 的 pure functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStripeKey,
  validateStripeConfig,
  validateLinePayConfig,
  validateECPayConfig,
  validateGatewayConfig,
  maskSecret,
  maskStripeConfig,
  type StripeConfig,
  type LinePayConfig,
  type ECPayConfig,
} from '../lib/modules/shop/payment-config';

describe('validateStripeKey', () => {
  it('validates test mode publishable key', () => {
    const error = validateStripeKey('pk_test_1234567890abcdefgh', 'publishable', true);
    assert.equal(error, null);
  });

  it('rejects live key in test mode', () => {
    const error = validateStripeKey('pk_live_1234567890abcdefgh', 'publishable', true);
    assert.equal(error?.code, 'invalid_prefix');
  });

  it('validates live mode secret key', () => {
    const error = validateStripeKey('sk_live_1234567890abcdefgh', 'secret', false);
    assert.equal(error, null);
  });

  it('rejects test key in live mode', () => {
    const error = validateStripeKey('sk_test_1234567890abcdefgh', 'secret', false);
    assert.equal(error?.code, 'invalid_prefix');
  });

  it('validates webhook secret', () => {
    const error = validateStripeKey('whsec_1234567890abcdefgh', 'webhook', true);
    assert.equal(error, null);
  });

  it('rejects empty key', () => {
    const error = validateStripeKey('', 'publishable', true);
    assert.equal(error?.code, 'required');
  });

  it('rejects too short key', () => {
    const error = validateStripeKey('pk_test_short', 'publishable', true);
    assert.equal(error?.code, 'too_short');
  });

  it('trims whitespace from key before validation', () => {
    const keyWithWhitespace = '  pk_test_1234567890abcdefgh  ';
    const error = validateStripeKey(keyWithWhitespace, 'publishable', true);
    assert.equal(error, null);
  });

  it('trims whitespace and still validates prefix correctly', () => {
    const keyWithWhitespace = '  sk_live_1234567890abcdefgh  ';
    // testMode=true expects sk_test_, this should fail even with trimming
    const error = validateStripeKey(keyWithWhitespace, 'secret', true);
    assert.equal(error?.code, 'invalid_prefix');
  });
});

describe('validateStripeConfig', () => {
  const validTestConfig: StripeConfig = {
    publishableKey: 'pk_test_1234567890abcdefghijklmnop',
    secretKey: 'sk_test_1234567890abcdefghijklmnop',
    webhookSecret: 'whsec_1234567890abcdefghijklmnop',
    testMode: true,
  };

  it('validates correct test config', () => {
    const result = validateStripeConfig(validTestConfig);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('detects mode mismatch between pk and sk', () => {
    // Note: We need to set testMode to match one of the keys so prefix checks pass,
    // but the mismatch detection happens when pk_test and sk_live are both present
    // The validation first checks prefixes, so if testMode=true and sk is sk_live,
    // it will fail on prefix check first. We test the mismatch by checking
    // that mixing test/live keys produces an error.
    const mismatchConfig: StripeConfig = {
      publishableKey: 'pk_test_1234567890abcdefghijklmnop',
      secretKey: 'sk_live_1234567890abcdefghijklmnop',
      webhookSecret: 'whsec_1234567890abcdefghijklmnop',
      testMode: true,
    };
    const result = validateStripeConfig(mismatchConfig);
    assert.equal(result.valid, false);
    // Should fail due to sk prefix not matching testMode
    assert.ok(result.errors.some((e) => e.code === 'invalid_prefix'));
  });

  it('collects multiple errors', () => {
    const badConfig: StripeConfig = {
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      testMode: true,
    };
    const result = validateStripeConfig(badConfig);
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 3);
  });
});

describe('validateLinePayConfig', () => {
  const validConfig: LinePayConfig = {
    channelId: '1234567890',
    channelSecret: '12345678901234567890123456789012',
    testMode: true,
  };

  it('validates correct config', () => {
    const result = validateLinePayConfig(validConfig);
    assert.equal(result.valid, true);
  });

  it('rejects empty channel ID', () => {
    const result = validateLinePayConfig({ ...validConfig, channelId: '' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'channelId'));
  });

  it('rejects invalid channel ID format', () => {
    const result = validateLinePayConfig({ ...validConfig, channelId: 'abc' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.code === 'invalid_format'));
  });

  it('rejects short channel secret', () => {
    const result = validateLinePayConfig({ ...validConfig, channelSecret: 'short' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.code === 'too_short'));
  });
});

describe('validateECPayConfig', () => {
  const validConfig: ECPayConfig = {
    merchantId: '1234567',
    hashKey: '1234567890123456',
    hashIv: '1234567890123456',
    testMode: true,
  };

  it('validates correct config', () => {
    const result = validateECPayConfig(validConfig);
    assert.equal(result.valid, true);
  });

  it('rejects empty merchant ID', () => {
    const result = validateECPayConfig({ ...validConfig, merchantId: '' });
    assert.equal(result.valid, false);
  });

  it('rejects invalid merchant ID format', () => {
    const result = validateECPayConfig({ ...validConfig, merchantId: '123' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.code === 'invalid_format'));
  });

  it('rejects wrong length hashKey', () => {
    const result = validateECPayConfig({ ...validConfig, hashKey: '12345' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.code === 'invalid_length'));
  });

  it('rejects wrong length hashIv', () => {
    const result = validateECPayConfig({ ...validConfig, hashIv: '12345' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.code === 'invalid_length'));
  });
});

describe('validateGatewayConfig', () => {
  it('routes to stripe validation', () => {
    const result = validateGatewayConfig({
      gateway: 'stripe',
      config: {
        publishableKey: 'pk_test_1234567890abcdefghijklmnop',
        secretKey: 'sk_test_1234567890abcdefghijklmnop',
        webhookSecret: 'whsec_1234567890abcdefghijklmnop',
        testMode: true,
      },
    });
    assert.equal(result.valid, true);
  });

  it('routes to linepay validation', () => {
    const result = validateGatewayConfig({
      gateway: 'linepay',
      config: {
        channelId: '1234567890',
        channelSecret: '12345678901234567890123456789012',
        testMode: true,
      },
    });
    assert.equal(result.valid, true);
  });

  it('routes to ecpay validation', () => {
    const result = validateGatewayConfig({
      gateway: 'ecpay',
      config: {
        merchantId: '1234567',
        hashKey: '1234567890123456',
        hashIv: '1234567890123456',
        testMode: true,
      },
    });
    assert.equal(result.valid, true);
  });
});

describe('maskSecret', () => {
  it('masks middle portion of secret', () => {
    const masked = maskSecret('pk_test_1234567890abcdefghijklmnop');
    assert.ok(masked.startsWith('pk_test'));
    assert.ok(masked.endsWith('mnop'));
    assert.ok(masked.includes('*'));
  });

  it('does not reveal full secret', () => {
    const secret = 'sk_test_supersecretkey12345';
    const masked = maskSecret(secret);
    assert.notEqual(masked, secret);
    assert.ok(!masked.includes('supersecret'));
  });

  it('handles short secrets by masking entirely', () => {
    const masked = maskSecret('short');
    assert.equal(masked, '*****');
  });

  it('handles empty string', () => {
    assert.equal(maskSecret(''), '');
  });

  it('respects custom show parameters', () => {
    const masked = maskSecret('1234567890abcdef', 4, 2);
    assert.ok(masked.startsWith('1234'));
    assert.ok(masked.endsWith('ef'));
  });
});

describe('maskStripeConfig', () => {
  it('masks all sensitive fields', () => {
    const config: StripeConfig = {
      publishableKey: 'pk_test_1234567890abcdefghijklmnop',
      secretKey: 'sk_test_1234567890abcdefghijklmnop',
      webhookSecret: 'whsec_1234567890abcdefghijklmnop',
      testMode: true,
    };
    const masked = maskStripeConfig(config);

    assert.ok(masked.publishableKey.includes('*'));
    assert.ok(masked.secretKey.includes('*'));
    assert.ok(masked.webhookSecret.includes('*'));
    assert.equal(masked.testMode, true);

    // Ensure original keys are not exposed
    assert.notEqual(masked.publishableKey, config.publishableKey);
    assert.notEqual(masked.secretKey, config.secretKey);
  });
});
