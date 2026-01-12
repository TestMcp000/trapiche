'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveShopSettings, type SettingsInput } from './actions';
import type { InvoiceConfigMode, InvoiceToggles, ShopSettingsRow } from '@/lib/types/shop';

interface SettingsFormProps {
  routeLocale: string;
  initialSettings: ShopSettingsRow | null;
}

export default function SettingsForm({ routeLocale, initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [reservedTtlMinutes, setReservedTtlMinutes] = useState(initialSettings?.reserved_ttl_minutes ?? 30);
  const [invoiceConfigMode, setInvoiceConfigMode] = useState<InvoiceConfigMode>(
    initialSettings?.invoice_config_mode ?? 'toggles'
  );
  const [invoiceToggles, setInvoiceToggles] = useState<InvoiceToggles>(
    initialSettings?.invoice_toggles_json ?? { taxId: false, mobileCarrier: false, citizenCert: false }
  );
  const [invoiceJsonSchema, setInvoiceJsonSchema] = useState(
    initialSettings?.invoice_json_schema ? JSON.stringify(initialSettings.invoice_json_schema, null, 2) : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Parse JSON Schema if in jsonSchema mode
    let parsedJsonSchema: Record<string, unknown> | undefined;
    if (invoiceConfigMode === 'jsonSchema' && invoiceJsonSchema.trim()) {
      try {
        parsedJsonSchema = JSON.parse(invoiceJsonSchema);
      } catch {
        setError(t('shop.settings.jsonError'));
        return;
      }
    }

    const input: SettingsInput = {
      reservedTtlMinutes,
      invoiceConfigMode,
      invoiceTogglesJson: invoiceConfigMode === 'toggles' ? invoiceToggles : undefined,
      invoiceJsonSchema: parsedJsonSchema,
    };

    startTransition(async () => {
      const result = await saveShopSettings(input);
      if (result.success) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(result.error || 'Failed to save settings');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
          {t('shop.settings.saved')}
        </div>
      )}

      {/* Visibility Info - Moved to Feature Settings */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {t('shop.settings.visibility')}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {t('shop.settings.visibilityDesc')}
            </p>
            <a
              href={`/${routeLocale}/admin/features`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
            >
              {t('shop.settings.goToFeatures')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Reserved TTL */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('shop.settings.inventory')}
          </h2>
        </div>
        <div className="p-6">
          <div>
            <label className="block font-medium text-gray-900 dark:text-white mb-2">
              {t('shop.settings.ttlLabel')}
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {t('shop.settings.ttlDesc')}
            </p>
            <input
              type="number"
              value={reservedTtlMinutes}
              onChange={(e) => setReservedTtlMinutes(parseInt(e.target.value) || 30)}
              min={5}
              max={120}
              className="w-32 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Invoice Config */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('shop.settings.invoice')}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block font-medium text-gray-900 dark:text-white mb-2">
              {t('shop.settings.configMode')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invoiceMode"
                  value="toggles"
                  checked={invoiceConfigMode === 'toggles'}
                  onChange={() => setInvoiceConfigMode('toggles')}
                  className="text-blue-600"
                />
                <span className="text-gray-900 dark:text-white">
                  {t('shop.settings.simpleMode')}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invoiceMode"
                  value="jsonSchema"
                  checked={invoiceConfigMode === 'jsonSchema'}
                  onChange={() => setInvoiceConfigMode('jsonSchema')}
                  className="text-blue-600"
                />
                <span className="text-gray-900 dark:text-white">
                  {t('shop.settings.advancedMode')}
                </span>
              </label>
            </div>
          </div>

          {/* Toggle Options */}
          {invoiceConfigMode === 'toggles' && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                {t('shop.settings.invoiceFields')}
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceToggles.taxId}
                    onChange={(e) => setInvoiceToggles({ ...invoiceToggles, taxId: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-900 dark:text-white">
                    {t('shop.settings.taxId')}
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceToggles.mobileCarrier}
                    onChange={(e) => setInvoiceToggles({ ...invoiceToggles, mobileCarrier: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-900 dark:text-white">
                    {t('shop.settings.mobileCarrier')}
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceToggles.citizenCert}
                    onChange={(e) => setInvoiceToggles({ ...invoiceToggles, citizenCert: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-900 dark:text-white">
                    {t('shop.settings.citizenCert')}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* JSON Schema */}
          {invoiceConfigMode === 'jsonSchema' && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                {t('shop.settings.schemaEditor')}
              </h3>
              <textarea
                rows={8}
                value={invoiceJsonSchema}
                onChange={(e) => setInvoiceJsonSchema(e.target.value)}
                placeholder='{"type": "object", "properties": {...}}'
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('shop.settings.schemaHint')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? t('shop.settings.saving') : t('shop.settings.save')}
        </button>
      </div>
    </form>
  );
}
