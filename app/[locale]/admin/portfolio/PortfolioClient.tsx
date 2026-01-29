'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { PortfolioItem } from '@/lib/types/content';
import { getErrorLabel } from '@/lib/types/action-result';
import { 
  savePortfolioAction, 
  deletePortfolioAction, 
  toggleVisibilityAction 
} from './actions';

interface PortfolioClientProps {
  initialItems: PortfolioItem[];
  locale: string;
}

export default function PortfolioClient({ initialItems, locale }: PortfolioClientProps) {
  const router = useRouter();
  const t = useTranslations('admin.portfolio');
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (item: Partial<PortfolioItem>) => {
    setSaving(true);
    setMessage(null);

    const titleZh = (item.title_zh || '').trim();
    const descriptionZh = item.description_zh ?? undefined;
    
    const result = await savePortfolioAction(
      editingItem?.id || null,
      {
        ...item,
        // Single-language site: mirror zh to legacy en columns
        title_en: titleZh,
        title_zh: titleZh,
        // Convert null to undefined for optional fields
        description_en: descriptionZh,
        description_zh: descriptionZh,
        url: item.url ?? undefined,
        badge_color: item.badge_color ?? undefined,
      },
      locale
    );
    
    setSaving(false);
    
    if (result.success) {
      setMessage({ type: 'success', text: t('saved') });
      setShowForm(false);
      setEditingItem(null);
      router.refresh();
    } else {
      setMessage({ type: 'error', text: getErrorLabel(result.errorCode, locale) });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }
    
    const result = await deletePortfolioAction(id, locale);
    
    if (result.success) {
      setMessage({ type: 'success', text: t('deleted') });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: getErrorLabel(result.errorCode, locale) });
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    const result = await toggleVisibilityAction(id, visible, locale);
    if (result.success) {
      setMessage({ type: 'success', text: t('updated') });
    } else {
      setMessage({ type: 'error', text: getErrorLabel(result.errorCode, locale) });
    }
    router.refresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addItem')}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Items List */}
      {initialItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t('noItems')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-xl p-6 border ${
                item.is_visible 
                  ? 'border-gray-200 dark:border-gray-700' 
                  : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.title_zh || item.title_en}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'live' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status === 'live' ? t('form.live') : t('form.development')}
                    </span>
                    {!item.is_visible && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {t('hidden')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {item.description_zh || item.description_en}
                  </p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                    >
                      {item.url}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleVisibility(item.id, !item.is_visible)}
                    className={`px-3 py-1 text-xs rounded ${
                      item.is_visible
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                  >
                    {item.is_visible ? t('hidden') : t('visible')}
                  </button>
                  <button
                    onClick={() => { setEditingItem(item); setShowForm(true); }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => router.push(`/${locale}/admin/history?type=portfolio&id=${item.id}`)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    {t('history')}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingItem ? t('edit') : t('addItem')}
            </h2>
            <PortfolioForm
              item={editingItem}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingItem(null); }}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioForm({
  item,
  onSave,
  onCancel,
  saving,
}: {
  item: PortfolioItem | null;
  onSave: (item: Partial<PortfolioItem>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const t = useTranslations('admin.portfolio');
  const [formData, setFormData] = useState({
    title_zh: item?.title_zh || item?.title_en || '',
    description_zh: item?.description_zh || item?.description_en || '',
    url: item?.url || '',
    status: item?.status || 'development',
    badge_color: item?.badge_color || 'blue',
    is_featured: item?.is_featured || false,
    is_visible: item?.is_visible ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('form.titleZh')}
        </label>
        <input
          type="text"
          value={formData.title_zh}
          onChange={(e) => setFormData({ ...formData, title_zh: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('form.descZh')}
        </label>
        <textarea
          value={formData.description_zh}
          onChange={(e) => setFormData({ ...formData, description_zh: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('form.url')}
        </label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('form.status')}
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'live' | 'development' | 'archived' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          >
            <option value="live">{t('form.live')}</option>
            <option value="development">{t('form.development')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('form.badgeColor')}
          </label>
          <select
            value={formData.badge_color}
            onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          >
            <option value="blue">藍色</option>
            <option value="green">綠色</option>
            <option value="purple">紫色</option>
            <option value="orange">橘色</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '...' : t('save')}
        </button>
      </div>
    </form>
  );
}
