/**
 * Admin Theme Layouts Page
 *
 * Allows owners to customize per-layout tokens (Theme v2).
 * Each layout type (ThemeKey) can have independent token overrides.
 *
 * @route /admin/theme/layouts
 */

import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner, isSiteAdmin } from '@/lib/modules/auth';
import { getSiteConfigAdmin } from '@/lib/modules/theme/admin-io';
import LayoutsClient from '../LayoutsClient';


export default async function ThemeLayoutsPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const t = await getTranslations('admin');

  // Get role - Owner can edit, Editor can view
  const ownerCheck = await isOwner(supabase);
  const hasAccess = await isSiteAdmin(supabase);
  const canEdit = ownerCheck;

  if (!hasAccess) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">
          {t('theme.accessDenied')}
        </h1>
      </div>
    );
  }

  // Get current config
  const config = await getSiteConfigAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('theme.layouts.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('theme.layouts.description')}
          </p>
        </div>
        {!canEdit && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {t('theme.readOnly')}
          </span>
        )}
      </div>

      <LayoutsClient config={config} canEdit={canEdit} />
    </div>
  );
}
