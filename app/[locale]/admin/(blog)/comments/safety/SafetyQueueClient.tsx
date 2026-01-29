'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { fetchSafetyQueueAction, approveCommentAction, rejectCommentAction } from './actions';
import type { SafetyQueueItem, SafetyQueueFilters, SafetyRiskLevel } from '@/lib/types/safety-risk-engine';
import { getErrorLabel } from '@/lib/types/action-result';

export default function SafetyQueueClient() {
    const t = useTranslations('admin.safety');
    const routeLocale = useLocale();
    const router = useRouter();

    const [items, setItems] = useState<SafetyQueueItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<SafetyQueueFilters>({
        limit: 20,
        offset: 0,
    });
    const [search, setSearch] = useState('');

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchSafetyQueueAction({
                ...filters,
                search: search || undefined,
            });
            if (!result.success) {
                setItems([]);
                setTotal(0);
                setError(getErrorLabel(result.errorCode, routeLocale));
                return;
            }

            setItems(result.data?.items ?? []);
            setTotal(result.data?.total ?? 0);
        } catch (error) {
            console.error('Failed to fetch safety queue:', error);
            setError(getErrorLabel('internal_error', routeLocale));
        } finally {
            setLoading(false);
        }
    }, [filters, search, routeLocale]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    const handleApprove = async (commentId: string) => {
        const result = await approveCommentAction(commentId);
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, routeLocale));
            return;
        }

        fetchQueue();
    };

    const handleReject = async (commentId: string) => {
        if (!confirm(t('confirmReject'))) return;
        const result = await rejectCommentAction(commentId);
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, routeLocale));
            return;
        }

        fetchQueue();
    };

    const handleViewDetail = (commentId: string, assessmentId: string | null) => {
        if (assessmentId) {
            router.push(`/${routeLocale}/admin/comments/safety/${commentId}`);
        }
    };

    const handleFilterChange = (key: keyof SafetyQueueFilters, value: string | number | undefined) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            offset: 0, // Reset pagination on filter change
        }));
    };

    const getRiskBadgeColor = (level: SafetyRiskLevel | null) => {
        switch (level) {
            case 'High_Risk': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'Uncertain': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'Safe': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const formatRiskLevel = (level: SafetyRiskLevel | null) => {
        switch (level) {
            case 'High_Risk': return t('riskLevels.High_Risk');
            case 'Uncertain': return t('riskLevels.Uncertain');
            case 'Safe': return t('riskLevels.Safe');
            default: return t('riskLevels.unknown');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder={t('filters.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <select
                    value={filters.riskLevel || ''}
                    onChange={(e) => handleFilterChange('riskLevel', e.target.value as SafetyRiskLevel || undefined)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                    <option value="">{t('filters.riskLevel')}</option>
                    <option value="High_Risk">{t('riskLevels.High_Risk')}</option>
                    <option value="Uncertain">{t('riskLevels.Uncertain')}</option>
                    <option value="Safe">{t('riskLevels.Safe')}</option>
                </select>

                <select
                    value={filters.targetType || ''}
                    onChange={(e) => handleFilterChange('targetType', e.target.value as 'post' | 'gallery_item' || undefined)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                    <option value="">{t('filters.targetType')}</option>
                    <option value="post">{t('targetTypes.post')}</option>
                    <option value="gallery_item">{t('targetTypes.gallery_item')}</option>
                </select>

                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('totalCount', { count: total })}
                </span>
            </div>

            {/* Queue List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{t('queueEmpty')}</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('queueEmptyDesc')}</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.content')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.risk')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.author')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.date')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map((item) => (
                                <tr
                                    key={item.commentId}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                    onClick={() => handleViewDetail(item.commentId, item.assessmentId)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                            {item.content}
                                        </div>
                                        {item.layer1Hit && (
                                            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                L1: {item.layer1Hit}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadgeColor(item.riskLevel)}`}>
                                            {formatRiskLevel(item.riskLevel)}
                                        </span>
                                        {item.confidence !== null && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {(item.confidence * 100).toFixed(0)}%
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {item.authorName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(item.createdAt).toLocaleDateString('zh-TW')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleApprove(item.commentId); }}
                                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                                        >
                                            {t('actions.approve')}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleReject(item.commentId); }}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            {t('actions.reject')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {total > filters.limit! && (
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => handleFilterChange('offset', Math.max(0, (filters.offset || 0) - filters.limit!))}
                        disabled={(filters.offset || 0) === 0}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        {t('pagination.previous')}
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t('pagination.pageOf', {
                            page: Math.floor((filters.offset || 0) / filters.limit!) + 1,
                            total: Math.ceil(total / filters.limit!),
                        })}
                    </span>
                    <button
                        onClick={() => handleFilterChange('offset', (filters.offset || 0) + filters.limit!)}
                        disabled={(filters.offset || 0) + filters.limit! >= total}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        {t('pagination.next')}
                    </button>
                </div>
            )}
        </div>
    );
}
