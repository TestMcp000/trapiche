'use client';

/**
 * Main comment section component
 * 
 * Combines:
 * - Comment list with nested replies
 * - Comment form with honeypot
 * - Google login/logout
 * - Reply functionality
 * 
 * Supports polymorphic targets (post, gallery_item)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/infrastructure/supabase/client';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import { countComments, transformComment, type CommentData } from '@/lib/modules/comment/tree';
import styles from './CommentSection.module.css';
import {
  POST_AUTH_REDIRECT_COOKIE,
  POST_AUTH_REDIRECT_MAX_AGE_SECONDS,
} from '@/lib/modules/auth/post-auth-redirect';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface CommentSectionProps {
  /** Target type for polymorphic comments */
  targetType: 'post' | 'gallery_item';
  /** Target ID (post ID or gallery item ID) */
  targetId: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

export default function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const t = useTranslations('comments');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enableRecaptcha, setEnableRecaptcha] = useState(false);
  const [maxContentLength, setMaxContentLength] = useState(4000);
  const [recaptchaMisconfigured, setRecaptchaMisconfigured] = useState(false);
  const recaptchaReadyRef = useRef(false);
  const recaptchaLoadPromiseRef = useRef<Promise<void> | null>(null);

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);


  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!targetType || !targetId) {
      setError(t('errorLoading'));
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('targetType', targetType);
      params.set('targetId', targetId);

      const res = await fetch(`/api/comments?${params.toString()}`);
      const data = await res.json();
      if (data.comments) {
        setComments(data.comments.map(transformComment));
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError(t('errorLoading'));
    } finally {
      setIsLoading(false);
    }
  }, [targetType, targetId, t]);

  // Check auth state
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user as User | null);
    };

    checkUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as User | null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Fetch public settings (enable_recaptcha, max_content_length) on mount
  useEffect(() => {
    fetch('/api/comments/public-settings')
      .then(res => res.json())
      .then(data => {
        setEnableRecaptcha(data.enable_recaptcha ?? false);
        setMaxContentLength(data.max_content_length ?? 4000);
      })
      .catch(() => {
        setEnableRecaptcha(false);
        setMaxContentLength(4000);
      });
  }, []);

  // Load reCAPTCHA v3 script when enabled by backend settings
  useEffect(() => {
    // Only load if backend enables reCAPTCHA
    if (!enableRecaptcha) {
      setRecaptchaMisconfigured(false);
      return;
    }
    
    // Check for missing site key - show warning to user
    if (!RECAPTCHA_SITE_KEY) {
      console.warn('reCAPTCHA is enabled but NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not configured');
      setRecaptchaMisconfigured(true);
      return;
    }
    
    setRecaptchaMisconfigured(false);
    
    const scriptSrc = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;

    const setReady = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          recaptchaReadyRef.current = true;
        });
      }
    };

    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      recaptchaLoadPromiseRef.current = new Promise<void>((resolve) => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            recaptchaReadyRef.current = true;
            resolve();
          });
        } else {
          existingScript.addEventListener('load', () => {
            setReady();
            resolve();
          });
        }
      });
      setReady();
      return;
    }

    recaptchaLoadPromiseRef.current = new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      script.onload = () => {
        setReady();
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }, [enableRecaptcha]);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle login
  const handleLogin = async () => {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';

    if (typeof window !== 'undefined') {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      const encodedNext = encodeURIComponent(nextPath);
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${POST_AUTH_REDIRECT_COOKIE}=${encodedNext}; Path=/; Max-Age=${POST_AUTH_REDIRECT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const getRecaptchaToken = useCallback(async (): Promise<string | undefined> => {
    // Skip if reCAPTCHA is disabled or site key is missing
    if (!enableRecaptcha || !RECAPTCHA_SITE_KEY) {
      return undefined;
    }

    if (!recaptchaLoadPromiseRef.current) {
      recaptchaLoadPromiseRef.current = new Promise<void>((resolve) => {
        const start = Date.now();
        const timer = setInterval(() => {
          if (window.grecaptcha || Date.now() - start > 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    }

    await recaptchaLoadPromiseRef.current;

    if (window.grecaptcha && !recaptchaReadyRef.current) {
      await new Promise<void>((resolve) => {
        window.grecaptcha!.ready(() => {
          recaptchaReadyRef.current = true;
          resolve();
        });
      });
    }

    if (!window.grecaptcha || !recaptchaReadyRef.current) {
      return undefined;
    }

    try {
      return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit_comment' });
    } catch (err) {
      console.error('Failed to execute reCAPTCHA', err);
      return undefined;
    }
  }, [enableRecaptcha]);

  // Handle comment submission
  const handleSubmit = async (
    content: string,
    honeypotValue: string,
    isAnonymous: boolean,
    parentId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const recaptchaToken = await getRecaptchaToken();

      const payload: Record<string, unknown> = {
        targetType,
        targetId,
        content,
        parentId,
        honeypotValue,
        isAnonymous,
      };

      if (recaptchaToken) {
        payload.recaptchaToken = recaptchaToken;
      }

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || data.error };
      }

      // Refresh comments
      await fetchComments();
      setReplyingTo(null);

      return { success: true, message: data.message };
    } catch (_err) {
      return { success: false, message: t('errorGeneric') };
    }
  };

  // Handle comment deletion
  const handleDelete = async (commentId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchComments();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Handle comment update
  const handleUpdate = async (commentId: string, content: string): Promise<void> => {
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, content }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to update comment');
    }

    await fetchComments();
  };

  // Handle reply click
  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };


  const totalComments = countComments(comments);

  return (
    <section className={styles.commentSection}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {t('title')} 
          {totalComments > 0 && (
            <span className={styles.count}>({totalComments})</span>
          )}
        </h3>
        
        {user && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
            </span>
            <button className={styles.logoutButton} onClick={handleLogout}>
              {t('logout')}
            </button>
          </div>
        )}
      </div>

      {/* reCAPTCHA configuration warning */}
      {recaptchaMisconfigured && (
        <div className={styles.recaptchaWarning}>
          {t('recaptchaMisconfigured')}
        </div>
      )}

      {/* Main comment form */}
      <CommentForm
        onSubmit={(content, honeypot, isAnonymous) => handleSubmit(content, honeypot, isAnonymous)}
        isLoggedIn={!!user}
        onLogin={handleLogin}
        maxLength={maxContentLength}
      />

      {/* Error state */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Loading state */}
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t('loading')}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && comments.length === 0 && (
        <div className={styles.empty}>
          <p>{t('noComments')}</p>
        </div>
      )}

      {/* Comment list */}
      {!isLoading && comments.length > 0 && (
        <div className={styles.commentList}>
          {comments.map((comment) => (
            <React.Fragment key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={handleReply}
                onDelete={handleDelete}
                onEdit={handleUpdate}
              />
              
              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className={styles.replyFormWrapper}>
                  <CommentForm
                    parentId={comment.id}
                    onSubmit={(content, honeypot, isAnonymous) => handleSubmit(content, honeypot, isAnonymous, comment.id)}
                    onCancel={handleCancelReply}
                    isReply
                    isLoggedIn={!!user}
                    onLogin={handleLogin}
                    maxLength={maxContentLength}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
