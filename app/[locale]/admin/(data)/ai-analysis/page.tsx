/**
 * AI Analysis Admin Page
 *
 * Server component for AI-powered analysis admin UI.
 * RBAC: Owner/Editor can access.
 * Supports ?memberShortId=C1 query param to pre-fill member filter.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

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
import { getMemberIdByShortId } from "@/lib/modules/ai-analysis/analysis-members-io";
import { listSchedules } from "@/lib/modules/ai-analysis/analysis-schedules-io";
import {
  getAdminLocale,
  getAdminMessages,
} from "@/lib/i18n/admin-locale.server";

import { AIAnalysisClient } from "./AIAnalysisClient";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ memberShortId?: string }>;
}

export default async function AIAnalysisPage({
  params,
  searchParams,
}: PageProps) {
  await params;
  const supabase = await createClient();
  const role = await getAdminRole(supabase);

  if (!role) {
    redirect("/");
  }

  // Get user ID for fetching reports
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Check if OpenRouter is configured
  const configured = isOpenRouterConfigured();

  // Resolve memberShortId to memberId if provided
  const resolvedParams = await searchParams;
  const memberShortId = resolvedParams.memberShortId;
  let memberId: string | null = null;
  if (memberShortId) {
    memberId = await getMemberIdByShortId(memberShortId);
  }

  // Fetch initial data
  const [
    reportsResult,
    usage,
    models,
    cronStatus,
    ragEnabled,
    schedulesResult,
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
  ]);

  const adminLocale = await getAdminLocale();
  const messages = await getAdminMessages(adminLocale);

  const initialData = {
    role,
    configured,
    recentReports: reportsResult.reports,
    totalReports: reportsResult.total,
    usage,
    models,
    cronStatus,
    ragEnabled,
    // Pre-fill member filter from URL
    memberShortId: memberShortId ?? null,
    memberId: memberId,
    // Initial schedules for owner (avoids client-side useEffect load)
    initialSchedules: schedulesResult.schedules,
  };

  return (
    <NextIntlClientProvider locale={adminLocale} messages={messages}>
      <AIAnalysisClient initialData={initialData} />
    </NextIntlClientProvider>
  );
}
