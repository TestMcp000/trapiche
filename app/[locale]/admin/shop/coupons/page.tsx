import { NextIntlClientProvider } from "next-intl";
import {
  getAdminLocale,
  getAdminMessages,
} from "@/lib/i18n/admin-locale.server";
import { getAllCoupons } from "@/lib/modules/shop/admin-io";
import CouponsClient from "./CouponsClient";

export default async function CouponsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const adminLocale = await getAdminLocale();
  const messages = await getAdminMessages(adminLocale);
  const coupons = await getAllCoupons();

  return (
    <NextIntlClientProvider locale={adminLocale} messages={messages}>
      <CouponsClient coupons={coupons} routeLocale={locale} />
    </NextIntlClientProvider>
  );
}
