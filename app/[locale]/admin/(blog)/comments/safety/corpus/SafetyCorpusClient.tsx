'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
    fetchCorpusItemsAction,
    createCorpusItemAction,
    updateCorpusItemAction,
    updateCorpusStatusAction,
    deleteCorpusItemAction,
} from './actions';
import type { SafetyCorpusItem, SafetyCorpusKind, SafetyCorpusStatus } from '@/lib/types/safety-risk-engine';
import { getErrorLabel } from '@/lib/types/action-result';

export default function SafetyCorpusClient() {
    const t = useTranslations('admin.safety.corpus');
    const locale = useLocale();

    const [items, setItems] = useState<SafetyCorpusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<SafetyCorpusItem | null>(null);
    const [filters, setFilters] = useState<{ kind?: SafetyCorpusKind; status?: SafetyCorpusStatus; search?: string }>({});

    // Form state
    const [formKind, setFormKind] = useState<SafetyCorpusKind>('slang');
    const [formLabel, setFormLabel] = useState('');
    const [formContent, setFormContent] = useState('');

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchCorpusItemsAction(filters);
            if (!result.success) {
                setError(getErrorLabel(result.errorCode, locale));
                setItems([]);
                return;
            }
            setItems(result.data ?? []);
        } catch (error) {
            console.error('Failed to fetch corpus items:', error);
            setError(getErrorLabel('internal_error', locale));
        } finally {
            setLoading(false);
        }
    }, [filters, locale]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const openCreateModal = () => {
        setEditItem(null);
        setFormKind('slang');
        setFormLabel('');
        setFormContent('');
        setShowModal(true);
    };

    const openEditModal = (item: SafetyCorpusItem) => {
        setEditItem(item);
        setFormKind(item.kind);
        setFormLabel(item.label);
        setFormContent(item.content);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formLabel || !formContent) return;
        setError(null);

        if (editItem) {
            const result = await updateCorpusItemAction(editItem.id, { label: formLabel, content: formContent });
            if (!result.success) {
                setError(getErrorLabel(result.errorCode, locale));
                return;
            }
        } else {
            const result = await createCorpusItemAction({ kind: formKind, label: formLabel, content: formContent });
            if (!result.success) {
                setError(getErrorLabel(result.errorCode, locale));
                return;
            }
        }

        setShowModal(false);
        fetchItems();
    };

    const handleStatusChange = async (id: string, status: SafetyCorpusStatus) => {
        const result = await updateCorpusStatusAction(id, status);
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, locale));
            return;
        }
        fetchItems();
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('confirmDelete'))) return;
        const result = await deleteCorpusItemAction(id);
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, locale));
            return;
        }
        fetchItems();
    };

    const getStatusBadgeColor = (status: SafetyCorpusStatus) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'deprecated': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    {t('addItem')}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <select
                    value={filters.kind || ''}
                    onChange={(e) => setFilters(f => ({ ...f, kind: e.target.value as SafetyCorpusKind || undefined }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                    <option value="">{t('kind')}</option>
                    <option value="slang">{t('slang')}</option>
                    <option value="case">{t('case')}</option>
                </select>

                <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as SafetyCorpusStatus || undefined }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                    <option value="">{t('status')}</option>
                    <option value="draft">{t('draft')}</option>
                    <option value="active">{t('active')}</option>
                    <option value="deprecated">{t('deprecated')}</option>
                </select>

                <input
                    type="text"
                    placeholder="搜尋..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value || undefined }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
            </div>

            {/* Items List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">找不到語料庫項目</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('kind')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('label')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('content')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('status')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-900 dark:text-white capitalize">{item.kind}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.content}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(item.status)}`}>
                                            {t(item.status as 'draft' | 'active' | 'deprecated')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-3"
                                        >
                                            {t('edit')}
                                        </button>
                                        {item.status === 'draft' && (
                                            <button
                                                onClick={() => handleStatusChange(item.id, 'active')}
                                                className="text-green-600 hover:text-green-900 dark:text-green-400 mr-3"
                                                title={t('activateHint')}
                                            >
                                                {t('activate')}
                                            </button>
                                        )}
                                        {item.status === 'active' && (
                                            <button
                                                onClick={() => handleStatusChange(item.id, 'deprecated')}
                                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 mr-3"
                                            >
                                                {t('deprecate')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                                        >
                                            {t('delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {editItem ? t('editItem') : t('addItem')}
                        </h3>

                        <div className="space-y-4">
                            {!editItem && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('kind')}</label>
                                    <select
                                        value={formKind}
                                        onChange={(e) => setFormKind(e.target.value as SafetyCorpusKind)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    >
                                        <option value="slang">{t('slang')}</option>
                                        <option value="case">{t('case')}</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('label')}</label>
                                <input
                                    type="text"
                                    value={formLabel}
                                    onChange={(e) => setFormLabel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('content')}</label>
                                <textarea
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                儲存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
