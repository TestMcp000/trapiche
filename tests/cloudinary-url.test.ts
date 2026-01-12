import test from 'node:test';
import assert from 'node:assert/strict';
import { toWebp, toOgImage } from '../lib/utils/cloudinary-url.js';

test('toWebp converts Cloudinary URL to WebP format', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg';
  const result = toWebp(url);
  
  assert.ok(result.includes('f_webp'));
  assert.ok(result.includes('q_auto'));
});

test('toWebp preserves version in URL', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg';
  const result = toWebp(url);
  
  assert.ok(result.includes('v1234567890'));
  assert.ok(result.includes('sample.jpg'));
});

test('toWebp returns original URL for non-Cloudinary URLs', () => {
  const url = 'https://example.com/image.jpg';
  const result = toWebp(url);
  
  assert.equal(result, url);
});

test('toWebp returns empty string for empty input', () => {
  const result = toWebp('');
  assert.equal(result, '');
});

test('toWebp does not duplicate f_webp if already present', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/f_webp,q_auto/v1234567890/sample.jpg';
  const result = toWebp(url);
  
  const matches = result.match(/f_webp/g);
  assert.equal(matches?.length, 1);
});

test('toOgImage converts to JPEG by default', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg';
  const result = toOgImage(url);
  
  assert.ok(result.includes('f_jpg'));
  assert.ok(result.includes('q_auto'));
  assert.ok(result.includes('c_limit'));
  assert.ok(result.includes('w_1200'));
});

test('toOgImage converts to PNG when specified', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.png';
  const result = toOgImage(url, 'png');
  
  assert.ok(result.includes('f_png'));
  assert.ok(result.includes('q_auto'));
  assert.ok(result.includes('c_limit'));
  assert.ok(result.includes('w_1200'));
});

test('toOgImage preserves version and filename', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/folder/sample.jpg';
  const result = toOgImage(url);
  
  assert.ok(result.includes('v1234567890'));
});

test('toOgImage returns original URL for non-Cloudinary URLs', () => {
  const url = 'https://example.com/image.jpg';
  const result = toOgImage(url);
  
  assert.equal(result, url);
});

test('toOgImage returns empty string for empty input', () => {
  const result = toOgImage('');
  assert.equal(result, '');
});
