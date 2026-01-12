import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin, getAdminRole } from '@/lib/modules/auth';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import CopyButton from '@/components/admin/shop/CopyButton';
import { SITE_URL } from '@/lib/seo/hreflang';
import { getAllPaymentProviderConfigsAdmin } from '@/lib/modules/shop/admin-io';

// Gateway info
const GATEWAYS = [
  {
    id: 'stripe',
    name: 'Stripe',
    color: '#635BFF',
    logo: '💳',
    fields: [
      { key: 'stripe_publishable_key', label: 'Publishable Key', placeholder: 'pk_test_...' },
      { key: 'stripe_secret_key', label: 'Secret Key', placeholder: 'sk_test_...', secret: true },
      { key: 'stripe_webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
    ],
    webhookPath: '/api/webhooks/stripe',
  },
  {
    id: 'linepay',
    name: 'LinePay',
    color: '#00C300',
    logo: '🟢',
    fields: [
      { key: 'linepay_channel_id', label: 'Channel ID', placeholder: '' },
      { key: 'linepay_channel_secret', label: 'Channel Secret', placeholder: '', secret: true },
    ],
    webhookPath: '/api/webhooks/linepay',
  },
  {
    id: 'ecpay',
    name: 'ECPay (綠界)',
    color: '#1E88E5',
    logo: '🏦',
    fields: [
      { key: 'ecpay_merchant_id', label: 'Merchant ID', placeholder: '' },
      { key: 'ecpay_hash_key', label: 'Hash Key', placeholder: '', secret: true },
      { key: 'ecpay_hash_iv', label: 'Hash IV', placeholder: '', secret: true },
    ],
    webhookPath: '/api/webhooks/ecpay',
  },
];

function maskSecret(value: string | null): string {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin' });
  const supabase = await createClient();

  // Check if user is Owner
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    redirect(`/${locale}/admin`);
  }

  const role = await getAdminRole(supabase);
  if (role !== 'owner') {
    // Editor cannot access payment config
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('shop.payments.accessDenied')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('shop.payments.ownerOnly')}
          </p>
        </div>
      </div>
    );
  }

  // Fetch payment configs from lib
  const configs = await getAllPaymentProviderConfigsAdmin();

  const configMap = new Map(configs.map((c) => [c.gateway, c]));
  const baseUrl = SITE_URL;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('shop.payments.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('shop.payments.subtitle')}
        </p>
      </div>

      <div className="grid gap-6">
        {GATEWAYS.map((gateway) => {
          const config = configMap.get(gateway.id);
          const isEnabled = config?.is_enabled ?? false;
          const isTestMode = config?.is_test_mode ?? true;
          const status = config?.validation_status ?? 'pending';

          return (
            <div
              key={gateway.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden ${
                isEnabled ? 'border-green-200 dark:border-green-800' : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              {/* Gateway Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: gateway.color + '20' }}
                  >
                    {gateway.logo}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {gateway.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        status === 'valid'
                          ? 'bg-green-100 text-green-700'
                          : status === 'invalid'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {t(`shop.payments.status.${status}` as Parameters<typeof t>[0])}
                      </span>
                      {isTestMode && (
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                          {t('shop.payments.testMode')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={isEnabled}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* Gateway Config */}
              <div className="p-6 space-y-4">
                {/* Environment Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('shop.payments.environment')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1 rounded text-sm ${
                        isTestMode
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Test
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm ${
                        !isTestMode
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Live
                    </button>
                  </div>
                </div>

                {/* Fields */}
                {gateway.fields.map((field) => {
                  const rawValue = config?.[field.key as keyof typeof config] as string | null;
                  const displayValue = field.secret ? maskSecret(rawValue) : (rawValue || '');

                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.secret ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        defaultValue={displayValue}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  );
                })}

                {/* Webhook URL */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook URL
                  </label>
                    <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${baseUrl}${gateway.webhookPath}`}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    />
                    <CopyButton
                      text={`${baseUrl}${gateway.webhookPath}`}
                      label={t('shop.payments.copy')}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('shop.payments.webhookHint', { gateway: gateway.name })}
                  </p>
                </div>

                {/* Validate & Save */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('shop.payments.validate')}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('shop.payments.save')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
