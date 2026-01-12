import test from 'node:test';
import assert from 'node:assert/strict';
import { getClientIP, hashIP, isValidIP } from '../lib/security/ip.js';

test('getClientIP extracts IP from x-forwarded-for header', () => {
  const headers = new Headers();
  headers.set('x-forwarded-for', '192.168.1.100, 10.0.0.1, 172.16.0.1');
  
  const result = getClientIP(headers);
  assert.equal(result, '192.168.1.100');
});

test('getClientIP extracts IP from x-real-ip header', () => {
  const headers = new Headers();
  headers.set('x-real-ip', '10.0.0.50');
  
  const result = getClientIP(headers);
  assert.equal(result, '10.0.0.50');
});

test('getClientIP extracts IP from cf-connecting-ip header', () => {
  const headers = new Headers();
  headers.set('cf-connecting-ip', '203.0.113.195');
  
  const result = getClientIP(headers);
  assert.equal(result, '203.0.113.195');
});

test('getClientIP prefers x-forwarded-for over other headers', () => {
  const headers = new Headers();
  headers.set('x-forwarded-for', '192.168.1.1');
  headers.set('x-real-ip', '10.0.0.1');
  headers.set('cf-connecting-ip', '172.16.0.1');
  
  const result = getClientIP(headers);
  assert.equal(result, '192.168.1.1');
});

test('getClientIP returns fallback when no valid IP found', () => {
  const headers = new Headers();
  
  const result = getClientIP(headers);
  assert.equal(result, '0.0.0.0');
});

test('hashIP returns a 64-character hex string', () => {
  const result = hashIP('192.168.1.1');
  
  assert.equal(result.length, 64);
  assert.match(result, /^[0-9a-f]{64}$/);
});

test('hashIP is deterministic for the same input', () => {
  const result1 = hashIP('192.168.1.1');
  const result2 = hashIP('192.168.1.1');
  
  assert.equal(result1, result2);
});

test('hashIP produces different hashes for different IPs', () => {
  const result1 = hashIP('192.168.1.1');
  const result2 = hashIP('192.168.1.2');
  
  assert.notEqual(result1, result2);
});

test('isValidIP validates IPv4 addresses', () => {
  assert.equal(isValidIP('192.168.1.1'), true);
  assert.equal(isValidIP('0.0.0.0'), true);
  assert.equal(isValidIP('255.255.255.255'), true);
  assert.equal(isValidIP('10.0.0.1'), true);
});

test('isValidIP rejects invalid IPv4 addresses', () => {
  assert.equal(isValidIP('256.1.1.1'), false);
  assert.equal(isValidIP('192.168.1'), false);
  assert.equal(isValidIP('192.168.1.1.1'), false);
  assert.equal(isValidIP('invalid'), false);
  assert.equal(isValidIP(''), false);
});

test('isValidIP validates IPv6 addresses', () => {
  assert.equal(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), true);
  assert.equal(isValidIP('::1'), true);
  assert.equal(isValidIP('fe80::1'), true);
});
