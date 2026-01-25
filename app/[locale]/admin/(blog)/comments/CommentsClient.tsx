'use client';

/**
 * Admin Comments Management Client Component
 * 
 * Features:
 * - Filter by status (all, approved, pending, spam)
 * - Search comments (debounced 300ms)
 * - Server-side pagination (20 items/page)
 * - Bulk actions
 * - Individual comment actions
 * - Uses admin i18n via useTranslations (wrapped in NextIntlClientProvider)
 * 
 * Uses server actions instead of API fetch per ARCHITECTURE.md.
 * 
 * @see ./actions.ts - Server actions (route-local)
 */

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { useDebounce } from '@/hooks/useDebounce';
import type { AdminCommentListItem } from '@/lib/types/comments';
import {
  fetchAdminCommentsAction,
  approveCommentAction,
  markSpamAction,
  deleteCommentAction,
  bulkApproveAction,
  bulkMarkSpamAction,
  bulkDeleteAction,
} from './actions';

// =============================================================================
// Constants
// =============================================================================

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

// =============================================================================
// Types
// =============================================================================

interface CommentsClientProps {
  routeLocale: string;
  searchParams: {
    status?: string;
    search?: string;
    page?: string;
  };
  messages: AbstractIntlMessages;
}

type CommentStatus = 'all' | 'approved' | 'pending' | 'spam';

// =============================================================================
// Component
// =============================================================================

/** Wrapper that provides NextIntlClientProvider for admin translations */
export default function CommentsClient(props: CommentsClientProps) {
  return (
    <NextIntlClientProvider locale={props.routeLocale} messages={props.messages}>
      <CommentsClientContent {...props} />
    </NextIntlClientProvider>
  );
}

function CommentsClientContent({ routeLocale, searchParams }: CommentsClientProps) {
  const router = useRouter();
  const t = useTranslations('admin.blog.commentsPage');
  const [isPending, startTransition] = useTransition();
  
  const [comments, setComments] = useState<AdminCommentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState(searchParams.search || '');
  const [status, setStatus] = useState<CommentStatus>(
    (searchParams.status as CommentStatus) || 'all'
  );
  const [page, setPage] = useState(parseInt(searchParams.page || '1'));
  const [actionLoading, setActionLoading] = useState(false);

  // Debounced search value - only triggers fetch after 300ms of no typing
  const debouncedSearch = useDebounce(search, DEBOUNCE_MS);

  // Track if this is the initial mount
  const initialMount = useRef(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch comments using server action
  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAdminCommentsAction({
        status: status !== 'all' ? status : undefined,
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      
      if (result.success) {
        setComments(result.comments as AdminCommentListItem[]);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [status, debouncedSearch, page]);

  // Fetch comments when debounced search, status, or page changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Reset page to 1 when filters change (but not on initial mount)
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    setPage(1);
  }, [status, debouncedSearch]);

  // Update URL params when filters change
  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (status !== 'all') queryParams.set('status', status);
    if (debouncedSearch) queryParams.set('search', debouncedSearch);
    if (page > 1) queryParams.set('page', String(page));
    
    const queryString = queryParams.toString();
    const newUrl = `/${routeLocale}/admin/comments${queryString ? `?${queryString}` : ''}`;
    
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [status, debouncedSearch, page, routeLocale, router]);

  // Handle status change
  const handleStatusChange = (newStatus: CommentStatus) => {
    setStatus(newStatus);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      setSelectedIds([]);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedIds.length === comments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(comments.map(c => c.id));
    }
  };

  // Handle single comment action
  const handleAction = async (action: string, commentId?: string) => {
    setActionLoading(true);
    try {
      let result;
      
      if (commentId) {
        // Single comment action
        switch (action) {
          case 'approve':
            result = await approveCommentAction(commentId);
            break;
          case 'spam':
            result = await markSpamAction(commentId);
            break;
          default:
            return;
        }
      } else {
        // Bulk action
        switch (action) {
          case 'approve':
            result = await bulkApproveAction(selectedIds);
            break;
          case 'spam':
            result = await bulkMarkSpamAction(selectedIds);
            break;
          default:
            return;
        }
      }

      if (result?.success) {
        setSelectedIds([]);
        fetchComments();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (commentId?: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    setActionLoading(true);
    try {
      let result;
      
      if (commentId) {
        result = await deleteCommentAction(commentId);
      } else {
        result = await bulkDeleteAction(selectedIds);
      }

      if (result?.success) {
        setSelectedIds([]);
        fetchComments();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (comment: AdminCommentListItem) => {
    if (comment.isSpam) {
      return (
        <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {t('spam')}
        </span>
      );
    }
    if (!comment.isApproved) {
      return (
        <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          {t('pending')}
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {t('approved')}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${routeLocale}/admin/comments/settings`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('settings')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Status tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['all', 'approved', 'pending', 'spam'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                status === s
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t(s)}
            </button>
          ))}
        </div>

        {/* Search (debounced) */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {t('selectedCount', { count: selectedIds.length })}
          </span>
          <button
            onClick={() => handleAction('approve')}
            disabled={actionLoading || isPending}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {t('bulkApprove')}
          </button>
          <button
            onClick={() => handleAction('spam')}
            disabled={actionLoading || isPending}
            className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {t('bulkSpam')}
          </button>
          <button
            onClick={() => handleDelete()}
            disabled={actionLoading || isPending}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {t('bulkDelete')}
          </button>
        </div>
      )}

      {/* Comments table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            {t('loading')}
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">{t('noComments')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === comments.length && comments.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('author')}
                </th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('content')}
                </th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 w-24">
                  {t('status')}
                </th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 w-32">
                  {t('date')}
                </th>
                <th className="text-right px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 w-32">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {comments.map((comment) => (
                <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(comment.id)}
                      onChange={() => toggleSelection(comment.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {comment.userDisplayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {comment.userEmail}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {comment.content}
                    </p>
                    {comment.spamReason && (
                      <p className="text-xs text-red-500 mt-1">
                        {t('reason')}: {comment.spamReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(comment)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      {!comment.isApproved && !comment.isSpam && (
                        <button
                          onClick={() => handleAction('approve', comment.id)}
                          disabled={actionLoading || isPending}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title={t('approve')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      {!comment.isSpam && (
                        <button
                          onClick={() => handleAction('spam', comment.id)}
                          disabled={actionLoading || isPending}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title={t('markSpam')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={actionLoading || isPending}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('delete')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('totalCount', { count: total })}
          </p>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('prev')}
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                {t('pageOf', { page, total: totalPages })}
              </span>
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('next')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
