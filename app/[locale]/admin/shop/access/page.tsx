import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from "@/lib/modules/auth";
import {
  getAdminLocale,
  getAdminMessages,
} from "@/lib/i18n/admin-locale.server";
import { getShopAdmins } from "./actions";
import AccessClient from "./AccessClient";

export default async function AccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const adminLocale = await getAdminLocale();
  const messages = await getAdminMessages(adminLocale);
  const supabase = await createClient();

  // Check if current user is owner
  const isOwnerUser = await isOwner(supabase);
  if (!isOwnerUser) {
    // Redirect to dashboard with insufficient permissions
    redirect(`/${locale}/admin/shop`);
  }

  // Get current user email
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserEmail = user?.email || "";

  // Get all admins
  const admins = await getShopAdmins();

  return (
    <NextIntlClientProvider locale={adminLocale} messages={messages}>
      <AccessClient
        admins={admins}
        currentUserEmail={currentUserEmail}
        routeLocale={locale}
      />
    </NextIntlClientProvider>
  );
}
