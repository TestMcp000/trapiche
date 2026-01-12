/**
 * Shop Checkout Page
 *
 * Checkout page requiring user authentication.
 * Uses CheckoutForm component for form functionality.
 */

import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { isShopEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo/hreflang';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { getShopSettingsCached } from '@/lib/modules/shop/cached';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { createDefaultInvoiceConfig } from '@/lib/modules/shop/invoice-schema';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const title = locale === 'zh' ? '結帳' : 'Checkout';
  const description =
    locale === 'zh' ? '完成您的訂單' : 'Complete your order';

  return {
    title,
    description,
    alternates: getMetadataAlternates('/shop/checkout', locale),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { locale } = await params;

  // Check if shop is enabled
  const isEnabled = await isShopEnabledCached();
  if (!isEnabled) {
    notFound();
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    const loginUrl = `/${locale}/login?redirect=/${locale}/shop/checkout`;
    redirect(loginUrl);
  }

  // Get shop settings
  const settings = await getShopSettingsCached();
  const invoiceConfig = settings
    ? {
        mode: settings.invoice_config_mode,
        toggles: settings.invoice_toggles_json ?? undefined,
        jsonSchema: settings.invoice_json_schema ?? undefined,
      }
    : createDefaultInvoiceConfig();
  const reservedTtlMinutes = settings?.reserved_ttl_minutes ?? 15;

  const title = locale === 'zh' ? '結帳' : 'Checkout';

  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          {title}
        </h1>

        <CheckoutForm
          locale={locale}
          invoiceConfig={invoiceConfig}
          reservedTtlMinutes={reservedTtlMinutes}
        />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
