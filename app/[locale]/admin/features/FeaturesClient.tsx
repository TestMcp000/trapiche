'use client';

import { useState, useTransition } from 'react';
import { setFeatureEnabled } from '@/lib/features/admin-io';
import type { FeatureSetting } from '@/lib/types/features';
import { FEATURE_METADATA } from '@/lib/types/features';

interface FeaturesClientProps {
  features: FeatureSetting[];
  locale: string;
}

export default function FeaturesClient({ features, locale }: FeaturesClientProps) {
  const [featureStates, setFeatureStates] = useState(
    Object.fromEntries(features.map((f) => [f.feature_key, f.is_enabled]))
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleToggle = (key: string) => {
    const newValue = !featureStates[key];
    setPendingKey(key);

    // Optimistic update
    setFeatureStates((prev) => ({ ...prev, [key]: newValue }));

    startTransition(async () => {
      const result = await setFeatureEnabled(key as 'blog' | 'gallery' | 'shop', newValue);

      if (!result.success) {
        // Revert on error
        setFeatureStates((prev) => ({ ...prev, [key]: !newValue }));
        setError(result.error || (locale === 'zh' ? '切換失敗' : 'Toggle failed'));
      } else {
        setError(null);
      }
      setPendingKey(null);
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}
      {features.map((feature) => {
        const meta = FEATURE_METADATA[feature.feature_key as keyof typeof FEATURE_METADATA];
        const isEnabled = featureStates[feature.feature_key];
        const isLoading = isPending && pendingKey === feature.feature_key;

        return (
          <div
            key={feature.feature_key}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{meta?.icon || '⚙️'}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {locale === 'zh' ? meta?.labelZh : meta?.labelEn}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'zh'
                      ? feature.description_zh
                      : feature.description_en}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(feature.feature_key)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={isEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
                {isLoading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                )}
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isEnabled
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {isEnabled
                  ? locale === 'zh'
                    ? '已啟用'
                    : 'Enabled'
                  : locale === 'zh'
                  ? '已停用'
                  : 'Disabled'}
              </span>
            </div>
          </div>
        );
      })}

      {features.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {locale === 'zh'
            ? '找不到功能設定。請確認資料庫已套用最新遷移。'
            : 'No feature settings found. Please ensure database migrations are applied.'}
        </div>
      )}
    </div>
  );
}
