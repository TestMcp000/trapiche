'use client';

/**
 * Single comment display component
 * 
 * Displays a comment with:
 * - User avatar and name
 * - Timestamp
 * - Content
 * - Like button
 * - Reply button
 * - Delete button (for own comments)
 */

import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import LikeButton from '@/components/reactions/LikeButton';
import styles from './CommentItem.module.css';

export interface CommentData {
  id: string;
  /** Server-computed ownership flag - true if comment belongs to current user */
  isMine?: boolean;
  userDisplayName: string;
  userAvatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  likedByMe: boolean;
  replies?: CommentData[];
}

interface CommentItemProps {
  comment: CommentData;
  onReply?: (commentId: string) => void;
  onDelete?: (commentId: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  depth?: number;
}

export default function CommentItem({
  comment,
  onReply,
  onDelete,
  onEdit,
  depth = 0,
}: CommentItemProps) {
  const t = useTranslations('comments');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  React.useEffect(() => {
    setEditContent(comment.content);
  }, [comment.content]);

  const dateLocale = zhTW;
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  });
  const createdAt = new Date(comment.createdAt);
  const updatedAt = comment.updatedAt ? new Date(comment.updatedAt) : createdAt;
  const wasEdited = updatedAt.getTime() !== createdAt.getTime();
  const formattedCreated = format(createdAt, 'yyyy/MM/dd HH:mm');
  const formattedUpdated = format(updatedAt, 'yyyy/MM/dd HH:mm');

  const isOwnComment = comment.isMine === true;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onEdit) return;
    if (!editContent.trim()) {
      setEditError(t('errorEmpty'));
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit comment', err);
      setEditError(t('errorGeneric'));
    } finally {
      setIsSaving(false);
    }
  };

  // Limit nesting depth to 3 for readability
  const maxDepth = 3;
  const effectiveDepth = Math.min(depth, maxDepth);

  return (
    <div 
      className={styles.commentItem}
      style={{ marginLeft: effectiveDepth > 0 ? `${effectiveDepth * 24}px` : 0 }}
    >
      <div className={styles.commentHeader}>
        <div className={styles.headerInfo}>
          <span className={styles.userName}>{comment.userDisplayName}</span>
          <span className={styles.timestamp} title={wasEdited ? `${formattedCreated} • ${t('edited')}: ${formattedUpdated}` : formattedCreated}>
            {timeAgo} · {formattedCreated}
            {wasEdited && ` · ${t('edited')} ${formattedUpdated}`}
          </span>
        </div>
      </div>

      {isEditing ? (
        <div className={styles.editContainer}>
          <textarea
            className={styles.editTextarea}
            value={editContent}
            onChange={(e) => {
              setEditContent(e.target.value);
              setEditError(null);
            }}
            rows={4}
            maxLength={4000}
          />
          {editError && <div className={styles.error}>{editError}</div>}
          <div className={styles.editActions}>
            <button
              className={styles.saveButton}
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? t('saving') : t('save')}
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              disabled={isSaving}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.content}>
          {comment.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        {/* Like button */}
        <LikeButton
          targetType="comment"
          targetId={comment.id}
          initialLiked={comment.likedByMe}
          initialCount={comment.likeCount}
          size="small"
        />
        
        {onReply && depth < maxDepth && (
          <button
            className={styles.replyButton}
            onClick={() => onReply(comment.id)}
          >
            {t('reply')}
          </button>
        )}
        {isOwnComment && onEdit && !isEditing && (
          <button
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
          >
            {t('edit')}
          </button>
        )}
        {isOwnComment && onDelete && (
          <>
            {!showConfirmDelete ? (
              <button
                className={styles.deleteButton}
                onClick={() => setShowConfirmDelete(true)}
              >
                {t('delete')}
              </button>
            ) : (
              <div className={styles.confirmDelete}>
                <span>{t('confirmDelete')}</span>
                <button
                  className={styles.confirmYes}
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? '...' : t('yes')}
                </button>
                <button
                  className={styles.confirmNo}
                  onClick={() => setShowConfirmDelete(false)}
                >
                  {t('no')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
