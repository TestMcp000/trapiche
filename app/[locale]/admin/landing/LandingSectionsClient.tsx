'use client';

/**
 * Landing Sections Management Client Component
 *
 * Provides UI for managing landing sections:
 * - Toggle visibility (hero/contact always visible)
 * - Add custom sections
 * - Edit links (navigates to section editor)
 * - Delete custom sections
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LandingSection } from '@/lib/types/landing';
import { PRESET_SECTION_KEYS } from '@/lib/modules/landing/constants';
import {
  toggleSectionVisibility,
  createCustomSection,
  deleteSectionAction,
} from './actions';

interface Props {
  initialSections: LandingSection[];
  locale: string;
}

// Section keys that cannot be hidden
const ALWAYS_VISIBLE = ['hero', 'contact'];

// Section labels for display
const SECTION_LABELS: Record<string, { en: string; zh: string }> = {
  hero: { en: 'Hero', zh: '首頁橫幅' },
  about: { en: 'About', zh: '關於我們' },
  services: { en: 'Services', zh: '服務' },
  platforms: { en: 'Platforms', zh: '平台' },
  product_design: { en: 'Product Design', zh: '產品設計' },
  portfolio: { en: 'Portfolio', zh: '作品集' },
  contact: { en: 'Contact', zh: '聯繫' },
};

// Type-safe preset key lookup
const PRESET_KEYS_SET = new Set(PRESET_SECTION_KEYS);

export default function LandingSectionsClient({ initialSections, locale }: Props) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const _isPreset = (key: string) => PRESET_KEYS_SET.has(key as typeof PRESET_SECTION_KEYS[number]);
  const isCustom = (key: string) => key.startsWith('custom_');
  const canToggleVisibility = (key: string) => !ALWAYS_VISIBLE.includes(key);
  
  const customSectionCount = sections.filter(s => isCustom(s.section_key)).length;
  const canAddCustom = customSectionCount < 10;

  const getSectionLabel = (section: LandingSection): string => {
    if (isCustom(section.section_key)) {
      return locale === 'zh' 
        ? (section.title_zh || section.section_key)
        : (section.title_en || section.section_key);
    }
    const labels = SECTION_LABELS[section.section_key];
    return labels ? (locale === 'zh' ? labels.zh : labels.en) : section.section_key;
  };

  const handleToggleVisibility = async (sectionKey: string, currentVisible: boolean) => {
    if (!canToggleVisibility(sectionKey)) return;
    
    setError(null);
    startTransition(async () => {
      const result = await toggleSectionVisibility(sectionKey, !currentVisible);
      if (result.success) {
        setSections(prev => 
          prev.map(s => s.section_key === sectionKey ? { ...s, is_visible: !currentVisible } : s)
        );
        router.refresh();
      } else {
        setError(result.error || 'Failed to toggle visibility');
      }
    });
  };

  const handleAddCustomSection = async () => {
    if (!canAddCustom) return;
    
    setError(null);
    startTransition(async () => {
      const result = await createCustomSection({ section_type: 'text' });
      if (result.success && result.sectionKey) {
        router.refresh();
        router.push(`/${locale}/admin/landing/${result.sectionKey}`);
      } else {
        setError(result.error || 'Failed to create section');
      }
    });
  };

  const handleDeleteSection = async (sectionKey: string) => {
    if (!isCustom(sectionKey)) return;
    if (!confirm(locale === 'zh' ? '確定要刪除此區塊？' : 'Delete this section?')) return;
    
    setError(null);
    startTransition(async () => {
      const result = await deleteSectionAction(sectionKey);
      if (result.success) {
        setSections(prev => prev.filter(s => s.section_key !== sectionKey));
        router.refresh();
      } else {
        setError(result.error || 'Failed to delete section');
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {locale === 'zh' ? '首頁區塊管理' : 'Landing Sections'}
        </h1>
        
        {canAddCustom && (
          <button
            onClick={handleAddCustomSection}
            disabled={isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {locale === 'zh' ? '+ 新增自訂區塊' : '+ Add Custom Section'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-surface rounded-xl shadow-sm border border-border-light overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-secondary">
                {locale === 'zh' ? '順序' : 'Order'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-secondary">
                {locale === 'zh' ? '區塊' : 'Section'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-secondary">
                {locale === 'zh' ? '類型' : 'Type'}
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-secondary">
                {locale === 'zh' ? '顯示' : 'Visible'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-secondary">
                {locale === 'zh' ? '操作' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {sections.map((section) => (
              <tr key={section.id} className="hover:bg-surface-secondary/50">
                <td className="px-4 py-3 text-sm text-secondary">
                  {section.sort_order}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {getSectionLabel(section)}
                  </span>
                  <span className="ml-2 text-xs text-secondary">
                    ({section.section_key})
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-secondary">
                  <span className="px-2 py-1 bg-surface-secondary rounded text-xs">
                    {section.section_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleVisibility(section.section_key, section.is_visible)}
                    disabled={isPending || !canToggleVisibility(section.section_key)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      section.is_visible ? 'bg-green-500' : 'bg-gray-300'
                    } ${!canToggleVisibility(section.section_key) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!canToggleVisibility(section.section_key) 
                      ? (locale === 'zh' ? '此區塊無法隱藏' : 'This section cannot be hidden')
                      : undefined}
                  >
                    <span 
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        section.is_visible ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/${locale}/admin/landing/${section.section_key}`}
                      className="px-3 py-1 text-sm text-primary hover:underline"
                    >
                      {locale === 'zh' ? '編輯' : 'Edit'}
                    </Link>
                    {isCustom(section.section_key) && (
                      <button
                        onClick={() => handleDeleteSection(section.section_key)}
                        disabled={isPending}
                        className="px-3 py-1 text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        {locale === 'zh' ? '刪除' : 'Delete'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-secondary">
        {locale === 'zh' 
          ? `自訂區塊: ${customSectionCount}/10`
          : `Custom sections: ${customSectionCount}/10`}
      </p>
    </div>
  );
}
