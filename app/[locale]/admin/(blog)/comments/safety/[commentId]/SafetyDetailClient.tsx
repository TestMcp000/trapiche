'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    fetchAssessmentByCommentAction,
    labelDetailAssessmentAction,
    approveDetailCommentAction,
    rejectDetailCommentAction,
    promoteDetailToCorpusAction,
    promoteDetailToTrainingAction,
} from './actions';
import type {
    SafetyAssessmentDetail,
    SafetyHumanLabel,
    SafetyCorpusKind,
    SafetyRiskLevel,
} from '@/lib/types/safety-risk-engine';
import { getErrorLabel } from '@/lib/types/action-result';

interface SafetyDetailClientProps {
    commentId: string;
}

export default function SafetyDetailClient({ commentId }: SafetyDetailClientProps) {
    const t = useTranslations('admin.safety');
    const locale = useLocale();
    const router = useRouter();

    const [assessment, setAssessment] = useState<SafetyAssessmentDetail | null>(null);
    const [commentContent, setCommentContent] = useState<string>('');
    const [trainingActiveBatch, setTrainingActiveBatch] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [promoteText, setPromoteText] = useState('');
    const [promoteLabel, setPromoteLabel] = useState('');
    const [promoteKind, setPromoteKind] = useState<SafetyCorpusKind>('slang');

    const [showTrainingModal, setShowTrainingModal] = useState(false);
    const [trainingRiskLevel, setTrainingRiskLevel] = useState<SafetyRiskLevel>('Uncertain');
    const [trainingConfidence, setTrainingConfidence] = useState(0.7);
    const [trainingReason, setTrainingReason] = useState('');
    const [trainingSaving, setTrainingSaving] = useState(false);
    const [trainingError, setTrainingError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const result = await fetchAssessmentByCommentAction(commentId);
                if (!result.success) {
                    setError(getErrorLabel(result.errorCode, locale));
                    return;
                }

                setError(null);
                setAssessment(result.data?.assessment ?? null);
                setCommentContent(result.data?.comment?.content || '');
                setTrainingActiveBatch(result.data?.trainingActiveBatch ?? null);
            } catch (error) {
                console.error('Failed to fetch assessment:', error);
                setError(getErrorLabel('internal_error', locale));
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [commentId, locale]);

    const handleLabel = async (label: SafetyHumanLabel) => {
        if (!assessment) return;
        const result = await labelDetailAssessmentAction(assessment.id, label);
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, locale));
            return;
        }

        setAssessment(prev => prev ? { ...prev, humanLabel: label } : null);
    };

    const handleApprove = async () => {
        const result = await approveDetailCommentAction(commentId);
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, locale));
            return;
        }

        router.push(`/${locale}/admin/comments/safety`);
    };

    const handleReject = async () => {
        if (!confirm(t('confirmReject'))) return;
        const result = await rejectDetailCommentAction(commentId);
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, locale));
            return;
        }

        router.push(`/${locale}/admin/comments/safety`);
    };

    const handlePromoteToCorpus = async () => {
        if (!promoteText || !promoteLabel) return;
        const result = await promoteDetailToCorpusAction({
            text: promoteText,
            label: promoteLabel,
            kind: promoteKind,
            activate: false,
        });
        if (!result.success) {
            setError(getErrorLabel(result.errorCode, locale));
            return;
        }

        setShowPromoteModal(false);
        setPromoteText('');
        setPromoteLabel('');
        alert(t('toast.promoteToCorpusDraft'));
    };

    const openTrainingModal = () => {
        if (!assessment) return;

        setTrainingRiskLevel(assessment.aiRiskLevel ?? 'Uncertain');
        setTrainingConfidence(assessment.confidence ?? 0.7);
        setTrainingReason(assessment.aiReason ?? '');
        setTrainingError(null);
        setShowTrainingModal(true);
    };

    const handlePromoteToTraining = async () => {
        if (!assessment) return;

        const trimmedReason = trainingReason.trim();
        if (!trimmedReason) {
            setTrainingError(t('training.errors.reasonRequired'));
            return;
        }

        const confidence = Number.isFinite(trainingConfidence) ? trainingConfidence : 0;
        if (confidence < 0 || confidence > 1) {
            setTrainingError(t('training.errors.confidenceRange'));
            return;
        }

        setTrainingSaving(true);
        setTrainingError(null);

        const result = await promoteDetailToTrainingAction(assessment.id, {
            risk_level: trainingRiskLevel,
            confidence,
            reason: trimmedReason,
        });

        setTrainingSaving(false);

        if (!result.success) {
            setTrainingError(getErrorLabel(result.errorCode, locale));
            return;
        }

        setShowTrainingModal(false);
        alert(
            t('training.toast.added', {
                batch: trainingActiveBatch ?? t('training.batchNotSet'),
            })
        );
    };

    const getRiskBadgeColor = (level: string | null) => {
        switch (level) {
            case 'High_Risk': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'Uncertain': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'Safe': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getRiskLabel = (level: SafetyRiskLevel | null) => {
        if (!level) return t('riskLevels.unknown');
        return t(`riskLevels.${level}` as const);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Back button */}
            <button
                onClick={() => router.push(`/${locale}/admin/comments/safety`)}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('detail.backToQueue')}
            </button>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('detail.title')}</h1>
            </div>

            {/* Original Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.originalContent')}</h2>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{commentContent}</p>
                </div>
            </div>

            {assessment && (
                <>
                    {/* Assessment Layers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Layer 1 */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('detail.layer1Hit')}</h3>
                            {assessment.layer1Hit ? (
                                <span className="inline-flex px-2 py-1 text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                                    {assessment.layer1Hit}
                                </span>
                            ) : (
                                <span className="text-gray-400">{t('detail.none')}</span>
                            )}
                        </div>

                        {/* Layer 2 - RAG Context */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('detail.layer2Context')}</h3>
                            {assessment.layer2Context && assessment.layer2Context.length > 0 ? (
                                <div className="space-y-2">
                                    {assessment.layer2Context.map((ctx, i) => (
                                        <div key={i} className="text-sm">
                                            <span className="font-medium">{ctx.label}</span>
                                            <span className="text-gray-500 ml-2">({(ctx.score * 100).toFixed(0)}%)</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-gray-400">{t('detail.none')}</span>
                            )}
                        </div>

                        {/* Layer 3 - AI Result */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('detail.layer3Result')}</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className={`inline-flex px-2 py-1 text-sm font-medium rounded ${getRiskBadgeColor(assessment.aiRiskLevel)}`}>
                                        {getRiskLabel(assessment.aiRiskLevel)}
                                    </span>
                                </div>
                                {assessment.confidence !== null && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('detail.confidence')}: {(assessment.confidence * 100).toFixed(0)}%
                                    </div>
                                )}
                                {assessment.latencyMs && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('detail.latency')}: {assessment.latencyMs}ms
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Reason */}
                    {assessment.aiReason && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('detail.reason')}</h3>
                            <p className="text-gray-900 dark:text-white">{assessment.aiReason}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('table.actions')}</h3>

                        {/* Main Actions */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <button
                                onClick={handleApprove}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                {t('actions.approve')}
                            </button>
                            <button
                                onClick={handleReject}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                {t('actions.reject')}
                            </button>
                            <button
                                onClick={() => {
                                    setPromoteText(commentContent);
                                    setShowPromoteModal(true);
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                {t('actions.promoteToCorpus')}
                            </button>
                            <button
                                onClick={openTrainingModal}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                {t('actions.promoteToTraining')}
                            </button>
                        </div>

                        {/* Label Actions */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('actions.label')}</h4>
                            <div className="flex flex-wrap gap-2">
                                {(['True_Positive', 'False_Positive', 'True_Negative', 'False_Negative'] as SafetyHumanLabel[]).map((label) => (
                                    <button
                                        key={label}
                                        onClick={() => handleLabel(label)}
                                        className={`px-3 py-1 text-sm rounded-full border ${
                                            assessment.humanLabel === label
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {t(`labels.${label.toLowerCase().replace('_', '') as 'truePositive' | 'falsePositive' | 'trueNegative' | 'falseNegative'}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Promote Modal */}
            {showPromoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('actions.promoteToCorpus')}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('corpus.content')}</label>
                                <textarea
                                    value={promoteText}
                                    onChange={(e) => setPromoteText(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('corpus.label')}</label>
                                <input
                                    type="text"
                                    value={promoteLabel}
                                    onChange={(e) => setPromoteLabel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('corpus.kind')}</label>
                                <select
                                    value={promoteKind}
                                    onChange={(e) => setPromoteKind(e.target.value as SafetyCorpusKind)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                >
                                    <option value="slang">{t('corpus.slang')}</option>
                                    <option value="case">{t('corpus.case')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowPromoteModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                {t('training.cancel')}
                            </button>
                            <button
                                onClick={handlePromoteToCorpus}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                {t('actions.promoteToCorpus')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Training Modal */}
            {showTrainingModal && assessment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('training.title')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {t('training.subtitle', { batch: trainingActiveBatch ?? t('training.batchNotSet') })}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('training.riskLevel')}
                                </label>
                                <select
                                    value={trainingRiskLevel}
                                    onChange={(e) => setTrainingRiskLevel(e.target.value as SafetyRiskLevel)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                >
                                    <option value="Safe">{t('riskLevels.Safe')}</option>
                                    <option value="High_Risk">{t('riskLevels.High_Risk')}</option>
                                    <option value="Uncertain">{t('riskLevels.Uncertain')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('training.confidence')}
                                </label>
                                <input
                                    type="number"
                                    value={trainingConfidence}
                                    onChange={(e) => setTrainingConfidence(parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('training.reason')}
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('training.reasonHint')}</p>
                                <textarea
                                    value={trainingReason}
                                    onChange={(e) => setTrainingReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            {trainingError && (
                                <div className="text-sm text-red-600 dark:text-red-400">{trainingError}</div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowTrainingModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                disabled={trainingSaving}
                            >
                                {t('training.cancel')}
                            </button>
                            <button
                                onClick={handlePromoteToTraining}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                disabled={trainingSaving}
                            >
                                {trainingSaving ? t('training.saving') : t('training.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
