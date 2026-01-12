/**
 * Payment Pure Module Tests
 *
 * Tests for lib/modules/shop/payment-pure.ts pure functions.
 * No mocks needed - pure function testing.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFormDataPayload,
  parseJsonPayload,
  generateEcpayCheckMacValue,
  validateEcpayCheckMacValue,
  generateLinePaySignature,
  validateLinePaySignature,
  buildEcpayEventId,
  buildLinePayEventId,
  // Stripe functions
  parseStripeSignatureHeader,
  computeStripeSignature,
  validateStripeWebhookSignature,
  buildStripeEventId,
  extractStripeOrderId,
  type StripeWebhookPayload,
} from '../../lib/modules/shop/payment-pure';

// =============================================================================
// parseFormDataPayload Tests
// =============================================================================

describe('parseFormDataPayload', () => {
  it('converts FormData entries to string record', () => {
    const formData = new FormData();
    formData.append('key1', 'value1');
    formData.append('key2', 'value2');

    const result = parseFormDataPayload(formData);

    assert.equal(result.key1, 'value1');
    assert.equal(result.key2, 'value2');
  });

  it('ignores File values', () => {
    const formData = new FormData();
    formData.append('text', 'hello');
    formData.append('file', new Blob(['content']), 'test.txt');

    const result = parseFormDataPayload(formData);

    assert.equal(result.text, 'hello');
    assert.equal(result.file, undefined);
  });

  it('returns empty object for empty FormData', () => {
    const formData = new FormData();
    const result = parseFormDataPayload(formData);
    assert.deepEqual(result, {});
  });
});

// =============================================================================
// parseJsonPayload Tests
// =============================================================================

describe('parseJsonPayload', () => {
  it('parses valid JSON object', () => {
    const result = parseJsonPayload('{"key": "value", "num": 123}');
    assert.deepEqual(result, { key: 'value', num: 123 });
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => parseJsonPayload('not json'), SyntaxError);
  });

  it('throws on JSON array', () => {
    assert.throws(() => parseJsonPayload('[1, 2, 3]'), /expected object/);
  });

  it('throws on JSON primitive', () => {
    assert.throws(() => parseJsonPayload('"string"'), /expected object/);
  });

  it('throws on null', () => {
    assert.throws(() => parseJsonPayload('null'), /expected object/);
  });
});

// =============================================================================
// ECPay CheckMacValue Tests
// =============================================================================

describe('generateEcpayCheckMacValue', () => {
  // Test case based on doc/RUNBOOK.md (Payments) example
  // Using known values to verify the algorithm implementation
  const testHashKey = 'pwFHCqoQZGmho4w6';
  const testHashIV = 'EkRm7iFT261dpevs';

  it('generates correct CheckMacValue for known input', () => {
    const params = {
      MerchantID: '3002607',
      MerchantTradeNo: 'TEST1234567890',
      MerchantTradeDate: '2024/01/15 12:00:00',
      PaymentType: 'aio',
      TotalAmount: '100',
      TradeDesc: 'TestOrder',
      ItemName: 'TestItem',
      ReturnURL: 'https://example.com/callback',
      ChoosePayment: 'ALL',
      EncryptType: '1',
    };

    const result = generateEcpayCheckMacValue(params, testHashKey, testHashIV);

    // Assert exact expected hash (computed with ECPay algorithm)
    const expectedHash = 'A02A0A97A58D025AB74A2F4F4D86BCE9BDAACB802DBC7E91043003E4D36C1E81';
    assert.equal(result, expectedHash);
  });

  it('removes existing CheckMacValue from params before calculation', () => {
    const params1 = { A: '1', B: '2' };
    const params2 = { A: '1', B: '2', CheckMacValue: 'SHOULD_BE_IGNORED' };

    const result1 = generateEcpayCheckMacValue(params1, testHashKey, testHashIV);
    const result2 = generateEcpayCheckMacValue(params2, testHashKey, testHashIV);

    assert.equal(result1, result2);
  });

  it('sorts parameters alphabetically', () => {
    const params1 = { Z: '1', A: '2' };
    const params2 = { A: '2', Z: '1' };

    const result1 = generateEcpayCheckMacValue(params1, testHashKey, testHashIV);
    const result2 = generateEcpayCheckMacValue(params2, testHashKey, testHashIV);

    assert.equal(result1, result2);
  });
});

describe('validateEcpayCheckMacValue', () => {
  const testHashKey = 'pwFHCqoQZGmho4w6';
  const testHashIV = 'EkRm7iFT261dpevs';

  it('returns true for valid signature', () => {
    const params = { A: '1', B: '2' };
    const checkMac = generateEcpayCheckMacValue(params, testHashKey, testHashIV);
    const paramsWithMac = { ...params, CheckMacValue: checkMac };

    const result = validateEcpayCheckMacValue(paramsWithMac, testHashKey, testHashIV);
    assert.equal(result, true);
  });

  it('returns false for invalid signature', () => {
    const params = { A: '1', B: '2', CheckMacValue: 'INVALID_SIGNATURE' };

    const result = validateEcpayCheckMacValue(params, testHashKey, testHashIV);
    assert.equal(result, false);
  });

  it('returns false when CheckMacValue is missing', () => {
    const params = { A: '1', B: '2' };

    const result = validateEcpayCheckMacValue(params, testHashKey, testHashIV);
    assert.equal(result, false);
  });

  it('is case-insensitive for CheckMacValue', () => {
    const params = { A: '1', B: '2' };
    const checkMac = generateEcpayCheckMacValue(params, testHashKey, testHashIV);
    const paramsWithLowerMac = { ...params, CheckMacValue: checkMac.toLowerCase() };

    const result = validateEcpayCheckMacValue(paramsWithLowerMac, testHashKey, testHashIV);
    assert.equal(result, true);
  });
});

// =============================================================================
// LINE Pay Signature Tests
// =============================================================================

describe('generateLinePaySignature', () => {
  const testChannelSecret = 'testchannelsecret123456789012345';

  it('generates Base64 encoded signature with exact expected output', () => {
    const rawBody = '{"amount":100}';
    const uri = '/v4/payments/request';
    const nonce = 'test-nonce-12345';

    const result = generateLinePaySignature(rawBody, uri, testChannelSecret, nonce);

    // Assert exact expected Base64 signature (computed with LINE Pay algorithm)
    // message = channelSecret + uri + rawBody + nonce
    const expectedSignature = 'v+fjc/8N1kRxMUSySspXEvjyJuiW+wzB9hzM795VnSE=';
    assert.equal(result, expectedSignature);
  });

  it('produces different signatures for different inputs', () => {
    const uri = '/v4/payments/request';
    const nonce = 'test-nonce';

    const sig1 = generateLinePaySignature('{"a":1}', uri, testChannelSecret, nonce);
    const sig2 = generateLinePaySignature('{"a":2}', uri, testChannelSecret, nonce);

    assert.notEqual(sig1, sig2);
  });

  it('produces different signatures for different nonces', () => {
    const rawBody = '{"amount":100}';
    const uri = '/v4/payments/request';

    const sig1 = generateLinePaySignature(rawBody, uri, testChannelSecret, 'nonce1');
    const sig2 = generateLinePaySignature(rawBody, uri, testChannelSecret, 'nonce2');

    assert.notEqual(sig1, sig2);
  });
});

describe('validateLinePaySignature', () => {
  const testChannelSecret = 'testchannelsecret123456789012345';

  it('returns true for valid signature', () => {
    const rawBody = '{"amount":100}';
    const uri = '/v4/payments/request';
    const nonce = 'test-nonce';

    const signature = generateLinePaySignature(rawBody, uri, testChannelSecret, nonce);

    const result = validateLinePaySignature(rawBody, uri, testChannelSecret, nonce, signature);
    assert.equal(result, true);
  });

  it('returns false for invalid signature', () => {
    const rawBody = '{"amount":100}';
    const uri = '/v4/payments/request';
    const nonce = 'test-nonce';

    const result = validateLinePaySignature(rawBody, uri, testChannelSecret, nonce, 'invalid');
    assert.equal(result, false);
  });

  it('returns false for empty signature', () => {
    const result = validateLinePaySignature('{}', '/api', testChannelSecret, 'nonce', '');
    assert.equal(result, false);
  });

  it('returns false for empty nonce', () => {
    const result = validateLinePaySignature('{}', '/api', testChannelSecret, '', 'sig');
    assert.equal(result, false);
  });
});

// =============================================================================
// Event ID Builders Tests
// =============================================================================

describe('buildEcpayEventId', () => {
  it('uses TradeNo as primary ID', () => {
    const params = { TradeNo: 'TRADE123', MerchantTradeNo: 'MERCHANT456' };
    const result = buildEcpayEventId(params);
    assert.equal(result, 'TRADE123');
  });

  it('falls back to MerchantTradeNo', () => {
    const params = { MerchantTradeNo: 'MERCHANT456' };
    const result = buildEcpayEventId(params);
    assert.equal(result, 'MERCHANT456');
  });

  it('throws when both are missing', () => {
    const params = {};
    assert.throws(() => buildEcpayEventId(params), /missing TradeNo/);
  });
});

describe('buildLinePayEventId', () => {
  it('uses transactionId as string', () => {
    const payload = { transactionId: '1234567890' };
    const result = buildLinePayEventId(payload);
    assert.equal(result, '1234567890');
  });

  it('converts numeric transactionId to string', () => {
    const payload = { transactionId: 1234567890 };
    const result = buildLinePayEventId(payload);
    assert.equal(result, '1234567890');
  });

  it('throws when transactionId is missing', () => {
    const payload = {};
    assert.throws(() => buildLinePayEventId(payload), /missing transactionId/);
  });
});

// =============================================================================
// Stripe Signature Tests
// =============================================================================

describe('parseStripeSignatureHeader', () => {
  it('parses valid header with timestamp and v1 signature', () => {
    const header = 't=1234567890,v1=abc123def456';
    const result = parseStripeSignatureHeader(header);
    
    assert.ok(result !== null);
    assert.equal(result.timestamp, 1234567890);
    assert.deepEqual(result.signatures, ['abc123def456']);
  });

  it('handles multiple v1 signatures', () => {
    const header = 't=1234567890,v1=sig1,v1=sig2';
    const result = parseStripeSignatureHeader(header);
    
    assert.ok(result !== null);
    assert.deepEqual(result.signatures, ['sig1', 'sig2']);
  });

  it('ignores v0 signatures', () => {
    const header = 't=1234567890,v0=old_sig,v1=new_sig';
    const result = parseStripeSignatureHeader(header);
    
    assert.ok(result !== null);
    assert.deepEqual(result.signatures, ['new_sig']);
  });

  it('returns null for missing timestamp', () => {
    const header = 'v1=abc123';
    const result = parseStripeSignatureHeader(header);
    assert.equal(result, null);
  });

  it('returns null for missing v1 signature', () => {
    const header = 't=1234567890';
    const result = parseStripeSignatureHeader(header);
    assert.equal(result, null);
  });
});

describe('computeStripeSignature', () => {
  it('computes correct HMAC-SHA256 hex signature', () => {
    const rawBody = '{"test":"data"}';
    const timestamp = 1234567890;
    const secret = 'whsec_testsecret12345678901234567';

    const result = computeStripeSignature(rawBody, timestamp, secret);

    // Verify it's a hex string (64 chars for SHA256)
    assert.match(result, /^[a-f0-9]{64}$/);
  });

  it('produces different signatures for different bodies', () => {
    const timestamp = 1234567890;
    const secret = 'whsec_testsecret12345678901234567';

    const sig1 = computeStripeSignature('body1', timestamp, secret);
    const sig2 = computeStripeSignature('body2', timestamp, secret);

    assert.notEqual(sig1, sig2);
  });

  it('produces different signatures for different timestamps', () => {
    const rawBody = '{"test":"data"}';
    const secret = 'whsec_testsecret12345678901234567';

    const sig1 = computeStripeSignature(rawBody, 1000, secret);
    const sig2 = computeStripeSignature(rawBody, 2000, secret);

    assert.notEqual(sig1, sig2);
  });

  it('produces different signatures for different secrets', () => {
    const rawBody = '{"test":"data"}';
    const timestamp = 1234567890;

    const sig1 = computeStripeSignature(rawBody, timestamp, 'secret1_12345678901234567');
    const sig2 = computeStripeSignature(rawBody, timestamp, 'secret2_12345678901234567');

    assert.notEqual(sig1, sig2);
  });
});

describe('validateStripeWebhookSignature', () => {
  const secret = 'whsec_testsecret12345678901234567';
  const rawBody = '{"id":"evt_test"}';

  it('returns true for valid signature', () => {
    // Use recent timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const expectedSig = computeStripeSignature(rawBody, timestamp, secret);
    const header = `t=${timestamp},v1=${expectedSig}`;

    const result = validateStripeWebhookSignature(rawBody, header, secret);
    assert.equal(result, true);
  });

  it('returns false for invalid signature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v1=invalidsignature`;

    const result = validateStripeWebhookSignature(rawBody, header, secret);
    assert.equal(result, false);
  });

  it('returns false for expired timestamp (outside tolerance)', () => {
    // Use old timestamp (10 minutes ago, beyond 5 minute tolerance)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const expectedSig = computeStripeSignature(rawBody, oldTimestamp, secret);
    const header = `t=${oldTimestamp},v1=${expectedSig}`;

    const result = validateStripeWebhookSignature(rawBody, header, secret);
    assert.equal(result, false);
  });

  it('returns false for empty header', () => {
    const result = validateStripeWebhookSignature(rawBody, '', secret);
    assert.equal(result, false);
  });

  it('returns false for empty secret', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v1=somesig`;

    const result = validateStripeWebhookSignature(rawBody, header, '');
    assert.equal(result, false);
  });

  it('accepts custom tolerance', () => {
    // Use old timestamp (10 minutes ago)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const expectedSig = computeStripeSignature(rawBody, oldTimestamp, secret);
    const header = `t=${oldTimestamp},v1=${expectedSig}`;

    // Default tolerance (300s) should fail
    assert.equal(validateStripeWebhookSignature(rawBody, header, secret), false);

    // Large tolerance (3600s) should pass
    assert.equal(validateStripeWebhookSignature(rawBody, header, secret, 3600), true);
  });
});

describe('buildStripeEventId', () => {
  it('extracts event ID from payload', () => {
    const payload: StripeWebhookPayload = {
      id: 'evt_1234567890',
      type: 'checkout.session.completed',
      data: { object: {} },
    };
    
    const result = buildStripeEventId(payload);
    assert.equal(result, 'evt_1234567890');
  });

  it('throws when id is missing', () => {
    const payload = {
      type: 'checkout.session.completed',
      data: { object: {} },
    } as unknown as StripeWebhookPayload;

    assert.throws(() => buildStripeEventId(payload), /missing id/);
  });
});

describe('extractStripeOrderId', () => {
  it('extracts order_id from metadata', () => {
    const payload: StripeWebhookPayload = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          metadata: {
            order_id: 'order-uuid-12345',
          },
        },
      },
    };

    const result = extractStripeOrderId(payload);
    assert.equal(result, 'order-uuid-12345');
  });

  it('returns null when metadata is missing', () => {
    const payload: StripeWebhookPayload = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
        },
      },
    };

    const result = extractStripeOrderId(payload);
    assert.equal(result, null);
  });

  it('returns null when order_id is missing in metadata', () => {
    const payload: StripeWebhookPayload = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          metadata: {},
        },
      },
    };

    const result = extractStripeOrderId(payload);
    assert.equal(result, null);
  });
});
