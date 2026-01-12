'use client';

/**
 * Comment form component with honeypot protection
 * 
 * Features:
 * - Honeypot hidden field for bot detection
 * - Character count
 * - Loading state
 * - Error handling
 * - Reply mode
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  parentId?: string | null;
  onSubmit: (content: string, honeypotValue: string, isAnonymous: boolean) => Promise<{ success: boolean; message?: string }>;
  onCancel?: () => void;
  isReply?: boolean;
  isLoggedIn: boolean;
  onLogin: () => void;
  allowAnonymous?: boolean;
  /** Max content length from backend settings, defaults to 4000 */
  maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 4000;

export default function CommentForm({
  parentId: _parentId = null,
  onSubmit,
  onCancel,
  isReply = false,
  isLoggedIn,
  onLogin,
  allowAnonymous = true,
  maxLength = DEFAULT_MAX_LENGTH,
}: CommentFormProps) {
  const t = useTranslations('comments');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when in reply mode
  useEffect(() => {
    if (isReply && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isReply]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError(t('errorEmpty'));
      return;
    }

    if (content.length > maxLength) {
      setError(t('errorTooLong'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onSubmit(content, honeypot, isAnonymous);
      
      if (result.success) {
        setContent('');
        setIsAnonymous(false);
        setSuccess(result.message || t('successPosted'));
        if (onCancel) onCancel(); // Close reply form
      } else {
        setError(result.message || t('errorGeneric'));
      }
    } catch (_err) {
      setError(t('errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show login prompt if not logged in
  if (!isLoggedIn) {
    return (
      <div className={styles.loginPrompt}>
        <p>{t('loginRequired')}</p>
        <button className={styles.loginButton} onClick={onLogin}>
          {t('loginWithGoogle')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} ${isReply ? styles.replyForm : ''}`}>
      {/* Honeypot trap - hidden from real users */}
      <input
        type="text"
        name="website_url"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className={styles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {allowAnonymous && (
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>{t('postAnonymously')}</span>
        </label>
      )}

      <div className={styles.textareaWrapper}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          placeholder={isReply ? t('replyPlaceholder') : t('placeholder')}
          className={styles.textarea}
          rows={isReply ? 3 : 4}
          disabled={isSubmitting}
          maxLength={maxLength + 100} // Allow slight overflow for UX
        />
        <div className={styles.charCount}>
          <span className={content.length > maxLength ? styles.overLimit : ''}>
            {content.length}
          </span>
          <span className={styles.charLimit}>/ {maxLength}</span>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? t('submitting') : isReply ? t('submitReply') : t('submit')}
        </button>
        {onCancel && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
}
