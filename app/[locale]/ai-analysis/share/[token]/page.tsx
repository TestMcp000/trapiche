/**
 * Public AI Analysis Share Page
 *
 * Public page for viewing shared AI analysis reports.
 * No authentication required — access controlled by token.
 *
 * Security:
 * - noindex to prevent SEO crawling
 * - force-dynamic to prevent stale cache
 * - whitelist-only fields returned by RPC
 *
 * @see doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md PR-4 - AI Analysis Share Links
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchSharedReport } from '@/lib/modules/ai-analysis/report-shares-io';
import { markdownToHtml } from '@/lib/markdown/server';
import { SHARE_TOKEN_REGEX } from '@/lib/types/ai-analysis';

// Force dynamic rendering to prevent stale cache after revocation
export const dynamic = 'force-dynamic';

// Generate noindex metadata to prevent SEO crawling
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Analysis Report',
    robots: {
      index: false,
      follow: false,
    },
  };
}

interface PageProps {
  params: Promise<{
    locale: string;
    token: string;
  }>;
}

export default async function SharedReportPage({ params }: PageProps) {
  const { token, locale } = await params;

  // Validate token format (64-char hex)
  if (!SHARE_TOKEN_REGEX.test(token)) {
    notFound();
  }

  // Fetch shared report via RPC
  const report = await fetchSharedReport(token);

  // Not found, expired, or revoked
  if (!report) {
    notFound();
  }

  // Convert markdown to HTML
  const resultHtml = report.result
    ? await markdownToHtml(report.result)
    : null;

  // Format dates for display
  const createdDate = new Date(report.createdAt).toLocaleDateString(
    locale === 'zh' ? 'zh-TW' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  const completedDate = report.completedAt
    ? new Date(report.completedAt).toLocaleDateString(
        locale === 'zh' ? 'zh-TW' : 'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      )
    : null;

  // Template display names
  const templateNames: Record<string, { en: string; zh: string }> = {
    user_behavior: { en: 'User Behavior Analysis', zh: '用戶行為分析' },
    sales: { en: 'Sales Analysis', zh: '銷售分析' },
    rfm: { en: 'RFM Segmentation', zh: '會員分群 RFM' },
    content_recommendation: { en: 'Content Recommendation', zh: '內容推薦' },
    custom: { en: 'Custom Analysis', zh: '自訂分析' },
  };

  const templateName =
    templateNames[report.templateId]?.[locale === 'zh' ? 'zh' : 'en'] ??
    report.templateId;

  // Status labels
  const statusLabels: Record<string, { en: string; zh: string }> = {
    pending: { en: 'Pending', zh: '等待中' },
    running: { en: 'Processing', zh: '處理中' },
    completed: { en: 'Completed', zh: '已完成' },
    incomplete: { en: 'Incomplete', zh: '不完整' },
    failed: { en: 'Failed', zh: '失敗' },
  };

  const statusLabel =
    statusLabels[report.status]?.[locale === 'zh' ? 'zh' : 'en'] ??
    report.status;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      {/* Header */}
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface-bg)]">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-2xl font-bold">{templateName}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
            <span>
              {locale === 'zh' ? '建立時間' : 'Created'}: {createdDate}
            </span>
            {completedDate && (
              <span>
                {locale === 'zh' ? '完成時間' : 'Completed'}: {completedDate}
              </span>
            )}
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                report.status === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : report.status === 'failed'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {report.status === 'completed' && resultHtml ? (
          <article
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: resultHtml }}
          />
        ) : report.status === 'pending' || report.status === 'running' ? (
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] p-8 text-center">
            <div className="mb-4 text-4xl">⏳</div>
            <p className="text-lg">
              {locale === 'zh'
                ? '報告正在處理中，請稍後再試。'
                : 'Report is being processed. Please check back later.'}
            </p>
          </div>
        ) : report.status === 'failed' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/30 dark:bg-red-900/10">
            <div className="mb-4 text-4xl">❌</div>
            <p className="text-lg text-red-800 dark:text-red-400">
              {locale === 'zh'
                ? '報告產生失敗。'
                : 'Report generation failed.'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] p-8 text-center">
            <p className="text-lg text-[var(--text-muted)]">
              {locale === 'zh' ? '報告內容不可用。' : 'Report content unavailable.'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--surface-border)] bg-[var(--surface-bg)] py-4 text-center text-sm text-[var(--text-muted)]">
        {locale === 'zh'
          ? '此為 AI 分析報告的分享連結。'
          : 'This is a shared AI analysis report.'}
      </footer>
    </div>
  );
}
