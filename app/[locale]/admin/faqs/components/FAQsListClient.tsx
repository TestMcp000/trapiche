"use client";

/**
 * FAQs List Client Component
 *
 * Interactive list with create/edit/delete/reorder functionality for FAQs.
 * Supports drag and drop reordering.
 *
 * @see ../actions.ts - Server actions
 * @see doc/SPEC.md (FAQ: /admin/faqs)
 * @see doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md (PR-38)
 */

import { useState } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { FAQ } from "@/lib/types/faq";
import { getErrorLabel } from "@/lib/types/action-result";
import {
  createFAQAction,
  updateFAQAction,
  deleteFAQAction,
  toggleFAQVisibilityAction,
  reorderFAQsAction,
} from "../actions";

interface FAQsListClientProps {
  initialFaqs: FAQ[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

export default function FAQsListClient(props: FAQsListClientProps) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <FAQsListContent {...props} />
    </NextIntlClientProvider>
  );
}

function FAQsListContent({ initialFaqs, routeLocale }: FAQsListClientProps) {
  const t = useTranslations("admin.faqs");
  const tCommon = useTranslations("admin.common");

  // State
  const [faqs, setFaqs] = useState(initialFaqs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    question_zh: "",
    answer_zh: "",
    is_visible: true,
  });

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // ==========================================================================
  // Modal handlers
  // ==========================================================================

  const openCreateModal = () => {
    setFormData({ question_zh: "", answer_zh: "", is_visible: true });
    setIsCreating(true);
    setEditingFaq(null);
    setError(null);
  };

  const openEditModal = (faq: FAQ) => {
    setFormData({
      question_zh: faq.question_zh,
      answer_zh: faq.answer_zh,
      is_visible: faq.is_visible,
    });
    setEditingFaq(faq);
    setIsCreating(false);
    setError(null);
  };

  const closeModal = () => {
    setEditingFaq(null);
    setIsCreating(false);
    setError(null);
  };

  // ==========================================================================
  // CRUD handlers
  // ==========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreating) {
        const result = await createFAQAction(formData, routeLocale);
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setFaqs((prev) => [...prev, result.data!]);
        }
      } else if (editingFaq) {
        const result = await updateFAQAction(
          editingFaq.id,
          formData,
          routeLocale,
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setFaqs((prev) =>
            prev.map((f) => (f.id === editingFaq.id ? result.data! : f)),
          );
        }
      }
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (faq: FAQ) => {
    if (!confirm(t("confirmDelete"))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await deleteFAQAction(faq.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (faq: FAQ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await toggleFAQVisibilityAction(
        faq.id,
        !faq.is_visible,
        routeLocale,
      );
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      if (result.data) {
        setFaqs((prev) =>
          prev.map((f) => (f.id === faq.id ? result.data! : f)),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Drag & Drop handlers
  // ==========================================================================

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    // Reorder locally first for optimistic UI
    const draggedIndex = faqs.findIndex((f) => f.id === draggedId);
    const targetIndex = faqs.findIndex((f) => f.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newFaqs = [...faqs];
    const [dragged] = newFaqs.splice(draggedIndex, 1);
    newFaqs.splice(targetIndex, 0, dragged);
    setFaqs(newFaqs);
    setDraggedId(null);

    // Persist to server
    const orderedIds = newFaqs.map((f) => f.id);
    const result = await reorderFAQsAction(orderedIds, routeLocale);
    if (!result.success) {
      // Revert on error
      setFaqs(faqs);
      setError(getErrorLabel(result.errorCode, routeLocale));
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dragToReorder")}
        </p>
        <button
          onClick={openCreateModal}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("create")}
        </button>
      </div>

      {/* FAQs List */}
      {faqs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t("empty")}</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            {t("createFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              draggable
              onDragStart={(e) => handleDragStart(e, faq.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, faq.id)}
              onDragEnd={handleDragEnd}
              className={`group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-move transition-all ${
                draggedId === faq.id
                  ? "opacity-50 scale-[0.98]"
                  : "hover:shadow-md"
              } ${!faq.is_visible ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                {/* Drag Handle */}
                <div className="flex-shrink-0 pt-1 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {faq.question_zh}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {faq.answer_zh}
                      </p>
                    </div>

                    {/* Visibility Badge */}
                    <span
                      className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                        faq.is_visible
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}>
                      {faq.is_visible ? t("visible") : t("hidden")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => openEditModal(faq)}
                      disabled={loading}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
                      {tCommon("edit")}
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(faq)}
                      disabled={loading}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50">
                      {faq.is_visible ? t("hide") : t("show")}
                    </button>
                    <button
                      onClick={() => handleDelete(faq)}
                      disabled={loading}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
                      {tCommon("delete")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingFaq) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {isCreating ? t("createTitle") : t("editTitle")}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("question")} *
                  </label>
                  <input
                    type="text"
                    value={formData.question_zh}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        question_zh: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t("questionPlaceholder")}
                  />
                </div>

                {/* Answer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("answer")} *
                  </label>
                  <textarea
                    value={formData.answer_zh}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        answer_zh: e.target.value,
                      }))
                    }
                    required
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder={t("answerPlaceholder")}
                  />
                </div>

                {/* Visibility */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_visible"
                    checked={formData.is_visible}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_visible: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_visible"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t("isVisible")}
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {loading
                      ? tCommon("saving")
                      : isCreating
                        ? tCommon("create")
                        : tCommon("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
