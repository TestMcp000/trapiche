import { getAllSiteContent } from '@/lib/modules/content/io';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import SectionToggle from './components/SectionToggle';

export default async function ContentManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;
  
  // Get admin UI locale
  const adminLocale = await getAdminLocale();
  
  // Get translations for admin content namespace
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin.content' });
  
  const contents = await getAllSiteContent();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Content List */}
      {contents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t('noContent')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('section')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('visibility')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('lastUpdated')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {contents.map((content) => {
                // Get section label from translations
                const sectionKey = content.section_key as 'hero' | 'about' | 'platforms' | 'contact' | 'footer' | 'metadata' | 'nav' | 'company' | 'gallery';
                const sectionLabel = t.has(`sections.${sectionKey}`) 
                  ? t(`sections.${sectionKey}`)
                  : content.section_key;
                
                return (
                  <tr key={content.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {sectionLabel}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {content.section_key}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <SectionToggle 
                          sectionKey={content.section_key}
                          isPublished={content.is_published}
                          routeLocale={routeLocale}
                          labels={{ published: t('published'), draft: t('draft') }}
                        />
                        <span className={`text-xs ${
                          content.is_published 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {content.is_published ? t('published') : t('draft')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(content.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/${routeLocale}/admin/content/${content.section_key}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {t('edit')}
                        </Link>
                        <Link
                          href={`/${routeLocale}/admin/history?type=site_content&id=${content.id}`}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          {t('history')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

