import { getTranslations } from 'next-intl/server';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getShopSettingsAdmin } from '@/lib/modules/shop/admin-io';
import SettingsForm from './SettingsForm';

export default async function ShopSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin' });
  const settings = await getShopSettingsAdmin();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('shop.settings.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('shop.settings.subtitle')}
        </p>
      </div>

      <SettingsForm routeLocale={locale} initialSettings={settings} />
    </div>
  );
}
