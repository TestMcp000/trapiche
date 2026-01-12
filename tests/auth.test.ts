import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllowedAdminEmails, isAdminEmail } from '../lib/modules/auth';

const original = process.env.ADMIN_ALLOWED_EMAILS;

test.after(() => {
  if (original === undefined) {
    delete process.env.ADMIN_ALLOWED_EMAILS;
  } else {
    process.env.ADMIN_ALLOWED_EMAILS = original;
  }
});

test('getAllowedAdminEmails returns empty when not configured', () => {
  process.env.ADMIN_ALLOWED_EMAILS = '';
  assert.deepEqual(getAllowedAdminEmails(), []);
});

test('isAdminEmail denies when allowlist is empty', () => {
  process.env.ADMIN_ALLOWED_EMAILS = '';
  assert.equal(isAdminEmail('admin@example.com'), false);
});

test('getAllowedAdminEmails trims and lowercases entries', () => {
  process.env.ADMIN_ALLOWED_EMAILS = ' A@Example.com ,b@test.com,  ';
  assert.deepEqual(getAllowedAdminEmails(), ['a@example.com', 'b@test.com']);
});

test('isAdminEmail is case-insensitive', () => {
  process.env.ADMIN_ALLOWED_EMAILS = 'admin@example.com';
  assert.equal(isAdminEmail('ADMIN@EXAMPLE.COM'), true);
  assert.equal(isAdminEmail('other@example.com'), false);
});

test('isAdminEmail returns false for nullish email', () => {
  process.env.ADMIN_ALLOWED_EMAILS = 'admin@example.com';
  assert.equal(isAdminEmail(null), false);
  assert.equal(isAdminEmail(undefined), false);
});
