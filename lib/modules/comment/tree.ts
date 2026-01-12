/**
 * Comment tree utilities
 * 
 * Pure functions for comment data transformations
 * Unified logic for both lib/comments.ts (server) and CommentSection.tsx (client)
 */

export interface CommentData {
  id: string;
  /** Server-computed ownership flag - true if comment belongs to current user */
  isMine?: boolean;
  userDisplayName: string;
  userAvatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies?: CommentData[];
}


/**
 * Build nested comment tree from flat list
 * 
 * @param comments Flat array of comments with parentId
 * @returns Array of root comments with nested replies
 */
export function buildCommentTree<T extends { id: string; parentId?: string | null }>(
  comments: T[]
): (T & { replies: T[] })[] {
  const commentMap = new Map<string, T & { replies: T[] }>();
  const rootComments: (T & { replies: T[] })[] = [];

  // First pass: create map of all comments with empty replies array
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build tree
  comments.forEach(comment => {
    const mappedComment = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(mappedComment);
      } else {
        // Parent not found (possibly deleted), treat as root
        rootComments.push(mappedComment);
      }
    } else {
      rootComments.push(mappedComment);
    }
  });

  return rootComments;
}

/**
 * Count total comments including all nested replies
 */
export function countComments(items: CommentData[]): number {
  return items.reduce((count, item) => {
    return count + 1 + (item.replies ? countComments(item.replies) : 0);
  }, 0);
}

/**
 * Collect all comment IDs from a nested comment tree
 * Used for batch operations like fetching liked status
 */
export function collectAllCommentIds<T extends { id: string; replies?: T[] }>(
  comments: T[]
): string[] {
  const ids: string[] = [];
  const collect = (list: T[]) => {
    for (const comment of list) {
      ids.push(comment.id);
      if (comment.replies) {
        collect(comment.replies);
      }
    }
  };
  collect(comments);
  return ids;
}

/**
 * Attach likedByMe status to each comment in a nested tree
 * Used to merge reaction data with comments
 */
export function attachLikedByMe<T extends { id: string; replies?: T[] }>(
  comments: T[],
  likedIds: Set<string>
): (T & { likedByMe: boolean; replies?: (T & { likedByMe: boolean })[] })[] {
  return comments.map(comment => ({
    ...comment,
    likedByMe: likedIds.has(comment.id),
    replies: comment.replies 
      ? attachLikedByMe(comment.replies, likedIds) 
      : undefined,
  }));
}

/**
 * Transform API response to CommentData
 * Supports both camelCase and snake_case field names
 */
export function transformComment(comment: Record<string, unknown>): CommentData {
  // Handle likeCount (camelCase or snake_case)
  const likeCount = typeof comment.likeCount === 'number' 
    ? comment.likeCount 
    : typeof comment.like_count === 'number' 
      ? comment.like_count 
      : 0;
  
  // Handle likedByMe (camelCase or snake_case)
  const likedByMe = typeof comment.likedByMe === 'boolean'
    ? comment.likedByMe
    : typeof comment.liked_by_me === 'boolean'
      ? comment.liked_by_me
      : false;

  // Handle isMine (server-computed ownership flag)
  const isMine = typeof comment.isMine === 'boolean'
    ? comment.isMine
    : typeof comment.is_mine === 'boolean'
      ? comment.is_mine
      : undefined;

  return {
    id: comment.id as string,
    isMine,
    userDisplayName: comment.userDisplayName as string,
    userAvatarUrl: comment.userAvatarUrl as string | null,
    content: comment.content as string,
    createdAt: (comment.createdAt as string) || (comment.created_at as string),
    updatedAt: (comment.updatedAt as string) || (comment.updated_at as string) || undefined,
    likeCount,
    likedByMe,
    replies: comment.replies
      ? (comment.replies as Record<string, unknown>[]).map(transformComment)
      : undefined,
  };
}


/**
 * Alias for countComments to match task1.md naming convention
 */
export const countCommentNodes = countComments;
