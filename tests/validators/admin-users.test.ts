/**
 * Admin Users Query Validator Unit Tests
 *
 * Tests for lib/validators/admin-users.ts
 *
 * @see lib/validators/admin-users.ts
 * @see doc/SPEC.md #users-admin (query contract)
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    validateAdminUsersQuery,
    isShortIdFormat,
    normalizeShortId,
    _testing,
} from '@/lib/validators/admin-users';

const {
    sanitizeSearchQuery,
    sanitizeTag,
    parsePage,
    parsePageSize,
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_Q_LENGTH,
    MAX_TAG_LENGTH,
} = _testing;

// =============================================================================
// sanitizeSearchQuery
// =============================================================================

test('sanitizeSearchQuery: valid strings', () => {
    assert.equal(sanitizeSearchQuery('test@email.com'), 'test@email.com');
    assert.equal(sanitizeSearchQuery('C123'), 'C123');
    assert.equal(sanitizeSearchQuery('user-id-123'), 'user-id-123');
});

test('sanitizeSearchQuery: trims whitespace', () => {
    assert.equal(sanitizeSearchQuery('  test  '), 'test');
    assert.equal(sanitizeSearchQuery('\tquery\n'), 'query');
});

test('sanitizeSearchQuery: empty string returns undefined', () => {
    assert.equal(sanitizeSearchQuery(''), undefined);
    assert.equal(sanitizeSearchQuery('   '), undefined);
});

test('sanitizeSearchQuery: non-string returns undefined', () => {
    assert.equal(sanitizeSearchQuery(null), undefined);
    assert.equal(sanitizeSearchQuery(undefined), undefined);
    assert.equal(sanitizeSearchQuery(123), undefined);
    assert.equal(sanitizeSearchQuery({}), undefined);
});

test('sanitizeSearchQuery: truncates long strings', () => {
    const longString = 'a'.repeat(MAX_Q_LENGTH + 50);
    const result = sanitizeSearchQuery(longString);
    assert.equal(result?.length, MAX_Q_LENGTH);
});

test('sanitizeSearchQuery: removes disallowed characters', () => {
    assert.equal(sanitizeSearchQuery('test,value'), 'testvalue');
    assert.equal(sanitizeSearchQuery('test{value}'), 'testvalue');
    assert.equal(sanitizeSearchQuery('test(value)'), 'testvalue');
    assert.equal(sanitizeSearchQuery('test[value]'), 'testvalue');
    assert.equal(sanitizeSearchQuery('test\\value'), 'testvalue');
});

test('sanitizeSearchQuery: returns undefined if only disallowed chars', () => {
    assert.equal(sanitizeSearchQuery(',{}()[]\\'), undefined);
});

// =============================================================================
// sanitizeTag
// =============================================================================

test('sanitizeTag: valid strings', () => {
    assert.equal(sanitizeTag('VIP'), 'VIP');
    assert.equal(sanitizeTag('Premium User'), 'Premium User');
});

test('sanitizeTag: trims whitespace', () => {
    assert.equal(sanitizeTag('  tag  '), 'tag');
});

test('sanitizeTag: empty string returns undefined', () => {
    assert.equal(sanitizeTag(''), undefined);
    assert.equal(sanitizeTag('   '), undefined);
});

test('sanitizeTag: non-string returns undefined', () => {
    assert.equal(sanitizeTag(null), undefined);
    assert.equal(sanitizeTag(undefined), undefined);
    assert.equal(sanitizeTag(123), undefined);
});

test('sanitizeTag: truncates long strings', () => {
    const longString = 'a'.repeat(MAX_TAG_LENGTH + 50);
    const result = sanitizeTag(longString);
    assert.equal(result?.length, MAX_TAG_LENGTH);
});

// =============================================================================
// parsePage
// =============================================================================

test('parsePage: valid page numbers', () => {
    assert.equal(parsePage('1'), 1);
    assert.equal(parsePage('2'), 2);
    assert.equal(parsePage('100'), 100);
});

test('parsePage: invalid page returns default', () => {
    assert.equal(parsePage('0'), DEFAULT_PAGE);
    assert.equal(parsePage('-1'), DEFAULT_PAGE);
    assert.equal(parsePage('abc'), DEFAULT_PAGE);
    assert.equal(parsePage(''), DEFAULT_PAGE);
});

test('parsePage: non-string returns default', () => {
    assert.equal(parsePage(null), DEFAULT_PAGE);
    assert.equal(parsePage(undefined), DEFAULT_PAGE);
    assert.equal(parsePage(5), DEFAULT_PAGE);
});

// =============================================================================
// parsePageSize
// =============================================================================

test('parsePageSize: valid page sizes', () => {
    assert.equal(parsePageSize('20'), 20);
    assert.equal(parsePageSize('50'), 50);
    assert.equal(parsePageSize('100'), 100);
});

test('parsePageSize: invalid page size returns default', () => {
    assert.equal(parsePageSize('30'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize('0'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize('-50'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize('abc'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize(''), DEFAULT_PAGE_SIZE);
});

test('parsePageSize: non-string returns default', () => {
    assert.equal(parsePageSize(null), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize(undefined), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize(50), DEFAULT_PAGE_SIZE);
});

// =============================================================================
// isShortIdFormat
// =============================================================================

test('isShortIdFormat: valid short_id formats', () => {
    assert.ok(isShortIdFormat('C1'));
    assert.ok(isShortIdFormat('C12'));
    assert.ok(isShortIdFormat('C123'));
    assert.ok(isShortIdFormat('c1'));
    assert.ok(isShortIdFormat('c12'));
    assert.ok(isShortIdFormat('C999999'));
});

test('isShortIdFormat: invalid formats', () => {
    assert.ok(!isShortIdFormat('test'));
    assert.ok(!isShortIdFormat('12'));
    assert.ok(!isShortIdFormat('C'));
    assert.ok(!isShortIdFormat('CC12'));
    assert.ok(!isShortIdFormat('C12a'));
    assert.ok(!isShortIdFormat(''));
    assert.ok(!isShortIdFormat('user@email.com'));
});

// =============================================================================
// normalizeShortId
// =============================================================================

test('normalizeShortId: converts to uppercase', () => {
    assert.equal(normalizeShortId('c12'), 'C12');
    assert.equal(normalizeShortId('C12'), 'C12');
    assert.equal(normalizeShortId('  c123  '), 'C123');
});

// =============================================================================
// validateAdminUsersQuery - Full Integration Tests
// =============================================================================

test('validateAdminUsersQuery: minimal params returns defaults', () => {
    const result = validateAdminUsersQuery({});
    assert.ok(result.valid);
    assert.equal(result.data?.tag, undefined);
    assert.equal(result.data?.q, undefined);
    assert.equal(result.data?.qMode, 'text');
    assert.equal(result.data?.page, DEFAULT_PAGE);
    assert.equal(result.data?.pageSize, DEFAULT_PAGE_SIZE);
    assert.equal(result.data?.limit, DEFAULT_PAGE_SIZE);
    assert.equal(result.data?.offset, 0);
});

test('validateAdminUsersQuery: text search mode', () => {
    const result = validateAdminUsersQuery({ q: 'test@email.com' });
    assert.ok(result.valid);
    assert.equal(result.data?.q, 'test@email.com');
    assert.equal(result.data?.qMode, 'text');
});

test('validateAdminUsersQuery: short_id search mode', () => {
    const result = validateAdminUsersQuery({ q: 'C12' });
    assert.ok(result.valid);
    assert.equal(result.data?.q, 'C12');
    assert.equal(result.data?.qMode, 'short_id');
});

test('validateAdminUsersQuery: short_id case insensitive', () => {
    const result = validateAdminUsersQuery({ q: 'c123' });
    assert.ok(result.valid);
    assert.equal(result.data?.q, 'c123');
    assert.equal(result.data?.qMode, 'short_id');
});

test('validateAdminUsersQuery: pagination calculation', () => {
    const result = validateAdminUsersQuery({ page: '3', pageSize: '20' });
    assert.ok(result.valid);
    assert.equal(result.data?.page, 3);
    assert.equal(result.data?.pageSize, 20);
    assert.equal(result.data?.limit, 20);
    assert.equal(result.data?.offset, 40); // (3-1) * 20
});

test('validateAdminUsersQuery: tag filter', () => {
    const result = validateAdminUsersQuery({ tag: 'VIP' });
    assert.ok(result.valid);
    assert.equal(result.data?.tag, 'VIP');
});

test('validateAdminUsersQuery: combined params', () => {
    const result = validateAdminUsersQuery({
        tag: 'Premium',
        q: 'test',
        page: '2',
        pageSize: '100',
    });
    assert.ok(result.valid);
    assert.equal(result.data?.tag, 'Premium');
    assert.equal(result.data?.q, 'test');
    assert.equal(result.data?.qMode, 'text');
    assert.equal(result.data?.page, 2);
    assert.equal(result.data?.pageSize, 100);
    assert.equal(result.data?.limit, 100);
    assert.equal(result.data?.offset, 100); // (2-1) * 100
});

test('validateAdminUsersQuery: invalid params fallback to defaults', () => {
    const result = validateAdminUsersQuery({
        q: '   ',
        page: 'invalid',
        pageSize: '30',
    });
    assert.ok(result.valid);
    assert.equal(result.data?.q, undefined);
    assert.equal(result.data?.page, DEFAULT_PAGE);
    assert.equal(result.data?.pageSize, DEFAULT_PAGE_SIZE);
});
