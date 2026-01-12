/**
 * Preprocessing Admin Page
 *
 * Server component for preprocessing monitoring UI (Owner-only).
 * Displays queue stats, throughput, quality metrics, error logs, and controls.
 *
 * @see doc/specs/completed/DATA_PREPROCESSING.md
 * @see uiux_refactor.md §6.4.2 item 4
 */
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from "@/lib/modules/auth";
import {
  getPreprocessingMonitoringStats,
  getQualityMetrics,
  getAllConfigs,
} from "@/lib/modules/preprocessing/io";
import {
  getAdminLocale,
  getAdminMessages,
} from "@/lib/i18n/admin-locale.server";

import { PreprocessingClient } from "./PreprocessingClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PreprocessingPage({ params }: Props) {
  await params;
  const supabase = await createClient();

  // Owner-only gate
  const owner = await isOwner(supabase);
  if (!owner) {
    redirect("/");
  }

  // Fetch initial data
  const [monitoringStats, qualityMetrics, configs] = await Promise.all([
    getPreprocessingMonitoringStats(10),
    getQualityMetrics(),
    getAllConfigs(),
  ]);

  const adminLocale = await getAdminLocale();
  const messages = await getAdminMessages(adminLocale);

  const initialData = {
    queue: monitoringStats.queue,
    throughput: monitoringStats.throughput,
    errorLogs: monitoringStats.errorLogs,
    qualityMetrics,
    configs,
  };

  return (
    <NextIntlClientProvider locale={adminLocale} messages={messages}>
      <PreprocessingClient initialData={initialData} />
    </NextIntlClientProvider>
  );
}
