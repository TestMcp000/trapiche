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
import { useTranslations } from "next-intl";
import type {
  EmbeddingStats,
  EmbeddingTargetType,
} from "@/lib/types/embedding";
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

/** Target type display labels */
const TYPE_LABELS: Record<EmbeddingTargetType, string> = {
  product: "Products",
  post: "Blog Posts",
  gallery_item: "Gallery Items",
  comment: "Comments",
};

// =============================================================================
// Component
// =============================================================================

export function EmbeddingsClient({ initialData }: EmbeddingsClientProps) {
  // Translations via next-intl
  const te = useTranslations("admin.data.embeddings");

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
        showMessage("success", "Statistics refreshed.");
      } else {
        showMessage("error", result.error);
      }
    });
  };

  // Initialize all embeddings
  const handleInitialize = () => {
    if (
      !confirm(
        "This will scan all content and enqueue items without embeddings. Continue?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      setInitResult(null);
      const result = await initializeAllEmbeddingsAction();
      if (result.success) {
        setInitResult(result.data);
        showMessage(
          "success",
          "Embeddings initialization queued successfully."
        );
        // Refresh stats
        const statsResult = await getEmbeddingStatsAction();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } else {
        showMessage("error", result.error);
      }
    });
  };

  // Retry failed embeddings
  const handleRetry = () => {
    startTransition(async () => {
      const result = await retryFailedEmbeddingsAction();
      if (result.success) {
        showMessage("success", `Retried ${result.data.retried} failed items.`);
        // Refresh stats
        const statsResult = await getEmbeddingStatsAction();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } else {
        showMessage("error", result.error);
      }
    });
  };

  // Load quality metrics
  const handleLoadQualityMetrics = () => {
    startTransition(async () => {
      const result = await getQualityMetricsAction();
      if (result.success) {
        setQualityMetrics(result.data);
        showMessage("success", "Quality metrics loaded.");
      } else {
        showMessage("error", result.error);
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
        showMessage("error", result.error);
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
            Embeddings Not Available
          </p>
          <p className="text-yellow-700 text-sm mt-2">
            No embeddings have been generated yet. Use the &quot;Initialize
            All&quot; button below to scan content and enqueue embedding
            generation.
          </p>
          <p className="text-yellow-600 text-xs mt-2">
            Ensure the{" "}
            <code className="bg-yellow-100 px-1 rounded">OPENAI_API_KEY</code>{" "}
            is set in Supabase secrets and the embedding Edge Function is
            deployed.
          </p>
        </div>

        {/* Still show action buttons even if not enabled */}
        <div className="flex gap-3">
          <button
            onClick={handleInitialize}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isPending ? "Processing..." : "Initialize All Embeddings"}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Products"
          total={stats.products.total}
          withEmbedding={stats.products.withEmbedding}
          failed={stats.products.failed}
        />
        <StatCard
          title="Blog Posts"
          total={stats.posts.total}
          withEmbedding={stats.posts.withEmbedding}
          failed={stats.posts.failed}
        />
        <StatCard
          title="Gallery Items"
          total={stats.galleryItems.total}
          withEmbedding={stats.galleryItems.withEmbedding}
          failed={stats.galleryItems.failed}
        />
        <StatCard
          title="Comments"
          total={stats.comments.total}
          withEmbedding={stats.comments.withEmbedding}
          failed={stats.comments.failed}
        />
      </div>

      {/* Queue Status */}
      <div className="border rounded-lg mb-6">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="font-semibold">Queue Status</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-sm text-gray-700">
                Pending: <strong>{stats.queuePending}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-sm text-gray-700">
                Failed: <strong>{stats.queueFailed}</strong>
              </span>
            </div>
          </div>

          {/* Queue Items Preview */}
          {queueItems.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Pending Items Preview (first {queueItems.length})
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {queueItems.map((item, i) => (
                  <div
                    key={`${item.targetType}-${item.targetId}-${i}`}
                    className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                    {TYPE_LABELS[item.targetType]} | {item.targetId.slice(0, 8)}
                    ... | attempts: {item.attempts}
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
          <h2 className="font-semibold">Quality Metrics (LLM-as-a-Judge)</h2>
          <button
            onClick={handleLoadQualityMetrics}
            disabled={isPending}
            className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
            {isPending ? "Loading..." : "Load Metrics"}
          </button>
        </div>
        <div className="p-4">
          {qualityMetrics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600 font-medium">
                    Pass Rate
                  </div>
                  <div className="text-xl font-bold text-green-700">
                    {(qualityMetrics.passRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">
                    Avg Score
                  </div>
                  <div className="text-xl font-bold text-blue-700">
                    {qualityMetrics.averageScore !== null
                      ? qualityMetrics.averageScore.toFixed(2)
                      : "N/A"}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-600 font-medium">
                    With Score
                  </div>
                  <div className="text-xl font-bold text-gray-700">
                    {qualityMetrics.withQualityScore} /{" "}
                    {qualityMetrics.totalEmbeddings}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-xs text-red-600 font-medium">Failed</div>
                  <div className="text-xl font-bold text-red-700">
                    {qualityMetrics.failedCount}
                  </div>
                </div>
              </div>

              {/* Quality Status Breakdown */}
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">
                  ✓ Passed: {qualityMetrics.passedCount}
                </span>
                <span className="text-yellow-600">
                  ⚠ Incomplete: {qualityMetrics.incompleteCount}
                </span>
                <span className="text-red-600">
                  ✕ Failed: {qualityMetrics.failedCount}
                </span>
              </div>

              {/* Failed Samples Inspection */}
              {qualityMetrics.failedCount > 0 && (
                <div className="mt-4">
                  <button
                    onClick={handleLoadFailedSamples}
                    disabled={isPending}
                    className="text-sm text-purple-600 hover:underline">
                    {showFailedSamples ? "Reload" : "Inspect"} failed samples →
                  </button>

                  {showFailedSamples && failedSamples.length > 0 && (
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {failedSamples.map((sample, i) => (
                        <div key={i} className="bg-red-50 p-2 rounded text-xs">
                          <div className="font-mono text-gray-600">
                            {TYPE_LABELS[sample.targetType]} |{" "}
                            {sample.targetId.slice(0, 8)}... | chunk #
                            {sample.chunkIndex}
                          </div>
                          {sample.qualityScore !== null && (
                            <div className="text-red-600">
                              Score: {sample.qualityScore.toFixed(2)}
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
                              Reason:{" "}
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
              Click &quot;Load Metrics&quot; to view quality scoring results
              from LLM-as-a-Judge.
            </p>
          )}
        </div>
      </div>

      {/* Actions Panel */}
      <div className="border rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="font-semibold">Actions</h2>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {isPending ? "Loading..." : "Refresh Stats"}
            </button>

            <button
              onClick={handleInitialize}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isPending ? "Processing..." : "Initialize All Embeddings"}
            </button>

            <button
              onClick={handleRetry}
              disabled={isPending || stats.queueFailed === 0}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {isPending
                ? "Processing..."
                : `Retry Failed (${stats.queueFailed})`}
            </button>
          </div>

          {/* Initialize Result */}
          {initResult && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Initialization Result
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
                <div>
                  Products: {initResult.products.queued} queued,{" "}
                  {initResult.products.skipped} skipped
                </div>
                <div>
                  Posts: {initResult.posts.queued} queued,{" "}
                  {initResult.posts.skipped} skipped
                </div>
                <div>
                  Gallery: {initResult.galleryItems.queued} queued,{" "}
                  {initResult.galleryItems.skipped} skipped
                </div>
                <div>
                  Comments: {initResult.comments.queued} queued,{" "}
                  {initResult.comments.skipped} skipped
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500">
            <strong>Note:</strong> Embedding generation requires the Edge
            Function to be deployed and queued items are processed by the
            embedding queue worker.
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
        <div className="mt-1 text-sm text-gray-600">{coverage}% coverage</div>

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
          {failed > 0 && <span className="text-red-600">{failed} failed</span>}
          {missing > 0 && <span>{missing} pending</span>}
        </div>
      </div>
    </div>
  );
}
