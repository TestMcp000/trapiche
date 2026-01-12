/**
 * AI Analysis Usage IO Module
 *
 * Server-only module for tracking AI analysis usage and costs.
 * Implements monthly cost aggregation per PRD §4.4.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §4.4 - Monthly budget
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { AnalysisUsageMonthly } from '@/lib/types/ai-analysis';
import { COST_THRESHOLDS } from '@/lib/types/ai-analysis';

// =============================================================================
// Types
// =============================================================================

/**
 * Database row structure for ai_usage_monthly table.
 */
interface UsageRow {
  year_month: string;
  total_cost_usd: number;
  analysis_count: number;
  updated_at: string;
}

/**
 * Budget check result.
 */
export interface BudgetCheckResult {
  allowed: boolean;
  currentUsage: number;
  budgetLimit: number;
  percentUsed: number;
  warning?: 'near_limit' | 'at_limit';
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get current year-month string (e.g., "2025-01").
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function rowToUsage(row: UsageRow): AnalysisUsageMonthly {
  return {
    yearMonth: row.year_month,
    totalCostUsd: row.total_cost_usd,
    analysisCount: row.analysis_count,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Usage Operations
// =============================================================================

/**
 * Record usage after an analysis completes.
 * Uses atomic increment to avoid race conditions.
 *
 * @param yearMonth - Month to record (e.g., "2025-01")
 * @param cost - Cost in USD to add
 */
export async function recordUsage(
  yearMonth: string,
  cost: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Upsert with atomic increment
  const { error } = await supabase.rpc('increment_ai_usage', {
    p_year_month: yearMonth,
    p_cost: cost,
  });

  // If RPC doesn't exist, fall back to manual upsert
  if (error?.code === 'PGRST202') {
    // Function not found, use manual upsert
    const { data: existing } = await supabase
      .from('ai_usage_monthly')
      .select('*')
      .eq('year_month', yearMonth)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from('ai_usage_monthly')
        .update({
          total_cost_usd: (existing as UsageRow).total_cost_usd + cost,
          analysis_count: (existing as UsageRow).analysis_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('year_month', yearMonth);

      if (updateError) {
        console.error('Failed to update usage:', updateError);
        return { success: false, error: 'Failed to record usage' };
      }
    } else {
      const { error: insertError } = await supabase
        .from('ai_usage_monthly')
        .insert({
          year_month: yearMonth,
          total_cost_usd: cost,
          analysis_count: 1,
        });

      if (insertError) {
        console.error('Failed to insert usage:', insertError);
        return { success: false, error: 'Failed to record usage' };
      }
    }

    return { success: true };
  }

  if (error) {
    console.error('Failed to record usage:', error);
    return { success: false, error: 'Failed to record usage' };
  }

  return { success: true };
}

/**
 * Get usage for a specific month.
 *
 * @param yearMonth - Month to query (e.g., "2025-01")
 */
export async function getMonthlyUsage(
  yearMonth: string
): Promise<AnalysisUsageMonthly | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_usage_monthly')
    .select('*')
    .eq('year_month', yearMonth)
    .single();

  if (error || !data) {
    // No usage recorded yet for this month
    return null;
  }

  return rowToUsage(data as UsageRow);
}

/**
 * Get current month usage.
 */
export async function getCurrentMonthUsage(): Promise<AnalysisUsageMonthly | null> {
  return getMonthlyUsage(getCurrentYearMonth());
}

/**
 * Check if budget allows another analysis.
 *
 * @param yearMonth - Month to check
 * @param additionalCost - Optional estimated cost for the new analysis
 */
export async function checkBudget(
  yearMonth: string,
  additionalCost = 0
): Promise<BudgetCheckResult> {
  const usage = await getMonthlyUsage(yearMonth);
  const currentUsage = usage?.totalCostUsd ?? 0;
  const projectedUsage = currentUsage + additionalCost;
  const budgetLimit = COST_THRESHOLDS.MONTHLY_BUDGET_LIMIT;
  const warningThreshold = budgetLimit * COST_THRESHOLDS.BUDGET_WARNING_PERCENT;

  const percentUsed = (projectedUsage / budgetLimit) * 100;

  if (projectedUsage >= budgetLimit) {
    return {
      allowed: false,
      currentUsage,
      budgetLimit,
      percentUsed,
      warning: 'at_limit',
    };
  }

  if (projectedUsage >= warningThreshold) {
    return {
      allowed: true,
      currentUsage,
      budgetLimit,
      percentUsed,
      warning: 'near_limit',
    };
  }

  return {
    allowed: true,
    currentUsage,
    budgetLimit,
    percentUsed,
  };
}

/**
 * Get usage history for the last N months.
 *
 * @param months - Number of months to fetch
 */
export async function getUsageHistory(
  months = 12
): Promise<AnalysisUsageMonthly[]> {
  const supabase = createAdminClient();

  // Calculate start month
  const now = new Date();
  const startDate = new Date(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1);
  const startMonth = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('ai_usage_monthly')
    .select('*')
    .gte('year_month', startMonth)
    .order('year_month', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as UsageRow[]).map(rowToUsage);
}
