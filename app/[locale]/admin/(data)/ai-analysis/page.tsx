/**
 * AI Analysis Admin Page
 *
 * Server component for AI-powered analysis admin UI.
 * RBAC: Owner/Editor can access.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from 'next-intl/server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getAdminRole } from "@/lib/modules/auth";
import {
  listReports,
  getCurrentMonthUsage,
  isOpenRouterConfigured,
  fetchAvailableModels,
  getCronStatus,
  isRagModeAvailable,
} from "@/lib/modules/ai-analysis/io";
import { listSchedules } from "@/lib/modules/ai-analysis/analysis-schedules-io";
import { listTemplates } from "@/lib/modules/ai-analysis/analysis-templates-io";

import { AIAnalysisClient } from "./AIAnalysisClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AIAnalysisPage({
  params,
}: PageProps) {
  const { locale: routeLocale } = await params;
  const supabase = await createClient();
  const role = await getAdminRole(supabase);

  if (!role) {
    redirect(`/${routeLocale}`);
  }

  // Get user ID for fetching reports
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${routeLocale}`);
  }

  // Check if OpenRouter is configured
  const configured = isOpenRouterConfigured();

  // Fetch initial data
  const [
    reportsResult,
    usage,
    models,
    cronStatus,
    ragEnabled,
    schedulesResult,
    customTemplates,
  ] = await Promise.all([
    listReports(user.id, 10, 0),
    getCurrentMonthUsage(),
    configured ? fetchAvailableModels() : Promise.resolve([]),
    getCronStatus(),
    isRagModeAvailable(),
    // Fetch schedules for owners (editors don't see schedules)
    configured && role === "owner"
      ? listSchedules(20, 0)
      : Promise.resolve({ schedules: [], total: 0 }),
    // Fetch custom templates for template selection
    configured ? listTemplates(role) : Promise.resolve([]),
  ]);

  const messages = await getMessages({ locale: routeLocale });

  const initialData = {
    role,
    configured,
    recentReports: reportsResult.reports,
    totalReports: reportsResult.total,
    usage,
    models,
    cronStatus,
    ragEnabled,
    // Initial schedules for owner (avoids client-side useEffect load)
    initialSchedules: schedulesResult.schedules,
    // Custom templates for template selection
    customTemplates,
  };

  return (
    <NextIntlClientProvider locale={routeLocale} messages={messages}>
      <AIAnalysisClient initialData={initialData} />
    </NextIntlClientProvider>
  );
}
