/**
 * Comments JSON Formatter Tests
 *
 * Tests for comments export pure functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  transformCommentToExportData,
  transformReplyToExportData,
  formatCommentsToJson,
} from '../../lib/modules/import-export/formatters/comments-json';

import type { CommentFull } from '../../lib/types/comments';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_REPLY: CommentFull = {
  id: 'reply-123',
  targetType: 'post',
  targetId: 'post-123',
  parentId: 'comment-123',
  userId: 'user-456',
  userDisplayName: 'Reply User',
  userAvatarUrl: null,
  userEmail: 'reply@example.com',
  content: 'This is a reply',
  isSpam: false,
  isApproved: true,
  spamScore: null,
  spamReason: null,
  ipHash: null,
  linkCount: 0,
  likeCount: 2,
  createdAt: '2025-01-02T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
};

const MOCK_COMMENT: CommentFull & { replies: CommentFull[] } = {
  id: 'comment-123',
  targetType: 'post',
  targetId: 'post-123',
  parentId: null,
  userId: 'user-123',
  userDisplayName: 'Test User',
  userAvatarUrl: 'https://example.com/avatar.jpg',
  userEmail: 'user@example.com',
  content: 'This is a test comment',
  isSpam: false,
  isApproved: true,
  spamScore: 0.1,
  spamReason: null,
  ipHash: 'abc123',
  linkCount: 0,
  likeCount: 5,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  replies: [MOCK_REPLY],
};

const TARGET_SLUG_MAP = new Map([['post-123', 'test-post']]);

// =============================================================================
// Formatter Tests
// =============================================================================

describe('Comments JSON Formatter', () => {
  describe('transformReplyToExportData', () => {
    it('transforms reply without sensitive data', () => {
      const exported = transformReplyToExportData(MOCK_REPLY);

      assert.equal(exported.user_display_name, 'Reply User');
      assert.equal(exported.content, 'This is a reply');
      assert.equal(exported.user_email, undefined);
    });

    it('includes sensitive data when requested', () => {
      const exported = transformReplyToExportData(MOCK_REPLY, { includeSensitive: true });

      assert.equal(exported.user_email, 'reply@example.com');
    });
  });

  describe('transformCommentToExportData', () => {
    it('transforms comment without sensitive data', () => {
      const exported = transformCommentToExportData(MOCK_COMMENT, TARGET_SLUG_MAP);

      assert.equal(exported.target_type, 'post');
      assert.equal(exported.target_slug, 'test-post');
      assert.equal(exported.user_display_name, 'Test User');
      assert.equal(exported.content, 'This is a test comment');
      assert.equal(exported.like_count, 5);
      assert.equal(exported.replies.length, 1);
      assert.equal(exported.user_email, undefined);
      assert.equal(exported.ip_hash, undefined);
    });

    it('includes sensitive data when requested', () => {
      const exported = transformCommentToExportData(
        MOCK_COMMENT,
        TARGET_SLUG_MAP,
        { includeSensitive: true }
      );

      assert.equal(exported.user_email, 'user@example.com');
      assert.equal(exported.ip_hash, 'abc123');
      assert.equal(exported.spam_score, 0.1);
    });

    it('handles missing target slug', () => {
      const emptyMap = new Map<string, string>();
      const exported = transformCommentToExportData(MOCK_COMMENT, emptyMap);

      assert.equal(exported.target_slug, 'unknown');
    });
  });

  describe('formatCommentsToJson', () => {
    it('creates valid export envelope without sensitive data', () => {
      const envelope = formatCommentsToJson(
        [MOCK_COMMENT],
        TARGET_SLUG_MAP,
        {},
        '2025-01-01T00:00:00Z'
      );

      assert.equal(envelope.type, 'comments');
      assert.equal(envelope.exportedAt, '2025-01-01T00:00:00Z');
      assert.equal(envelope.includeSensitive, false);
      assert.equal(envelope.data.length, 1);
    });

    it('marks sensitive flag when included', () => {
      const envelope = formatCommentsToJson(
        [MOCK_COMMENT],
        TARGET_SLUG_MAP,
        { includeSensitive: true },
        '2025-01-01T00:00:00Z'
      );

      assert.equal(envelope.includeSensitive, true);
    });

    it('includes replies', () => {
      const envelope = formatCommentsToJson([MOCK_COMMENT], TARGET_SLUG_MAP);

      assert.equal(envelope.data[0].replies.length, 1);
      assert.equal(envelope.data[0].replies[0].user_display_name, 'Reply User');
    });
  });
});
