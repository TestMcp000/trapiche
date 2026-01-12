import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildCommentTree, countComments, countCommentNodes, transformComment } from '../lib/modules/comment/tree';

describe('buildCommentTree', () => {
  it('returns empty array for empty input', () => {
    const result = buildCommentTree([]);
    assert.deepStrictEqual(result, []);
  });

  it('handles single root comment', () => {
    const comments = [{ id: '1', parentId: null, content: 'test' }];
    const result = buildCommentTree(comments);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, '1');
    assert.deepStrictEqual(result[0].replies, []);
  });

  it('builds tree with parent and child', () => {
    const comments = [
      { id: '1', parentId: null, content: 'parent' },
      { id: '2', parentId: '1', content: 'child' },
    ];
    const result = buildCommentTree(comments);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, '1');
    assert.strictEqual(result[0].replies.length, 1);
    assert.strictEqual(result[0].replies[0].id, '2');
  });

  it('handles multiple root comments', () => {
    const comments = [
      { id: '1', parentId: null, content: 'root1' },
      { id: '2', parentId: null, content: 'root2' },
    ];
    const result = buildCommentTree(comments);
    assert.strictEqual(result.length, 2);
  });

  it('handles deeply nested replies', () => {
    const comments = [
      { id: '1', parentId: null, content: 'root' },
      { id: '2', parentId: '1', content: 'level1' },
      { id: '3', parentId: '2', content: 'level2' },
    ];
    const result = buildCommentTree(comments);
    assert.strictEqual(result.length, 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.strictEqual((result[0].replies[0] as any).replies[0].id, '3');
  });

  it('treats orphan comments as root when parent not found', () => {
    const comments = [
      { id: '1', parentId: 'missing', content: 'orphan' },
    ];
    const result = buildCommentTree(comments);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, '1');
  });

  it('handles comments without parentId property', () => {
    const comments = [
      { id: '1', content: 'root' },
      { id: '2', content: 'also root' },
    ];
    const result = buildCommentTree(comments);
    assert.strictEqual(result.length, 2);
  });
});

describe('countComments', () => {
  it('returns 0 for empty array', () => {
    assert.strictEqual(countComments([]), 0);
  });

  it('counts single comment', () => {
    const items = [{
      id: '1',
      userId: 'u1',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-01',
      likeCount: 0,
      likedByMe: false,
    }];
    assert.strictEqual(countComments(items), 1);
  });

  it('counts nested replies', () => {
    const items = [{
      id: '1',
      userId: 'u1',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'parent',
      createdAt: '2024-01-01',
      likeCount: 0,
      likedByMe: false,
      replies: [{
        id: '2',
        userId: 'u2',
        userDisplayName: 'User2',
        userAvatarUrl: null,
        content: 'child',
        createdAt: '2024-01-02',
        likeCount: 0,
        likedByMe: false,
      }],
    }];
    assert.strictEqual(countComments(items), 2);
  });

  it('counts deeply nested structure', () => {
    const items = [{
      id: '1',
      userId: 'u1',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'root',
      createdAt: '2024-01-01',
      likeCount: 0,
      likedByMe: false,
      replies: [{
        id: '2',
        userId: 'u2',
        userDisplayName: 'User2',
        userAvatarUrl: null,
        content: 'level1',
        createdAt: '2024-01-02',
        likeCount: 0,
        likedByMe: false,
        replies: [{
          id: '3',
          userId: 'u3',
          userDisplayName: 'User3',
          userAvatarUrl: null,
          content: 'level2',
          createdAt: '2024-01-03',
          likeCount: 0,
          likedByMe: false,
        }],
      }],
    }];
    assert.strictEqual(countComments(items), 3);
  });

  it('counts multiple roots with replies', () => {
    const items = [
      {
        id: '1',
        userId: 'u1',
        userDisplayName: 'User',
        userAvatarUrl: null,
        content: 'root1',
        createdAt: '2024-01-01',
        likeCount: 0,
        likedByMe: false,
        replies: [{
          id: '2',
          userId: 'u2',
          userDisplayName: 'User2',
          userAvatarUrl: null,
          content: 'reply1',
          createdAt: '2024-01-02',
          likeCount: 0,
          likedByMe: false,
        }],
      },
      {
        id: '3',
        userId: 'u3',
        userDisplayName: 'User3',
        userAvatarUrl: null,
        content: 'root2',
        createdAt: '2024-01-03',
        likeCount: 0,
        likedByMe: false,
      },
    ];
    assert.strictEqual(countComments(items), 3);
  });
});


describe('countCommentNodes', () => {
  it('is an alias for countComments', () => {
    assert.strictEqual(countCommentNodes, countComments);
  });
});

describe('transformComment', () => {
  it('transforms camelCase API response', () => {
    const input = {
      id: '1',
      isMine: true,
      userDisplayName: 'User Name',
      userAvatarUrl: 'http://avatar.url',
      content: 'Hello',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    };
    const result = transformComment(input);
    assert.strictEqual(result.id, '1');
    assert.strictEqual(result.isMine, true);
    assert.strictEqual(result.userDisplayName, 'User Name');
    assert.strictEqual(result.content, 'Hello');
  });

  it('transforms snake_case API response', () => {
    const input = {
      id: '2',
      is_mine: true,
      userDisplayName: 'Another User',
      userAvatarUrl: null,
      content: 'World',
      created_at: '2024-02-01',
      updated_at: '2024-02-02',
    };
    const result = transformComment(input);
    assert.strictEqual(result.isMine, true);
    assert.strictEqual(result.createdAt, '2024-02-01');
    assert.strictEqual(result.updatedAt, '2024-02-02');
  });

  it('handles missing updatedAt', () => {
    const input = {
      id: '3',
      userId: 'u3',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-01',
    };
    const result = transformComment(input);
    assert.strictEqual(result.updatedAt, undefined);
  });

  it('transforms nested replies', () => {
    const input = {
      id: '1',
      userId: 'u1',
      userDisplayName: 'Parent',
      userAvatarUrl: null,
      content: 'parent',
      createdAt: '2024-01-01',
      replies: [
        {
          id: '2',
          userId: 'u2',
          userDisplayName: 'Child',
          userAvatarUrl: null,
          content: 'child',
          createdAt: '2024-01-02',
        },
      ],
    };
    const result = transformComment(input);
    assert.strictEqual(result.replies?.length, 1);
    assert.strictEqual(result.replies?.[0].id, '2');
  });

  it('transforms likeCount from camelCase', () => {
    const input = {
      id: '1',
      userId: 'u1',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-01',
      likeCount: 5,
    };
    const result = transformComment(input);
    assert.strictEqual(result.likeCount, 5);
  });

  it('transforms like_count from snake_case', () => {
    const input = {
      id: '2',
      userId: 'u2',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-02',
      like_count: 10,
    };
    const result = transformComment(input);
    assert.strictEqual(result.likeCount, 10);
  });

  it('defaults likeCount to 0 when missing', () => {
    const input = {
      id: '3',
      userId: 'u3',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-03',
    };
    const result = transformComment(input);
    assert.strictEqual(result.likeCount, 0);
  });

  it('transforms likedByMe from camelCase', () => {
    const input = {
      id: '4',
      userId: 'u4',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-04',
      likedByMe: true,
    };
    const result = transformComment(input);
    assert.strictEqual(result.likedByMe, true);
  });

  it('transforms liked_by_me from snake_case', () => {
    const input = {
      id: '5',
      userId: 'u5',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-05',
      liked_by_me: true,
    };
    const result = transformComment(input);
    assert.strictEqual(result.likedByMe, true);
  });

  it('defaults likedByMe to false when missing', () => {
    const input = {
      id: '6',
      userId: 'u6',
      userDisplayName: 'User',
      userAvatarUrl: null,
      content: 'test',
      createdAt: '2024-01-06',
    };
    const result = transformComment(input);
    assert.strictEqual(result.likedByMe, false);
  });
});

