'use client';

/**
 * Appointment Modal Component
 *
 * Create/Edit/Delete modal for user appointments.
 * Handles local time display and UTC conversion for server.
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 *
 * @module app/[locale]/admin/users/[id]/components/AppointmentModal
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { getErrorLabel } from '@/lib/types/action-result';
import type { UserAppointmentSummary } from '@/lib/types/user';
import {
  createAppointmentAction,
  updateAppointmentAction,
  deleteAppointmentAction,
} from '../../actions';

interface AppointmentModalProps {
  appointment: UserAppointmentSummary | null;
  userId: string;
  routeLocale: string;
  isOwner: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AppointmentModal({
  appointment,
  userId,
  routeLocale,
  isOwner,
  selectedDate,
  onClose,
  onSuccess,
}: AppointmentModalProps) {
  const isEdit = !!appointment;
  const t = useTranslations('admin.users.detail.appointment');

  // Initialize form with existing data or defaults
  const getDefaultStartTime = () => {
    if (appointment) {
      return format(new Date(appointment.startAt), "yyyy-MM-dd'T'HH:mm");
    }
    const d = new Date(selectedDate);
    d.setHours(9, 0, 0, 0);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  const getDefaultEndTime = () => {
    if (appointment) {
      return format(new Date(appointment.endAt), "yyyy-MM-dd'T'HH:mm");
    }
    const d = new Date(selectedDate);
    d.setHours(10, 0, 0, 0);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  const [startAt, setStartAt] = useState(getDefaultStartTime);
  const [endAt, setEndAt] = useState(getDefaultEndTime);
  const [note, setNote] = useState(appointment?.note || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Convert local datetime to ISO UTC
      const startUtc = new Date(startAt).toISOString();
      const endUtc = new Date(endAt).toISOString();

      // Validate: end must be after start
      if (new Date(endUtc) <= new Date(startUtc)) {
        setError(t('endAfterStart'));
        setSaving(false);
        return;
      }

      if (isEdit && appointment) {
        const result = await updateAppointmentAction(
          appointment.id,
          { startAt: startUtc, endAt: endUtc, note: note.trim() || null },
          userId,
          routeLocale
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
      } else {
        const result = await createAppointmentAction(
          userId,
          { startAt: startUtc, endAt: endUtc, note: note.trim() || null },
          routeLocale
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
      }

      onSuccess();
    } catch (_err) {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    
    setDeleting(true);
    setError(null);

    try {
      const result = await deleteAppointmentAction(appointment.id, userId, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      onSuccess();
    } catch (_err) {
      setError(t('error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isEdit ? t('edit') : t('new')}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              {t('deletePrompt')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? t('deleting') : t('confirmDelete')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('startTime')}
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('endTime')}
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('note')}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                disabled={!isOwner}
                placeholder={t('notePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                {isEdit && isOwner && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    {t('delete')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {isOwner ? t('cancel') : t('close')}
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? t('saving') : t('save')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

