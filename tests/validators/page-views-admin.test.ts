/**
 * Page Views Admin Validator Unit Tests
 *
 * Tests for lib/validators/page-views-admin.ts
 *
 * @see lib/validators/page-views-admin.ts
 * @see doc/meta/STEP_PLAN.md - PR-3
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    validatePageViewsAdminQuery,
    _testing,
} from '@/lib/validators/page-views-admin';

const {
    isValidDateFormat,
    dateDiffDays,
    parseDateRange,
    parseLocaleFilter,
    parsePage,
    parsePageSize,
    getTodayUTC,
    getDateDaysAgoUTC,
    MAX_DATE_RANGE_DAYS,
    DEFAULT_DATE_RANGE_DAYS,
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    DEFAULT_LOCALE_FILTER,
} = _testing;

// =============================================================================
// isValidDateFormat
// =============================================================================

test('isValidDateFormat: valid dates', () => {
    assert.ok(isValidDateFormat('2026-01-01'));
    assert.ok(isValidDateFormat('2026-12-31'));
    assert.ok(isValidDateFormat('2025-02-28'));
    assert.ok(isValidDateFormat('2024-02-29')); // Leap year
});

test('isValidDateFormat: invalid dates', () => {
    assert.ok(!isValidDateFormat('2026-02-30')); // Feb 30 doesn't exist
    assert.ok(!isValidDateFormat('2025-02-29')); // Not a leap year
    assert.ok(!isValidDateFormat('2026-13-01')); // Invalid month
    assert.ok(!isValidDateFormat('2026-00-01')); // Invalid month
    assert.ok(!isValidDateFormat('2026-01-32')); // Invalid day
    assert.ok(!isValidDateFormat('2026-01-00')); // Invalid day
    assert.ok(!isValidDateFormat('invalid'));
    assert.ok(!isValidDateFormat('01-01-2026')); // Wrong format
    assert.ok(!isValidDateFormat('2026/01/01')); // Wrong separator
    assert.ok(!isValidDateFormat(''));
});

// =============================================================================
// dateDiffDays
// =============================================================================

test('dateDiffDays: calculates correctly', () => {
    assert.equal(dateDiffDays('2026-01-01', '2026-01-01'), 0);
    assert.equal(dateDiffDays('2026-01-01', '2026-01-02'), 1);
    assert.equal(dateDiffDays('2026-01-01', '2026-01-08'), 7);
    assert.equal(dateDiffDays('2026-01-01', '2026-02-01'), 31);
});

// =============================================================================
// parseDateRange
// =============================================================================

test('parseDateRange: uses defaults when no params', () => {
    const today = getTodayUTC();
    const defaultFrom = getDateDaysAgoUTC(DEFAULT_DATE_RANGE_DAYS);

    const result = parseDateRange(undefined, undefined);

    assert.equal(result.to, today);
    assert.equal(result.from, defaultFrom);
});

test('parseDateRange: accepts valid dates', () => {
    const result = parseDateRange('2026-01-01', '2026-01-07');

    assert.equal(result.from, '2026-01-01');
    assert.equal(result.to, '2026-01-07');
});

test('parseDateRange: swaps if from > to', () => {
    const result = parseDateRange('2026-01-10', '2026-01-01');

    assert.equal(result.from, '2026-01-01');
    assert.equal(result.to, '2026-01-10');
});

test('parseDateRange: clamps to max range', () => {
    const result = parseDateRange('2025-01-01', '2026-01-01');

    const diff = dateDiffDays(result.from, result.to);
    assert.ok(diff <= MAX_DATE_RANGE_DAYS);
});

test('parseDateRange: clamps future to date', () => {
    const today = getTodayUTC();
    const futureDate = '2099-12-31';

    const result = parseDateRange('2026-01-01', futureDate);

    assert.equal(result.to, today);
});

// =============================================================================
// parseLocaleFilter
// =============================================================================

test('parseLocaleFilter: valid locales', () => {
    assert.equal(parseLocaleFilter('all'), 'all');
    assert.equal(parseLocaleFilter('zh'), 'zh');
    assert.equal(parseLocaleFilter('ALL'), 'all'); // Case insensitive
    assert.equal(parseLocaleFilter('ZH'), 'zh');
});

test('parseLocaleFilter: defaults for invalid', () => {
    assert.equal(parseLocaleFilter('en'), DEFAULT_LOCALE_FILTER);
    assert.equal(parseLocaleFilter('fr'), DEFAULT_LOCALE_FILTER);
    assert.equal(parseLocaleFilter(''), DEFAULT_LOCALE_FILTER);
    assert.equal(parseLocaleFilter(null), DEFAULT_LOCALE_FILTER);
    assert.equal(parseLocaleFilter(undefined), DEFAULT_LOCALE_FILTER);
    assert.equal(parseLocaleFilter(123), DEFAULT_LOCALE_FILTER);
});

// =============================================================================
// parsePage
// =============================================================================

test('parsePage: valid pages', () => {
    assert.equal(parsePage('1'), 1);
    assert.equal(parsePage('2'), 2);
    assert.equal(parsePage('100'), 100);
});

test('parsePage: defaults for invalid', () => {
    assert.equal(parsePage('0'), DEFAULT_PAGE);
    assert.equal(parsePage('-1'), DEFAULT_PAGE);
    assert.equal(parsePage('abc'), DEFAULT_PAGE);
    assert.equal(parsePage(''), DEFAULT_PAGE);
    assert.equal(parsePage(null), DEFAULT_PAGE);
    assert.equal(parsePage(undefined), DEFAULT_PAGE);
});

// =============================================================================
// parsePageSize
// =============================================================================

test('parsePageSize: valid page sizes', () => {
    assert.equal(parsePageSize('20'), 20);
    assert.equal(parsePageSize('50'), 50);
    assert.equal(parsePageSize('100'), 100);
});

test('parsePageSize: defaults for invalid', () => {
    assert.equal(parsePageSize('10'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize('25'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize('0'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize('-1'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize('abc'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize(''), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSize(null), DEFAULT_PAGE_SIZE);
});

// =============================================================================
// validatePageViewsAdminQuery
// =============================================================================

test('validatePageViewsAdminQuery: returns valid result with defaults', () => {
    const result = validatePageViewsAdminQuery({});

    assert.ok(result.valid);
    assert.equal(result.data?.locale, 'all');
    assert.equal(result.data?.page, 1);
    assert.equal(result.data?.pageSize, 50);
    assert.equal(result.data?.limit, 50);
    assert.equal(result.data?.offset, 0);
});

test('validatePageViewsAdminQuery: calculates offset correctly', () => {
    const result = validatePageViewsAdminQuery({ page: '3', pageSize: '20' });

    assert.ok(result.valid);
    assert.equal(result.data?.page, 3);
    assert.equal(result.data?.pageSize, 20);
    assert.equal(result.data?.limit, 20);
    assert.equal(result.data?.offset, 40); // (3-1) * 20
});

test('validatePageViewsAdminQuery: accepts all params', () => {
    const result = validatePageViewsAdminQuery({
        from: '2026-01-01',
        to: '2026-01-07',
        locale: 'zh',
        page: '2',
        pageSize: '100',
    });

    assert.ok(result.valid);
    assert.equal(result.data?.from, '2026-01-01');
    assert.equal(result.data?.to, '2026-01-07');
    assert.equal(result.data?.locale, 'zh');
    assert.equal(result.data?.page, 2);
    assert.equal(result.data?.pageSize, 100);
    assert.equal(result.data?.offset, 100); // (2-1) * 100
});

test('validatePageViewsAdminQuery: handles edge cases gracefully', () => {
    // All invalid values should fallback to defaults
    const result = validatePageViewsAdminQuery({
        from: 'invalid',
        to: 'invalid',
        locale: 'invalid',
        page: 'invalid',
        pageSize: 'invalid',
    });

    assert.ok(result.valid);
    assert.equal(result.data?.locale, 'all');
    assert.equal(result.data?.page, 1);
    assert.equal(result.data?.pageSize, 50);
});
