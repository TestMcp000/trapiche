/**
 * Page View Validators Unit Tests
 *
 * Tests for lib/validators/page-views.ts
 *
 * @see lib/validators/page-views.ts
 * @see supabase/02_add/16_page_views.sql
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidPageViewPath,
  isValidPageViewLocale,
  isExcludedPath,
  validatePageViewRequest,
  parsePathname,
} from '@/lib/validators/page-views';

// =============================================================================
// isValidPageViewPath
// =============================================================================

test('isValidPageViewPath: valid paths', () => {
  assert.ok(isValidPageViewPath('/'));
  assert.ok(isValidPageViewPath('/blog'));
  assert.ok(isValidPageViewPath('/blog/my-post'));
  assert.ok(isValidPageViewPath('/gallery/category/item'));
  assert.ok(isValidPageViewPath('/portfolio/my-project'));
  assert.ok(isValidPageViewPath('/a/b/c/d/e'));
  assert.ok(isValidPageViewPath('/path_with_underscores'));
  assert.ok(isValidPageViewPath('/path-with-dashes'));
  assert.ok(isValidPageViewPath('/123'));
});

test('isValidPageViewPath: invalid paths', () => {
  assert.ok(!isValidPageViewPath(''));
  assert.ok(!isValidPageViewPath('no-leading-slash'));
  assert.ok(!isValidPageViewPath('/path?query=1'));
  assert.ok(!isValidPageViewPath('/path#fragment'));
  assert.ok(!isValidPageViewPath('/path with spaces'));
  assert.ok(!isValidPageViewPath('/path<script>'));
  assert.ok(!isValidPageViewPath(null));
  assert.ok(!isValidPageViewPath(undefined));
  assert.ok(!isValidPageViewPath(123));
  assert.ok(!isValidPageViewPath({}));
});

test('isValidPageViewPath: max length', () => {
  const longPath = '/' + 'a'.repeat(499);
  assert.ok(isValidPageViewPath(longPath));
  
  const tooLongPath = '/' + 'a'.repeat(500);
  assert.ok(!isValidPageViewPath(tooLongPath));
});

// =============================================================================
// isValidPageViewLocale
// =============================================================================

test('isValidPageViewLocale: valid locales', () => {
  assert.ok(isValidPageViewLocale('zh'));
});

test('isValidPageViewLocale: invalid locales', () => {
  assert.ok(!isValidPageViewLocale('en'));
  assert.ok(!isValidPageViewLocale('fr'));
  assert.ok(!isValidPageViewLocale('EN'));
  assert.ok(!isValidPageViewLocale(''));
  assert.ok(!isValidPageViewLocale(null));
  assert.ok(!isValidPageViewLocale(undefined));
  assert.ok(!isValidPageViewLocale(123));
});

// =============================================================================
// isExcludedPath
// =============================================================================

test('isExcludedPath: excluded paths', () => {
  assert.ok(isExcludedPath('/admin'));
  assert.ok(isExcludedPath('/admin/dashboard'));
  assert.ok(isExcludedPath('/admin/users/123'));
  assert.ok(isExcludedPath('/api'));
  assert.ok(isExcludedPath('/api/comments'));
  assert.ok(isExcludedPath('/_next'));
  assert.ok(isExcludedPath('/_next/static/chunks'));
});

test('isExcludedPath: non-excluded paths', () => {
  assert.ok(!isExcludedPath('/'));
  assert.ok(!isExcludedPath('/blog'));
  assert.ok(!isExcludedPath('/gallery/item'));
  assert.ok(!isExcludedPath('/contact'));
});

// =============================================================================
// validatePageViewRequest
// =============================================================================

test('validatePageViewRequest: valid request', () => {
  const result = validatePageViewRequest({ path: '/blog/post', locale: 'zh' });
  assert.ok(result.valid);
  assert.deepEqual(result.data, { path: '/blog/post', locale: 'zh' });
});

test('validatePageViewRequest: home page', () => {
  const result = validatePageViewRequest({ path: '/', locale: 'zh' });
  assert.ok(result.valid);
  assert.deepEqual(result.data, { path: '/', locale: 'zh' });
});

test('validatePageViewRequest: invalid body type', () => {
  assert.ok(!validatePageViewRequest(null).valid);
  assert.ok(!validatePageViewRequest(undefined).valid);
  assert.ok(!validatePageViewRequest('string').valid);
  assert.ok(!validatePageViewRequest(123).valid);
});

test('validatePageViewRequest: invalid path', () => {
  const result = validatePageViewRequest({ path: '', locale: 'zh' });
  assert.ok(!result.valid);
  assert.ok(result.error?.includes('路徑無效'));
});

test('validatePageViewRequest: invalid locale', () => {
  const result = validatePageViewRequest({ path: '/blog', locale: 'fr' });
  assert.ok(!result.valid);
  assert.ok(result.error?.includes('語系無效'));
});

test('validatePageViewRequest: excluded path', () => {
  const result = validatePageViewRequest({ path: '/admin/dashboard', locale: 'zh' });
  assert.ok(!result.valid);
  assert.ok(result.error?.includes('不納入追蹤'));
});

// =============================================================================
// parsePathname
// =============================================================================

test('parsePathname: valid pathnames', () => {
  assert.deepEqual(parsePathname('/zh/gallery/item'), { locale: 'zh', path: '/gallery/item' });
  assert.deepEqual(parsePathname('/zh'), { locale: 'zh', path: '/' });
});

test('parsePathname: invalid pathnames', () => {
  assert.equal(parsePathname('/fr/blog'), null); // Invalid locale
  assert.equal(parsePathname('/blog'), null); // No locale prefix
  assert.equal(parsePathname(''), null);
  assert.equal(parsePathname('/'), null);
});
