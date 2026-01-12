import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runSpamDecision,
  runLocalChecks,
  checkRateLimited,
  checkHoneypot,
  checkContentValidation,
  checkBlacklist,
  checkLocalPendingConditions,
  applyAkismetResult,
  applyRecaptchaResult,
  applyModerationMode,
  type SpamEngineInput,
} from '../lib/spam/engine';

// ========================================
// Test Helpers
// ========================================

function createBaseInput(overrides: Partial<SpamEngineInput> = {}): SpamEngineInput {
  return {
    content: 'This is a valid comment.',
    linkCount: 0,
    isRepetitive: false,
    userEmail: 'user@example.com',
    ipHash: 'abc123',
    honeypotTriggered: false,
    rateLimited: false,
    hasApprovedBefore: true,
    contentRejected: false,
    settings: {
      enableHoneypot: true,
      maxLinksBeforeModeration: 2,
      moderationMode: 'auto',
      enableAkismet: false,
      enableRecaptcha: false,
      recaptchaThreshold: 0.5,
    },
    blacklist: {
      keywords: [],
      ips: [],
      emails: [],
      domains: [],
    },
    ...overrides,
  };
}

// ========================================
// Rate Limit Tests
// ========================================

describe('checkRateLimited', () => {
  it('returns rate_limited when rateLimited is true', () => {
    const input = createBaseInput({ rateLimited: true });
    const result = checkRateLimited(input);
    assert.strictEqual(result?.decision, 'rate_limited');
    assert.strictEqual(result?.reason, 'Rate limit exceeded');
  });

  it('returns null when not rate limited', () => {
    const input = createBaseInput({ rateLimited: false });
    const result = checkRateLimited(input);
    assert.strictEqual(result, null);
  });
});

// ========================================
// Honeypot Tests
// ========================================

describe('checkHoneypot', () => {
  it('returns reject when honeypot is triggered and enabled', () => {
    const input = createBaseInput({
      honeypotTriggered: true,
      settings: { ...createBaseInput().settings, enableHoneypot: true },
    });
    const result = checkHoneypot(input);
    assert.strictEqual(result?.decision, 'reject');
    assert.strictEqual(result?.isSpam, true);
  });

  it('returns null when honeypot is disabled', () => {
    const input = createBaseInput({
      honeypotTriggered: true,
      settings: { ...createBaseInput().settings, enableHoneypot: false },
    });
    const result = checkHoneypot(input);
    assert.strictEqual(result, null);
  });

  it('returns null when honeypot is not triggered', () => {
    const input = createBaseInput({ honeypotTriggered: false });
    const result = checkHoneypot(input);
    assert.strictEqual(result, null);
  });
});

// ========================================
// Content Validation Tests
// ========================================

describe('checkContentValidation', () => {
  it('returns reject when content is rejected', () => {
    const input = createBaseInput({
      contentRejected: true,
      contentRejectReason: 'Contains dangerous content',
    });
    const result = checkContentValidation(input);
    assert.strictEqual(result?.decision, 'reject');
    assert.strictEqual(result?.reason, 'Contains dangerous content');
  });

  it('returns null when content is valid', () => {
    const input = createBaseInput({ contentRejected: false });
    const result = checkContentValidation(input);
    assert.strictEqual(result, null);
  });
});

// ========================================
// Blacklist Tests
// ========================================

describe('checkBlacklist', () => {
  it('rejects blacklisted keyword', () => {
    const input = createBaseInput({
      content: 'Buy cheap viagra now!',
      blacklist: { keywords: ['viagra'], ips: [], emails: [], domains: [] },
    });
    const result = checkBlacklist(input);
    assert.strictEqual(result?.decision, 'reject');
    assert.ok(result?.reason.includes('viagra'));
    assert.strictEqual(result?.isSpam, true);
  });

  it('rejects blacklisted IP', () => {
    const input = createBaseInput({
      ipHash: 'banned-ip-hash',
      blacklist: { keywords: [], ips: ['banned-ip-hash'], emails: [], domains: [] },
    });
    const result = checkBlacklist(input);
    assert.strictEqual(result?.decision, 'reject');
    assert.strictEqual(result?.reason, 'IP blacklisted');
  });

  it('rejects blacklisted email', () => {
    const input = createBaseInput({
      userEmail: 'spammer@evil.com',
      blacklist: { keywords: [], ips: [], emails: ['spammer@evil.com'], domains: [] },
    });
    const result = checkBlacklist(input);
    assert.strictEqual(result?.decision, 'reject');
    assert.strictEqual(result?.reason, 'Email blacklisted');
  });

  it('rejects blacklisted domain', () => {
    const input = createBaseInput({
      userEmail: 'anyone@spam-domain.com',
      blacklist: { keywords: [], ips: [], emails: [], domains: ['spam-domain.com'] },
    });
    const result = checkBlacklist(input);
    assert.strictEqual(result?.decision, 'reject');
    assert.ok(result?.reason.includes('spam-domain.com'));
  });

  it('returns null when not blacklisted', () => {
    const input = createBaseInput();
    const result = checkBlacklist(input);
    assert.strictEqual(result, null);
  });
});

// ========================================
// Local Pending Conditions Tests
// ========================================

describe('checkLocalPendingConditions', () => {
  it('returns pending for repetitive content', () => {
    const input = createBaseInput({ isRepetitive: true });
    const result = checkLocalPendingConditions(input);
    assert.strictEqual(result?.decision, 'pending');
    assert.ok(result?.reason.includes('Repetitive'));
  });

  it('returns pending for too many links', () => {
    const input = createBaseInput({
      linkCount: 5,
      settings: { ...createBaseInput().settings, maxLinksBeforeModeration: 2 },
    });
    const result = checkLocalPendingConditions(input);
    assert.strictEqual(result?.decision, 'pending');
    assert.ok(result?.reason.includes('links'));
  });

  it('returns null when all conditions pass', () => {
    const input = createBaseInput();
    const result = checkLocalPendingConditions(input);
    assert.strictEqual(result, null);
  });
});

// ========================================
// Akismet Result Tests
// ========================================

describe('applyAkismetResult', () => {
  it('returns spam for high-confidence Akismet detection', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableAkismet: true },
      akismetResult: { configured: true, isSpam: true, proTip: 'discard' },
    });
    const result = applyAkismetResult(input, 'allow');
    assert.strictEqual(result?.decision, 'spam');
    assert.strictEqual(result?.isSpam, true);
  });

  it('returns pending for regular Akismet spam detection', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableAkismet: true },
      akismetResult: { configured: true, isSpam: true },
    });
    const result = applyAkismetResult(input, 'allow');
    assert.strictEqual(result?.decision, 'pending');
  });

  it('returns null when Akismet is disabled', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableAkismet: false },
      akismetResult: { configured: true, isSpam: true },
    });
    const result = applyAkismetResult(input, 'allow');
    assert.strictEqual(result, null);
  });

  it('returns null when Akismet result is not spam', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableAkismet: true },
      akismetResult: { configured: true, isSpam: false },
    });
    const result = applyAkismetResult(input, 'allow');
    assert.strictEqual(result, null);
  });

  it('returns null when already rejected', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableAkismet: true },
      akismetResult: { configured: true, isSpam: true },
    });
    const result = applyAkismetResult(input, 'reject');
    assert.strictEqual(result, null);
  });
});

// ========================================
// reCAPTCHA Result Tests
// ========================================

describe('applyRecaptchaResult', () => {
  it('returns pending for low reCAPTCHA score', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableRecaptcha: true, recaptchaThreshold: 0.5 },
      recaptchaResult: { success: true, score: 0.3 },
      recaptchaSecretConfigured: true,
      recaptchaTokenProvided: true,
    });
    const result = applyRecaptchaResult(input, 'allow');
    assert.strictEqual(result?.decision, 'pending');
    assert.ok(result?.reason.includes('0.3'));
  });

  it('returns pending when reCAPTCHA secret not configured', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableRecaptcha: true },
      recaptchaSecretConfigured: false,
    });
    const result = applyRecaptchaResult(input, 'allow');
    assert.strictEqual(result?.decision, 'pending');
    assert.ok(result?.reason.includes('missing secret'));
  });

  it('returns pending when token not provided', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableRecaptcha: true },
      recaptchaSecretConfigured: true,
      recaptchaTokenProvided: false,
    });
    const result = applyRecaptchaResult(input, 'allow');
    assert.strictEqual(result?.decision, 'pending');
    assert.ok(result?.reason.includes('token missing'));
  });

  it('returns null when reCAPTCHA passes', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableRecaptcha: true, recaptchaThreshold: 0.5 },
      recaptchaResult: { success: true, score: 0.9 },
      recaptchaSecretConfigured: true,
      recaptchaTokenProvided: true,
    });
    const result = applyRecaptchaResult(input, 'allow');
    assert.strictEqual(result, null);
  });

  it('returns null when reCAPTCHA is disabled', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableRecaptcha: false },
      recaptchaResult: { success: true, score: 0.1 },
    });
    const result = applyRecaptchaResult(input, 'allow');
    assert.strictEqual(result, null);
  });
});

// ========================================
// Moderation Mode Tests
// ========================================

describe('applyModerationMode', () => {
  it('returns pending for all moderation mode', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, moderationMode: 'all' },
    });
    const result = applyModerationMode(input);
    assert.strictEqual(result?.decision, 'pending');
    assert.ok(result?.reason.includes('All comments'));
  });

  it('returns pending for first-time commenter in first_time mode', () => {
    const input = createBaseInput({
      hasApprovedBefore: false,
      settings: { ...createBaseInput().settings, moderationMode: 'first_time' },
    });
    const result = applyModerationMode(input);
    assert.strictEqual(result?.decision, 'pending');
    assert.ok(result?.reason.includes('First-time'));
  });

  it('returns null for returning commenter in first_time mode', () => {
    const input = createBaseInput({
      hasApprovedBefore: true,
      settings: { ...createBaseInput().settings, moderationMode: 'first_time' },
    });
    const result = applyModerationMode(input);
    assert.strictEqual(result, null);
  });

  it('returns null for auto mode', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, moderationMode: 'auto' },
    });
    const result = applyModerationMode(input);
    assert.strictEqual(result, null);
  });
});

// ========================================
// Full Pipeline Tests
// ========================================

describe('runLocalChecks', () => {
  it('prioritizes rate limit over other checks', () => {
    const input = createBaseInput({
      rateLimited: true,
      honeypotTriggered: true,
    });
    const result = runLocalChecks(input);
    assert.strictEqual(result.decision, 'rate_limited');
  });

  it('prioritizes honeypot over content/blacklist', () => {
    const input = createBaseInput({
      honeypotTriggered: true,
      contentRejected: true,
    });
    const result = runLocalChecks(input);
    assert.strictEqual(result.decision, 'reject');
    assert.ok(result.reason.includes('honeypot'));
  });

  it('returns allow when all local checks pass', () => {
    const input = createBaseInput();
    const result = runLocalChecks(input);
    assert.strictEqual(result.decision, 'allow');
    assert.strictEqual(result.isApproved, true);
  });
});

describe('runSpamDecision (full pipeline)', () => {
  it('allows clean comment with auto moderation', () => {
    const input = createBaseInput();
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'allow');
    assert.strictEqual(result.isApproved, true);
    assert.strictEqual(result.isSpam, false);
  });

  it('rejects rate-limited comment', () => {
    const input = createBaseInput({ rateLimited: true });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'rate_limited');
  });

  it('rejects honeypot-triggered comment', () => {
    const input = createBaseInput({ honeypotTriggered: true });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'reject');
    assert.strictEqual(result.isSpam, true);
  });

  it('rejects blacklisted keyword', () => {
    const input = createBaseInput({
      content: 'Buy cheap stuff here',
      blacklist: { keywords: ['cheap'], ips: [], emails: [], domains: [] },
    });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'reject');
    assert.strictEqual(result.isSpam, true);
  });

  it('marks as pending for too many links', () => {
    const input = createBaseInput({
      linkCount: 10,
      settings: { ...createBaseInput().settings, maxLinksBeforeModeration: 2 },
    });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'pending');
  });

  it('marks as spam for high-confidence Akismet', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableAkismet: true },
      akismetResult: { configured: true, isSpam: true, proTip: 'discard' },
    });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'spam');
    assert.strictEqual(result.isSpam, true);
  });

  it('marks as pending for low reCAPTCHA score', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, enableRecaptcha: true, recaptchaThreshold: 0.5 },
      recaptchaResult: { success: true, score: 0.2 },
      recaptchaSecretConfigured: true,
      recaptchaTokenProvided: true,
    });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'pending');
  });

  it('requires moderation for first-time commenter', () => {
    const input = createBaseInput({
      hasApprovedBefore: false,
      settings: { ...createBaseInput().settings, moderationMode: 'first_time' },
    });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'pending');
  });

  it('requires moderation in all mode', () => {
    const input = createBaseInput({
      settings: { ...createBaseInput().settings, moderationMode: 'all' },
    });
    const result = runSpamDecision(input);
    assert.strictEqual(result.decision, 'pending');
  });
});
