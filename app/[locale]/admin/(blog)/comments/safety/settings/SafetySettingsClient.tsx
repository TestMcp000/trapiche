'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { fetchSafetySettingsAction, updateSafetySettingsAction } from './actions';
import type { SafetyEngineSettings } from '@/lib/types/safety-risk-engine';
import { getErrorLabel } from '@/lib/types/action-result';

export default function SafetySettingsClient() {
    const t = useTranslations('admin.safety.settings');
    const locale = useLocale();

    const [settings, setSettings] = useState<SafetyEngineSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [isEnabled, setIsEnabled] = useState(false);
    const [modelId, setModelId] = useState('');
    const [timeoutMs, setTimeoutMs] = useState(5000);
    const [riskThreshold, setRiskThreshold] = useState(0.5);
    const [trainingActiveBatch, setTrainingActiveBatch] = useState('');
    const [heldMessage, setHeldMessage] = useState('');
    const [rejectedMessage, setRejectedMessage] = useState('');

    useEffect(() => {
        async function fetchData() {
            try {
                const result = await fetchSafetySettingsAction();
                if (!result.success) {
                    setError(getErrorLabel(result.errorCode, locale));
                    setSettings(null);
                    return;
                }

                const data = result.data ?? null;
                if (data) {
                    setSettings(data);
                    setIsEnabled(data.isEnabled);
                    setModelId(data.modelId);
                    setTimeoutMs(data.timeoutMs);
                    setRiskThreshold(data.riskThreshold);
                    setTrainingActiveBatch(data.trainingActiveBatch);
                    setHeldMessage(data.heldMessage || '');
                    setRejectedMessage(data.rejectedMessage || '');
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                setError(getErrorLabel('internal_error', locale));
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [locale]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError(null);

        try {
            const result = await updateSafetySettingsAction({
                isEnabled,
                modelId,
                timeoutMs,
                riskThreshold,
                trainingActiveBatch,
                heldMessage,
                rejectedMessage,
            });

            if (!result.success) {
                setError(getErrorLabel(result.errorCode, locale));
                return;
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setError(getErrorLabel('internal_error', locale));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="p-6">
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">{t('notFound')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-2xl">
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

            {/* Settings Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-gray-900 dark:text-white">{t('enabled')}</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('enabledDesc')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsEnabled(!isEnabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {/* Model ID */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('model')}</label>
                    <input
                        type="text"
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="gemini-1.5-flash"
                    />
                </div>

                {/* Timeout */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('timeout')}</label>
                    <input
                        type="number"
                        value={timeoutMs}
                        onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 5000)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        min="1000"
                        max="30000"
                        step="500"
                    />
                </div>

                {/* Risk Threshold */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('threshold')}</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('thresholdDesc')}</p>
                    <input
                        type="number"
                        value={riskThreshold}
                        onChange={(e) => setRiskThreshold(parseFloat(e.target.value) || 0.5)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        min="0"
                        max="1"
                        step="0.05"
                    />
                </div>

                {/* Training Active Batch */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('trainingBatch')}</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('trainingBatchDesc')}</p>
                    <input
                        type="text"
                        value={trainingActiveBatch}
                        onChange={(e) => setTrainingActiveBatch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="2026-01_cold_start"
                    />
                </div>

                {/* Held Message */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('heldMessage')}</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('heldMessageDesc')}</p>
                    <textarea
                        value={heldMessage}
                        onChange={(e) => setHeldMessage(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                </div>

                {/* Rejected Message */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rejectedMessage')}</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('rejectedMessageDesc')}</p>
                    <textarea
                        value={rejectedMessage}
                        onChange={(e) => setRejectedMessage(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? t('saving') : t('save')}
                    </button>
                    {saved && (
                        <span className="text-sm text-green-600 dark:text-green-400">{t('saved')}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
