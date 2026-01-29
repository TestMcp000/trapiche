"use client";

/**
 * Embeddings Admin Client Component
 *
 * Client component for embedding management UI.
 * Displays stats dashboard, queue status, and action buttons.
 *
 * @see doc/specs/completed/SUPABASE_AI.md §4.2
 * @see uiux_refactor.md §6.3.2 item 5
 */

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  EmbeddingStats,
  EmbeddingTargetType,
} from "@/lib/types/embedding";
import { getErrorLabel } from "@/lib/types/action-result";
import {
  getEmbeddingStatsAction,
  initializeAllEmbeddingsAction,
  retryFailedEmbeddingsAction,
  getQualityMetricsAction,
  getFailedSamplesAction,
  type InitializeResult,
  type QueueItem,
} from "./actions";

// =============================================================================
// Types
// =============================================================================

interface EmbeddingsClientProps {
  initialData: {
    enabled: boolean;
    stats: EmbeddingStats;
    queueItems: QueueItem[];
  };
}

// =============================================================================
// Component
// =============================================================================

export function EmbeddingsClient({ initialData }: EmbeddingsClientProps) {
  // Translations via next-intl
  const te = useTranslations("admin.data.embeddings");
  const tc = useTranslations("admin.data.common");
  const routeLocale = useLocale();

  const [isPending, startTransition] = useTransition();

  // Stats state
  const [stats, setStats] = useState<EmbeddingStats>(initialData.stats);
  const [queueItems, _setQueueItems] = useState<QueueItem[]>(
    initialData.queueItems
  );

  // UI state
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [initResult, setInitResult] = useState<InitializeResult | null>(null);

  // Quality metrics state (LLM-as-a-Judge)
  const [qualityMetrics, setQualityMetrics] = useState<{
    totalEmbeddings: number;
    withQualityScore: number;
    passedCount: number;
    incompleteCount: number;
    failedCount: number;
    averageScore: number | null;
    passRate: number;
  } | null>(null);
  const [failedSamples, setFailedSamples] = useState<
    Array<{
      targetType: EmbeddingTargetType;
      targetId: string;
      chunkIndex: number;
      chunkContent: string | null;
      qualityScore: number | null;
      preprocessingMetadata: Record<string, unknown> | null;
    }>
  >([]);
  const [showFailedSamples, setShowFailedSamples] = useState(false);

  // Clear message after delay
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Refresh stats
  const handleRefresh = () => {
    startTransition(async () => {
      const result = await getEmbeddingStatsAction();
      if (result.success) {
        setStats(result.data);
        showMessage("success", te("statisticsRefreshed"));
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    });
  };

  // Initialize all embeddings
  const handleInitialize = () => {
    if (!confirm(te("initConfirm"))) return;

    startTransition(async () => {
      setInitResult(null);
      const result = await initializeAllEmbeddingsAction();
      if (result.success) {
        setInitResult(result.data);
        showMessage("success", te("initQueued"));
        // Refresh stats
        const statsResult = await getEmbeddingStatsAction();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    });
  };

  // Retry failed embeddings
  const handleRetry = () => {
    startTransition(async () => {
      const result = await retryFailedEmbeddingsAction();
      if (result.success) {
        showMessage("success", te("retriedItems", { count: result.data.retried }));
        // Refresh stats
        const statsResult = await getEmbeddingStatsAction();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    });
  };

  // Load quality metrics
  const handleLoadQualityMetrics = () => {
    startTransition(async () => {
      const result = await getQualityMetricsAction();
      if (result.success) {
        setQualityMetrics(result.data);
        showMessage("success", te("qualityMetricsLoaded"));
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    });
  };

  // Load failed samples
  const handleLoadFailedSamples = () => {
    startTransition(async () => {
      const result = await getFailedSamplesAction(10);
      if (result.success) {
        setFailedSamples(result.data);
        setShowFailedSamples(true);
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    });
  };

  // Show not enabled message
  if (!initialData.enabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{te("title")}</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            {te("notAvailable")}
          </p>
          <p className="text-yellow-700 text-sm mt-2">
            {te("notAvailableDesc")}
          </p>
          <p className="text-yellow-600 text-xs mt-2">
            {te("ensureApiKey", { key: "OPENAI_API_KEY" })}
          </p>
        </div>

        {/* Still show action buttons even if not enabled */}
        <div className="flex gap-3">
          <button
            onClick={handleInitialize}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isPending ? tc("processing") : te("initializeAll")}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{te("title")}</h1>
      <p className="text-gray-600 mb-6">{te("description")}</p>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
          {message.text}
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title={te("typeLabels.post")}
          total={stats.posts.total}
          withEmbedding={stats.posts.withEmbedding}
          failed={stats.posts.failed}
        />
        <StatCard
          title={te("typeLabels.gallery_item")}
          total={stats.galleryItems.total}
          withEmbedding={stats.galleryItems.withEmbedding}
          failed={stats.galleryItems.failed}
        />
        <StatCard
          title={te("typeLabels.comment")}
          total={stats.comments.total}
          withEmbedding={stats.comments.withEmbedding}
          failed={stats.comments.failed}
        />
        <StatCard
          title={te("typeLabels.safety_slang")}
          total={stats.safetySlang.total}
          withEmbedding={stats.safetySlang.withEmbedding}
          failed={stats.safetySlang.failed}
        />
        <StatCard
          title={te("typeLabels.safety_case")}
          total={stats.safetyCase.total}
          withEmbedding={stats.safetyCase.withEmbedding}
          failed={stats.safetyCase.failed}
        />
      </div>

      {/* Queue Status */}
      <div className="border rounded-lg mb-6">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="font-semibold">{te("queueStatus")}</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-sm text-gray-700">
                {te("pendingStats")}: <strong>{stats.queuePending}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-sm text-gray-700">
                {te("failed")}: <strong>{stats.queueFailed}</strong>
              </span>
            </div>
          </div>

          {/* Queue Items Preview */}
          {queueItems.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {te("pendingItemsPreview")} ({queueItems.length})
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {queueItems.map((item, i) => (
                  <div
                    key={`${item.targetType}-${item.targetId}-${i}`}
                    className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                    {te(`typeLabels.${item.targetType}`)} | {item.targetId.slice(0, 8)}... |{" "}
                    {te("attempts")}: {item.attempts}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quality Metrics (LLM-as-a-Judge) */}
      <div className="border rounded-lg mb-6">
        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
          <h2 className="font-semibold">{te("qualityMetrics")}</h2>
          <button
            onClick={handleLoadQualityMetrics}
            disabled={isPending}
            className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
            {isPending ? tc("loading") : te("loadMetrics")}
          </button>
        </div>
        <div className="p-4">
          {qualityMetrics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600 font-medium">
                    {te("passRate")}
                  </div>
                  <div className="text-xl font-bold text-green-700">
                    {(qualityMetrics.passRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">
                    {te("avgScore")}
                  </div>
                  <div className="text-xl font-bold text-blue-700">
                    {qualityMetrics.averageScore !== null
                      ? qualityMetrics.averageScore.toFixed(2)
                      : "-"}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-600 font-medium">
                    {te("withScore")}
                  </div>
                  <div className="text-xl font-bold text-gray-700">
                    {qualityMetrics.withQualityScore} /{" "}
                    {qualityMetrics.totalEmbeddings}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-xs text-red-600 font-medium">{te("failed")}</div>
                  <div className="text-xl font-bold text-red-700">
                    {qualityMetrics.failedCount}
                  </div>
                </div>
              </div>

              {/* Quality Status Breakdown */}
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">
                  ✓ {te("passed")}: {qualityMetrics.passedCount}
                </span>
                <span className="text-yellow-600">
                  ⚠ {te("incomplete")}: {qualityMetrics.incompleteCount}
                </span>
                <span className="text-red-600">
                  ✕ {te("failed")}: {qualityMetrics.failedCount}
                </span>
              </div>

              {/* Failed Samples Inspection */}
              {qualityMetrics.failedCount > 0 && (
                <div className="mt-4">
                  <button
                    onClick={handleLoadFailedSamples}
                    disabled={isPending}
                    className="text-sm text-purple-600 hover:underline">
                    {showFailedSamples ? tc("refresh") : te("inspectFailedSamples")} →
                  </button>

                  {showFailedSamples && failedSamples.length > 0 && (
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {failedSamples.map((sample, i) => (
                        <div key={i} className="bg-red-50 p-2 rounded text-xs">
                          <div className="font-mono text-gray-600">
                            {te(`typeLabels.${sample.targetType}`)} |{" "}
                            {sample.targetId.slice(0, 8)}... | {te("chunk")} #
                            {sample.chunkIndex}
                          </div>
                          {sample.qualityScore !== null && (
                            <div className="text-red-600">
                              {te("score")}: {sample.qualityScore.toFixed(2)}
                            </div>
                          )}
                          {sample.chunkContent && (
                            <div className="text-gray-700 mt-1 truncate max-w-md">
                              {sample.chunkContent.slice(0, 100)}...
                            </div>
                          )}
                          {typeof sample.preprocessingMetadata?.judge_reason ===
                            "string" && (
                            <div className="text-red-600 mt-1">
                              {te("reason")}:{" "}
                              {sample.preprocessingMetadata.judge_reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {te("clickLoadMetrics")}
            </p>
          )}
        </div>
      </div>

      {/* Actions Panel */}
      <div className="border rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="font-semibold">{te("actionsSection")}</h2>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {isPending ? tc("loading") : te("refreshStats")}
            </button>

            <button
              onClick={handleInitialize}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isPending ? tc("processing") : te("initializeAll")}
            </button>

            <button
              onClick={handleRetry}
              disabled={isPending || stats.queueFailed === 0}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {isPending
                ? tc("processing")
                : `${te("retryFailed")} (${stats.queueFailed})`}
            </button>
          </div>

          {/* Initialize Result */}
          {initResult && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                {te("initResult")}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-700">
                <div>
                  {te("typeLabels.post")}: {initResult.posts.queued} {te("queued")},{" "}
                  {initResult.posts.skipped} {te("skipped")}
                </div>
                <div>
                  {te("typeLabels.gallery_item")}: {initResult.galleryItems.queued}{" "}
                  {te("queued")}, {initResult.galleryItems.skipped} {te("skipped")}
                </div>
                <div>
                  {te("typeLabels.comment")}: {initResult.comments.queued} {te("queued")},{" "}
                  {initResult.comments.skipped} {te("skipped")}
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500">
            <strong>{te("note")}</strong> {te("embeddingNote")}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({
  title,
  total,
  withEmbedding,
  failed,
}: {
  title: string;
  total: number;
  withEmbedding: number;
  failed: number;
}) {
  const te = useTranslations("admin.data.embeddings");

  const coverage = total > 0 ? Math.round((withEmbedding / total) * 100) : 0;
  const missing = total - withEmbedding - failed;

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <div className="mt-2">
        <div className="text-2xl font-bold text-gray-900">
          {withEmbedding}{" "}
          <span className="text-sm font-normal text-gray-500">/ {total}</span>
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {coverage}% {te("coverage")}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 transition-all"
              style={{
                width: `${(withEmbedding / Math.max(total, 1)) * 100}%`,
              }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${(failed / Math.max(total, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Details */}
        <div className="mt-2 flex gap-3 text-xs text-gray-500">
          {failed > 0 && (
            <span className="text-red-600">
              {failed} {te("failed")}
            </span>
          )}
          {missing > 0 && (
            <span>
              {missing} {te("pendingStats")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
