import { getAllFeatureSettingsAdmin } from '@/lib/features/admin-io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import FeaturesClient from './FeaturesClient';

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const ownerCheck = await isOwner(supabase);
  const features = await getAllFeatureSettingsAdmin();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {locale === 'zh' ? '網站功能' : 'Site Features'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {locale === 'zh'
            ? '啟用或停用網站功能模組。只有 Owner 可以變更這些設定。'
            : 'Enable or disable site feature modules. Only Owner can change these settings.'}
        </p>
      </div>

      {!ownerCheck ? (
        <div className="p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                {locale === 'zh' ? '僅限 Owner' : 'Owner Only'}
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                {locale === 'zh'
                  ? '只有 Owner 角色可以管理功能開關。請聯繫網站 Owner 以變更這些設定。'
                  : 'Only users with Owner role can manage feature settings. Please contact the site owner to change these settings.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <FeaturesClient features={features} locale={locale} />
      )}
    </div>
  );
}
