import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import { getSiteConfigAdmin } from '@/lib/modules/theme/admin-io';
import PageThemesClient from '../PageThemesClient';


export default async function PageThemesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const ownerCheck = await isOwner(supabase);
  const config = await getSiteConfigAdmin();
  const t = await getTranslations('admin');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('theme.pages.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('theme.pages.description')}
        </p>
      </div>


      {/* Owner-only warning for non-owners (UI is still visible but read-only) */}
      {!ownerCheck && (
        <div className="p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                {t('theme.ownerOnly')}
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                {t('theme.ownerOnlyDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      <PageThemesClient config={config} canEdit={ownerCheck} />
    </div>
  );
}
