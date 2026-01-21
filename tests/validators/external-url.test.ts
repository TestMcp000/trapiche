/**
 * External URL Validator Tests
 *
 * Tests for the external URL validator (https: and mailto: allowlist).
 * Covers valid URLs, dangerous protocols, and edge cases.
 *
 * @see lib/validators/external-url.ts
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-11.1)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    validateExternalUrl,
    validateOptionalExternalUrl,
    isValidExternalUrl,
    ALLOWED_URL_PROTOCOLS,
    DANGEROUS_PROTOCOLS,
} from '@/lib/validators/external-url';

describe('external-url validator', () => {
    describe('validateExternalUrl', () => {
        describe('valid URLs', () => {
            it('accepts https URLs', () => {
                const result = validateExternalUrl('https://example.com');
                assert.strictEqual(result.valid, true);
                assert.strictEqual(result.data, 'https://example.com');
            });

            it('accepts https URLs with paths', () => {
                const result = validateExternalUrl('https://example.com/path/to/page');
                assert.strictEqual(result.valid, true);
                assert.strictEqual(result.data, 'https://example.com/path/to/page');
            });

            it('accepts https URLs with query params', () => {
                const result = validateExternalUrl('https://example.com?foo=bar&baz=qux');
                assert.strictEqual(result.valid, true);
                assert.strictEqual(result.data, 'https://example.com?foo=bar&baz=qux');
            });

            it('accepts mailto URLs', () => {
                const result = validateExternalUrl('mailto:test@example.com');
                assert.strictEqual(result.valid, true);
                assert.strictEqual(result.data, 'mailto:test@example.com');
            });

            it('accepts mailto URLs with subject', () => {
                const result = validateExternalUrl('mailto:test@example.com?subject=Hello');
                assert.strictEqual(result.valid, true);
            });

            it('trims whitespace', () => {
                const result = validateExternalUrl('  https://example.com  ');
                assert.strictEqual(result.valid, true);
                assert.strictEqual(result.data, 'https://example.com');
            });
        });

        describe('dangerous protocols (XSS vectors)', () => {
            it('rejects javascript: protocol', () => {
                const result = validateExternalUrl('javascript:alert(1)');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('javascript:'));
            });

            it('rejects data: protocol', () => {
                const result = validateExternalUrl('data:text/html,<script>alert(1)</script>');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('data:'));
            });

            it('rejects vbscript: protocol', () => {
                const result = validateExternalUrl('vbscript:msgbox("xss")');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('vbscript:'));
            });

            it('rejects file: protocol', () => {
                const result = validateExternalUrl('file:///etc/passwd');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('file:'));
            });
        });

        describe('disallowed protocols', () => {
            it('rejects http: protocol (not https)', () => {
                const result = validateExternalUrl('http://example.com');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('https:') || result.error?.includes('mailto:'));
            });

            it('rejects ftp: protocol', () => {
                const result = validateExternalUrl('ftp://example.com/file.txt');
                assert.strictEqual(result.valid, false);
            });

            it('rejects tel: protocol', () => {
                const result = validateExternalUrl('tel:+1234567890');
                assert.strictEqual(result.valid, false);
            });
        });

        describe('protocol-relative URLs', () => {
            it('rejects protocol-relative URLs', () => {
                const result = validateExternalUrl('//example.com/path');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('//'));
            });
        });

        describe('invalid inputs', () => {
            it('rejects null', () => {
                const result = validateExternalUrl(null);
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('必填'));
            });

            it('rejects undefined', () => {
                const result = validateExternalUrl(undefined);
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('必填'));
            });

            it('rejects empty string', () => {
                const result = validateExternalUrl('');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('必填'));
            });

            it('rejects whitespace-only string', () => {
                const result = validateExternalUrl('   ');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('必填'));
            });

            it('rejects malformed URLs', () => {
                const result = validateExternalUrl('not a valid url');
                assert.strictEqual(result.valid, false);
                assert.ok(result.error?.includes('格式無效'));
            });

            it('rejects relative paths', () => {
                const result = validateExternalUrl('/path/to/page');
                assert.strictEqual(result.valid, false);
            });
        });
    });

    describe('validateOptionalExternalUrl', () => {
        it('returns null for null input', () => {
            const result = validateOptionalExternalUrl(null);
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.data, null);
        });

        it('returns null for undefined input', () => {
            const result = validateOptionalExternalUrl(undefined);
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.data, null);
        });

        it('returns null for empty string', () => {
            const result = validateOptionalExternalUrl('');
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.data, null);
        });

        it('validates non-empty URLs like validateExternalUrl', () => {
            const validResult = validateOptionalExternalUrl('https://example.com');
            assert.strictEqual(validResult.valid, true);
            assert.strictEqual(validResult.data, 'https://example.com');

            const invalidResult = validateOptionalExternalUrl('javascript:alert(1)');
            assert.strictEqual(invalidResult.valid, false);
        });
    });

    describe('isValidExternalUrl', () => {
        it('returns true for valid https URL', () => {
            assert.strictEqual(isValidExternalUrl('https://example.com'), true);
        });

        it('returns true for valid mailto URL', () => {
            assert.strictEqual(isValidExternalUrl('mailto:test@example.com'), true);
        });

        it('returns false for javascript URL', () => {
            assert.strictEqual(isValidExternalUrl('javascript:alert(1)'), false);
        });

        it('returns false for empty string', () => {
            assert.strictEqual(isValidExternalUrl(''), false);
        });

        it('returns false for null', () => {
            assert.strictEqual(isValidExternalUrl(null), false);
        });
    });

    describe('constants', () => {
        it('ALLOWED_URL_PROTOCOLS contains https and mailto', () => {
            assert.ok(ALLOWED_URL_PROTOCOLS.includes('https:'));
            assert.ok(ALLOWED_URL_PROTOCOLS.includes('mailto:'));
            assert.strictEqual(ALLOWED_URL_PROTOCOLS.length, 2);
        });

        it('DANGEROUS_PROTOCOLS contains known XSS vectors', () => {
            assert.ok(DANGEROUS_PROTOCOLS.includes('javascript:'));
            assert.ok(DANGEROUS_PROTOCOLS.includes('data:'));
            assert.ok(DANGEROUS_PROTOCOLS.includes('vbscript:'));
            assert.ok(DANGEROUS_PROTOCOLS.includes('file:'));
        });
    });
});
