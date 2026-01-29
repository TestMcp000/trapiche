import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALLOWED_SETTING_KEYS,
  MODERATION_MODES,
  isValidSettingKey,
  validateSettingValue,
  validateModerationMode,
  validateBooleanSetting,
  validateRecaptchaThreshold,
  validateRateLimit,
  validateMaxContentLength,
  validateMaxLinks,
  validateCommentSettingsPatch,
  getSettingConstraints,
} from '../lib/validators/comment-settings';

// ============================================================
// isValidSettingKey
// ============================================================

test('isValidSettingKey returns true for valid keys', () => {
  for (const key of ALLOWED_SETTING_KEYS) {
    assert.equal(isValidSettingKey(key), true, `Expected ${key} to be valid`);
  }
});

test('isValidSettingKey returns false for unknown keys', () => {
  assert.equal(isValidSettingKey('unknown_key'), false);
  assert.equal(isValidSettingKey('admin_password'), false);
  assert.equal(isValidSettingKey(''), false);
});

// ============================================================
// validateModerationMode
// ============================================================

test('validateModerationMode accepts valid modes', () => {
  for (const mode of MODERATION_MODES) {
    const result = validateModerationMode(mode);
    assert.equal(result.valid, true);
    assert.equal(result.normalizedValue, mode);
  }
});

test('validateModerationMode rejects invalid modes', () => {
  const result = validateModerationMode('invalid');
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('moderation_mode'));
});

test('validateModerationMode handles non-string input', () => {
  const result = validateModerationMode(123);
  assert.equal(result.valid, false);
});

// ============================================================
// validateBooleanSetting
// ============================================================

test('validateBooleanSetting accepts true/false strings', () => {
  assert.equal(validateBooleanSetting('enable_honeypot', 'true').valid, true);
  assert.equal(validateBooleanSetting('enable_honeypot', 'false').valid, true);
  assert.equal(validateBooleanSetting('enable_akismet', 'TRUE').valid, true);
  assert.equal(validateBooleanSetting('enable_recaptcha', 'False').valid, true);
});

test('validateBooleanSetting normalizes to lowercase', () => {
  assert.equal(
    validateBooleanSetting('enable_honeypot', 'TRUE').normalizedValue,
    'true'
  );
  assert.equal(
    validateBooleanSetting('enable_honeypot', 'FALSE').normalizedValue,
    'false'
  );
});

test('validateBooleanSetting accepts boolean values', () => {
  assert.equal(validateBooleanSetting('enable_honeypot', true).valid, true);
  assert.equal(validateBooleanSetting('enable_honeypot', false).valid, true);
});

test('validateBooleanSetting rejects non-boolean values', () => {
  assert.equal(validateBooleanSetting('enable_honeypot', 'yes').valid, false);
  assert.equal(validateBooleanSetting('enable_honeypot', '1').valid, false);
  assert.equal(validateBooleanSetting('enable_honeypot', 'on').valid, false);
});

// ============================================================
// validateRecaptchaThreshold
// ============================================================

test('validateRecaptchaThreshold accepts values between 0 and 1', () => {
  assert.equal(validateRecaptchaThreshold(0).valid, true);
  assert.equal(validateRecaptchaThreshold(0.5).valid, true);
  assert.equal(validateRecaptchaThreshold(1).valid, true);
  assert.equal(validateRecaptchaThreshold('0.3').valid, true);
});

test('validateRecaptchaThreshold normalizes to string', () => {
  assert.equal(validateRecaptchaThreshold(0.5).normalizedValue, '0.5');
});

test('validateRecaptchaThreshold rejects out of range values', () => {
  assert.equal(validateRecaptchaThreshold(-0.1).valid, false);
  assert.equal(validateRecaptchaThreshold(1.1).valid, false);
  assert.equal(validateRecaptchaThreshold(100).valid, false);
});

test('validateRecaptchaThreshold rejects non-numeric values', () => {
  assert.equal(validateRecaptchaThreshold('abc').valid, false);
  assert.equal(validateRecaptchaThreshold(NaN).valid, false);
  assert.equal(validateRecaptchaThreshold(Infinity).valid, false);
});

// ============================================================
// validateRateLimit
// ============================================================

test('validateRateLimit accepts integers between 1 and 20', () => {
  assert.equal(validateRateLimit(1).valid, true);
  assert.equal(validateRateLimit(10).valid, true);
  assert.equal(validateRateLimit(20).valid, true);
  assert.equal(validateRateLimit('5').valid, true);
});

test('validateRateLimit normalizes to string integer', () => {
  assert.equal(validateRateLimit(5).normalizedValue, '5');
  assert.equal(validateRateLimit('10').normalizedValue, '10');
});

test('validateRateLimit rejects out of range values', () => {
  assert.equal(validateRateLimit(0).valid, false);
  assert.equal(validateRateLimit(-1).valid, false);
  assert.equal(validateRateLimit(21).valid, false);
  assert.equal(validateRateLimit(100).valid, false);
});

test('validateRateLimit rejects non-integer values', () => {
  assert.equal(validateRateLimit('abc').valid, false);
  assert.equal(validateRateLimit(NaN).valid, false);
});

// ============================================================
// validateMaxContentLength
// ============================================================

test('validateMaxContentLength accepts integers between 100 and 10000', () => {
  assert.equal(validateMaxContentLength(100).valid, true);
  assert.equal(validateMaxContentLength(4000).valid, true);
  assert.equal(validateMaxContentLength(10000).valid, true);
});

test('validateMaxContentLength rejects out of range values', () => {
  assert.equal(validateMaxContentLength(99).valid, false);
  assert.equal(validateMaxContentLength(50).valid, false);
  assert.equal(validateMaxContentLength(10001).valid, false);
});

// ============================================================
// validateMaxLinks
// ============================================================

test('validateMaxLinks accepts integers between 0 and 20', () => {
  assert.equal(validateMaxLinks(0).valid, true);
  assert.equal(validateMaxLinks(2).valid, true);
  assert.equal(validateMaxLinks(20).valid, true);
});

test('validateMaxLinks rejects out of range values', () => {
  assert.equal(validateMaxLinks(-1).valid, false);
  assert.equal(validateMaxLinks(21).valid, false);
});

// ============================================================
// validateSettingValue
// ============================================================

test('validateSettingValue rejects unknown keys', () => {
  const result = validateSettingValue('unknown_key', 'value');
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('unknown_key'));
});

test('validateSettingValue routes to correct validator', () => {
  assert.equal(validateSettingValue('moderation_mode', 'auto').valid, true);
  assert.equal(validateSettingValue('enable_honeypot', 'true').valid, true);
  assert.equal(validateSettingValue('recaptcha_threshold', 0.5).valid, true);
  assert.equal(validateSettingValue('rate_limit_per_minute', 5).valid, true);
  assert.equal(validateSettingValue('max_content_length', 1000).valid, true);
  assert.equal(validateSettingValue('max_links_before_moderation', 2).valid, true);
});

// ============================================================
// validateCommentSettingsPatch (batch validation)
// ============================================================

test('validateCommentSettingsPatch rejects non-object input', () => {
  assert.equal(validateCommentSettingsPatch(null).valid, false);
  assert.equal(validateCommentSettingsPatch(undefined).valid, false);
  assert.equal(validateCommentSettingsPatch('string').valid, false);
  assert.equal(validateCommentSettingsPatch(123).valid, false);
});

test('validateCommentSettingsPatch accepts valid settings object', () => {
  const result = validateCommentSettingsPatch({
    moderation_mode: 'auto',
    enable_honeypot: 'true',
    recaptcha_threshold: '0.5',
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.validatedSettings, {
    moderation_mode: 'auto',
    enable_honeypot: 'true',
    recaptcha_threshold: '0.5',
  });
});

test('validateCommentSettingsPatch collects all errors', () => {
  const result = validateCommentSettingsPatch({
    unknown_key: 'value',
    moderation_mode: 'invalid',
    rate_limit_per_minute: 0,
  });
  assert.equal(result.valid, false);
  assert.ok('unknown_key' in result.errors);
  assert.ok('moderation_mode' in result.errors);
  assert.ok('rate_limit_per_minute' in result.errors);
});

test('validateCommentSettingsPatch normalizes values', () => {
  const result = validateCommentSettingsPatch({
    enable_akismet: 'TRUE',
    recaptcha_threshold: 0.7,
    rate_limit_per_minute: '10',
  });
  assert.equal(result.valid, true);
  assert.equal(result.validatedSettings?.enable_akismet, 'true');
  assert.equal(result.validatedSettings?.recaptcha_threshold, '0.7');
  assert.equal(result.validatedSettings?.rate_limit_per_minute, '10');
});

// ============================================================
// getSettingConstraints
// ============================================================

test('getSettingConstraints returns correct constraints for enum type', () => {
  const constraints = getSettingConstraints('moderation_mode');
  assert.equal(constraints.type, 'enum');
  assert.deepEqual(constraints.options, MODERATION_MODES);
});

test('getSettingConstraints returns correct constraints for boolean type', () => {
  assert.equal(getSettingConstraints('enable_honeypot').type, 'boolean');
  assert.equal(getSettingConstraints('enable_akismet').type, 'boolean');
  assert.equal(getSettingConstraints('enable_recaptcha').type, 'boolean');
});

test('getSettingConstraints returns correct constraints for number type', () => {
  const threshold = getSettingConstraints('recaptcha_threshold');
  assert.equal(threshold.type, 'number');
  assert.equal(threshold.min, 0);
  assert.equal(threshold.max, 1);
  assert.equal(threshold.step, 0.1);

  const rateLimit = getSettingConstraints('rate_limit_per_minute');
  assert.equal(rateLimit.type, 'number');
  assert.equal(rateLimit.min, 1);
  assert.equal(rateLimit.max, 20);

  const maxLength = getSettingConstraints('max_content_length');
  assert.equal(maxLength.type, 'number');
  assert.equal(maxLength.min, 100);
  assert.equal(maxLength.max, 10000);

  const maxLinks = getSettingConstraints('max_links_before_moderation');
  assert.equal(maxLinks.type, 'number');
  assert.equal(maxLinks.min, 0);
  assert.equal(maxLinks.max, 20);
});
