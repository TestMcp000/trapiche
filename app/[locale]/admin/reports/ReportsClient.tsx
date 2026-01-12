'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { Report } from '@/lib/modules/reports/admin-io';
import type { Locale } from '@/lib/i18n/locales';

interface Props {
  initialReports: Report[];
  routeLocale: string;
  adminLocale: Locale;
  adminMessages: Record<string, unknown>;
}

function ReportsClientInner({ initialReports, routeLocale }: { initialReports: Report[]; routeLocale: string }) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations('admin.system.reports');

  const copyToClipboard = async (text: string, reportId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(reportId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const fetchReports = useCallback(async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push(`/${routeLocale}/admin/login`);
          return;
        }
        throw new Error('Failed to fetch reports');
      }
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [routeLocale, router]);

  useEffect(() => {
    // Poll for updates every 5 seconds if there are running reports
    const interval = setInterval(() => {
      if (reports.some(r => r.status === 'queued' || r.status === 'running')) {
        fetchReports();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchReports, reports]);

  const runReport = async (type: 'lighthouse' | 'schema' | 'links') => {
    setRunning(type);
    setError(null);

    try {
      const response = await fetch('/api/reports/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start report');
      }

      // Refresh list
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setRunning(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || ''}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      lighthouse: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      schema: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      links: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type] || ''}`}>
        {type}
      </span>
    );
  };

  const getSummaryPreview = (report: Report) => {
    if (!report.summary) return '-';
    
    if (report.type === 'links') {
      const s = report.summary as { brokenCount?: number; totalChecked?: number };
      return s.brokenCount !== undefined 
        ? `${s.brokenCount}/${s.totalChecked} broken`
        : '-';
    }
    
    if (report.type === 'schema') {
      const s = report.summary as { allValid?: boolean; errors?: string[] };
      return s.allValid ? '✓ Valid' : `${s.errors?.length || 0} errors`;
    }
    
    if (report.type === 'lighthouse') {
      const s = report.summary as { note?: string };
      return s.note ? 'See details' : '-';
    }
    
    return '-';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {t('title')}
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => runReport('lighthouse')}
            disabled={running !== null}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running === 'lighthouse' ? t('running') : t('runLighthouse')}
          </button>
          <button
            onClick={() => runReport('schema')}
            disabled={running !== null}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running === 'schema' ? t('running') : t('runSchema')}
          </button>
          <button
            onClick={() => runReport('links')}
            disabled={running !== null}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running === 'links' ? t('running') : t('runLinks')}
          </button>
        </div>

        {/* Reports Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('summary')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('createdAt')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('noReports')}
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <React.Fragment key={report.id}>
                    <tr 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(report.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {getSummaryPreview(report)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(report.created_at).toLocaleString()}
                      </td>
                    </tr>
                    {expandedId === report.id && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="text-sm">
                            {report.error && (
                              <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                <strong className="text-red-600 dark:text-red-400">Error:</strong>{' '}
                                <span className="text-red-700 dark:text-red-300">{report.error}</span>
                              </div>
                            )}
                            {report.summary && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(JSON.stringify(report.summary, null, 2), report.id);
                                  }}
                                  className="absolute top-2 right-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  {copiedId === report.id ? t('copied') : t('copy')}
                                </button>
                                <pre className="p-2 pt-10 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-64 text-xs">
                                  {JSON.stringify(report.summary, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReportsClient({ initialReports, routeLocale, adminLocale, adminMessages }: Props) {
  return (
    <NextIntlClientProvider locale={adminLocale} messages={adminMessages}>
      <ReportsClientInner initialReports={initialReports} routeLocale={routeLocale} />
    </NextIntlClientProvider>
  );
}
