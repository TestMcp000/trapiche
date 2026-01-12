/**
 * Import/Export Admin Page
 * @see doc/specs/completed/IMPORT_EXPORT.md
 * @see uiux_refactor.md §6.1
 *
 * Server component for bulk data import/export admin UI.
 * Provides Export (Blog/Gallery/Shop/Content/Comments) and Import (Blog ZIP/Gallery/Shop/Content JSON).
 */
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getAdminRole } from "@/lib/modules/auth";
import {
  getAdminLocale,
  getAdminMessages,
} from "@/lib/i18n/admin-locale.server";

import { ImportExportClient } from "./ImportExportClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ImportExportPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const role = await getAdminRole(supabase);

  if (!role) {
    redirect("/");
  }

  const adminLocale = await getAdminLocale();
  const messages = await getAdminMessages(adminLocale);

  return (
    <NextIntlClientProvider locale={adminLocale} messages={messages}>
      <ImportExportClient role={role} />
    </NextIntlClientProvider>
  );
}
