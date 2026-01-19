'use client';

/**
 * Templates Client Component
 *
 * Client component for managing custom AI analysis templates.
 * Owner can CRUD, Editor views enabled templates read-only.
 *
 * @see app/[locale]/admin/(data)/ai-analysis/templates/page.tsx
 * @see doc/meta/STEP_PLAN.md - PR-2A
 */

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import type {
  AnalysisCustomTemplateListItem,
  AnalysisCustomTemplate,
} from '@/lib/types/ai-analysis';

import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
  toggleTemplateEnabledAction,
  getTemplateAction,
} from './actions';

interface TemplatesClientProps {
  role: 'owner' | 'editor';
  initialTemplates: AnalysisCustomTemplateListItem[];
}

export function TemplatesClient({ role, initialTemplates }: TemplatesClientProps) {
  const t = useTranslations('admin.data.aiAnalysis.templates');
  const tCommon = useTranslations('admin.data.common');

  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<AnalysisCustomTemplateListItem[]>(
    initialTemplates
  );

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTemplate, setEditingTemplate] = useState<AnalysisCustomTemplate | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPromptText, setFormPromptText] = useState('');
  const [formIsEnabled, setFormIsEnabled] = useState(true);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isOwner = role === 'owner';

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  // Open create modal
  const openCreateModal = () => {
    setFormName('');
    setFormPromptText('');
    setFormIsEnabled(true);
    setEditingTemplate(null);
    setModalMode('create');
    setShowModal(true);
    setError(null);
  };

  // Open edit modal
  const openEditModal = async (templateId: string) => {
    startTransition(async () => {
      const result = await getTemplateAction(templateId);
      if (result.success && result.data) {
        setEditingTemplate(result.data);
        setFormName(result.data.name);
        setFormPromptText(result.data.promptText);
        setFormIsEnabled(result.data.isEnabled);
        setModalMode('edit');
        setShowModal(true);
        setError(null);
      } else {
        setError(result.error || 'Failed to load template');
      }
    });
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormName('');
    setFormPromptText('');
    setFormIsEnabled(true);
  };

  // Handle save (create or update)
  const handleSave = () => {
    setError(null);

    if (!formName.trim()) {
      setError('Name is required');
      return;
    }

    if (!formPromptText.trim()) {
      setError('Prompt text is required');
      return;
    }

    startTransition(async () => {
      if (modalMode === 'create') {
        const result = await createTemplateAction({
          name: formName.trim(),
          promptText: formPromptText,
        });

        if (result.success && result.data) {
          setTemplates((prev) => [
            {
              id: result.data!.id,
              name: result.data!.name,
              isEnabled: result.data!.isEnabled,
              createdAt: result.data!.createdAt,
            },
            ...prev,
          ]);
          setSuccessMessage('Template created successfully');
          closeModal();
        } else {
          setError(result.error || 'Failed to create template');
        }
      } else {
        if (!editingTemplate) return;

        const result = await updateTemplateAction(editingTemplate.id, {
          name: formName.trim(),
          promptText: formPromptText,
          isEnabled: formIsEnabled,
        });

        if (result.success && result.data) {
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editingTemplate.id
                ? {
                    ...t,
                    name: result.data!.name,
                    isEnabled: result.data!.isEnabled,
                  }
                : t
            )
          );
          setSuccessMessage('Template updated successfully');
          closeModal();
        } else {
          setError(result.error || 'Failed to update template');
        }
      }
    });
  };

  // Handle delete
  const handleDelete = (templateId: string) => {
    if (!window.confirm(t('deleteConfirm'))) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTemplateAction(templateId);
      if (result.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        setSuccessMessage('Template deleted');
      } else {
        setError(result.error || 'Failed to delete template');
      }
    });
  };

  // Handle toggle enabled
  const handleToggleEnabled = (templateId: string, currentEnabled: boolean) => {
    startTransition(async () => {
      const result = await toggleTemplateEnabledAction(templateId, !currentEnabled);
      if (result.success) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === templateId ? { ...t, isEnabled: !currentEnabled } : t
          )
        );
      } else {
        setError(result.error || 'Failed to toggle template');
      }
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="../ai-analysis"
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to AI Analysis
          </Link>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        {isOwner && (
          <button
            onClick={openCreateModal}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {t('create')}
          </button>
        )}
      </div>

      {/* Editor notice */}
      {!isOwner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-sm">{t('editorNotice')}</p>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">{t('noTemplates')}</p>
          {isOwner && <p className="text-sm">{t('createFirst')}</p>}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('name')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('createdAt')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                {isOwner && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {tCommon('actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {template.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(template.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        template.isEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {template.isEnabled ? t('enabled') : t('disabled')}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right text-sm space-x-2">
                      <button
                        onClick={() => handleToggleEnabled(template.id, template.isEnabled)}
                        disabled={isPending}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        {template.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEditModal(template.id)}
                        disabled={isPending}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {tCommon('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {t('delete')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {modalMode === 'create' ? t('create') : t('edit')}
              </h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    className="w-full border rounded-lg px-3 py-2"
                    maxLength={80}
                  />
                </div>

                {/* Prompt Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('prompt')}
                  </label>
                  <textarea
                    value={formPromptText}
                    onChange={(e) => setFormPromptText(e.target.value)}
                    placeholder={t('promptPlaceholder')}
                    rows={8}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('promptHint')}</p>
                </div>

                {/* Enabled toggle (edit mode only) */}
                {modalMode === 'edit' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isEnabled"
                      checked={formIsEnabled}
                      onChange={(e) => setFormIsEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor="isEnabled" className="text-sm text-gray-700">
                      {t('enabled')}
                    </label>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModal}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? t('saving') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
