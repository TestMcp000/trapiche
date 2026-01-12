'use client';

import { useState, useCallback } from 'react';
import {
  mergeVariantMatrix,
  buildVariantMatrix,
  type OptionAxis,
  type VariantRow,
} from '@/lib/modules/shop/variants';
import type { ProductVariantRow } from '@/lib/types/shop';

interface VariantEditorProps {
  initialVariants: ProductVariantRow[];
  onChange: (variants: ProductVariantRow[]) => void;
  locale: string;
}

interface OptionConfig {
  name: string;
  values: string[];
}

export default function ProductVariantEditor({
  initialVariants,
  onChange,
  locale,
}: VariantEditorProps) {
  const [options, setOptions] = useState<OptionConfig[]>(() => {
    // Extract options from existing variants
    if (initialVariants.length > 0) {
      const firstVariant = initialVariants[0];
      const optionNames = Object.keys(firstVariant.option_values_json || {});
      return optionNames.map((name) => ({
        name,
        values: [...new Set(initialVariants.map((v) => v.option_values_json[name]).filter(Boolean))],
      }));
    }
    return [];
  });

  const [variants, setVariants] = useState<ProductVariantRow[]>(initialVariants);

  const handleAddOption = useCallback(() => {
    setOptions((prev) => [...prev, { name: '', values: [''] }]);
  }, []);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleOptionNameChange = useCallback((index: number, name: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, name } : opt)));
  }, []);

  const handleAddValue = useCallback((optionIndex: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optionIndex ? { ...opt, values: [...opt.values, ''] } : opt
      )
    );
  }, []);

  const handleRemoveValue = useCallback((optionIndex: number, valueIndex: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optionIndex
          ? { ...opt, values: opt.values.filter((_, vi) => vi !== valueIndex) }
          : opt
      )
    );
  }, []);

  const handleValueChange = useCallback((optionIndex: number, valueIndex: number, value: string) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optionIndex
          ? { ...opt, values: opt.values.map((v, vi) => (vi === valueIndex ? value : v)) }
          : opt
      )
    );
  }, []);

  const handleGenerateVariants = useCallback(() => {
    const validOptions = options.filter((opt) => opt.name.trim() && opt.values.some((v) => v.trim()));
    if (validOptions.length === 0) {
      setVariants([]);
      onChange([]);
      return;
    }

    // Build OptionAxis array for the variants module
    const axes: OptionAxis[] = validOptions.map((opt) => ({
      name: opt.name.trim(),
      values: opt.values.filter((v) => v.trim()).map((v) => v.trim()),
    }));

    // Build new variant matrix
    const newMatrix = buildVariantMatrix(axes, 0, 0);

    // Convert existing ProductVariantRow to VariantRow for merging
    const existingMatrix: VariantRow[] = variants.map((v) => ({
      variantKey: v.variant_key,
      optionValues: v.option_values_json,
      sku: v.sku || '',
      priceCents: v.price_cents,
      stock: v.stock,
      enabled: v.is_enabled,
    }));

    // Merge with existing matrix to preserve admin overrides
    const merged = mergeVariantMatrix(newMatrix, existingMatrix);

    // Convert back to ProductVariantRow
    const newVariants: ProductVariantRow[] = merged.map((m: VariantRow, i: number) => ({
      id: variants.find((v) => v.variant_key === m.variantKey)?.id || `temp-${i}`,
      product_id: variants[0]?.product_id || '',
      variant_key: m.variantKey,
      option_values_json: m.optionValues,
      sku: m.sku || null,
      price_cents: m.priceCents,
      compare_at_price_cents: null,
      stock: m.stock,
      is_enabled: m.enabled,
      created_at: variants.find((v) => v.variant_key === m.variantKey)?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setVariants(newVariants);
    onChange(newVariants);
  }, [options, variants, onChange]);

  const handleVariantChange = useCallback(
    (index: number, field: keyof ProductVariantRow, value: unknown) => {
      const updated = variants.map((v, i) =>
        i === index ? { ...v, [field]: value, updated_at: new Date().toISOString() } : v
      );
      setVariants(updated);
      onChange(updated);
    },
    [variants, onChange]
  );

  return (
    <div className="space-y-6">
      {/* Options Configuration */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {locale === 'zh' ? '規格選項' : 'Options'}
          </h3>
          <button
            type="button"
            onClick={handleAddOption}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + {locale === 'zh' ? '新增選項' : 'Add Option'}
          </button>
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {locale === 'zh' ? '點擊「新增選項」來建立變體規格（如：顏色、尺寸）' : 'Click "Add Option" to create variant options (e.g., Color, Size)'}
          </p>
        ) : (
          <div className="space-y-4">
            {options.map((option, optIndex) => (
              <div key={optIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={option.name}
                    onChange={(e) => handleOptionNameChange(optIndex, e.target.value)}
                    placeholder={locale === 'zh' ? '選項名稱（如：顏色）' : 'Option name (e.g., Color)'}
                    className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(optIndex)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    {locale === 'zh' ? '刪除' : 'Remove'}
                  </button>
                </div>
                <div className="space-y-2">
                  {option.values.map((value, valIndex) => (
                    <div key={valIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleValueChange(optIndex, valIndex, e.target.value)}
                        placeholder={locale === 'zh' ? '選項值' : 'Option value'}
                        className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                      />
                      {option.values.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveValue(optIndex, valIndex)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddValue(optIndex)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + {locale === 'zh' ? '新增值' : 'Add Value'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {options.length > 0 && (
          <button
            type="button"
            onClick={handleGenerateVariants}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            {locale === 'zh' ? '生成變體組合' : 'Generate Variants'}
          </button>
        )}
      </div>

      {/* Variants Table */}
      {variants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {locale === 'zh' ? `變體列表 (${variants.length})` : `Variants (${variants.length})`}
          </h3>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                    {locale === 'zh' ? '規格' : 'Options'}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                    SKU
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                    {locale === 'zh' ? '價格 (NT$)' : 'Price (NT$)'}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                    {locale === 'zh' ? '庫存' : 'Stock'}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                    {locale === 'zh' ? '啟用' : 'Enabled'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {variants.map((variant, index) => (
                  <tr key={variant.variant_key} className={!variant.is_enabled ? 'opacity-50' : ''}>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">
                      {Object.entries(variant.option_values_json).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={variant.sku || ''}
                        onChange={(e) => handleVariantChange(index, 'sku', e.target.value || null)}
                        className="w-24 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={variant.price_cents / 100}
                        onChange={(e) => handleVariantChange(index, 'price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                        className="w-24 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        step="1"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value || '0', 10))}
                        className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={variant.is_enabled}
                        onChange={(e) => handleVariantChange(index, 'is_enabled', e.target.checked)}
                        className="rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
