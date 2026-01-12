"use client";

/**
 * Preprocessing Admin Client Component
 *
 * Client component for preprocessing monitoring UI.
 * Displays queue status, throughput, quality metrics, error logs, and controls.
 *
 * @see doc/specs/completed/DATA_PREPROCESSING.md
 * @see uiux_refactor.md §6.4.2 item 4
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

import type { EmbeddingTargetType } from "@/lib/types/embedding";
import type {
  ChunkingConfig,
  ChunkingStrategy,
  QualityGateConfig,
} from "@/lib/modules/preprocessing/types";

import {
  getQueueStatsAction,
  getThroughputAction,
  getQualityMetricsAction,
  getErrorLogsAction,
  getFailedSamplesAction,
  retryFailedAction,
  purgeFailedAction,
  getPreprocessingConfigsAction,
  updatePreprocessingConfigAction,
} from "./actions";

// =============================================================================
// Types
// =============================================================================

interface PreprocessingQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface PreprocessingThroughput {
  last1h: number;
  last24h: number;
  avgProcessingTimeMs: number | null;
}

interface PreprocessingErrorLog {
  id: string;
  targetType: EmbeddingTargetType;
  targetId: string;
  errorMessage: string;
  attempts: number;
  createdAt: string;
  processedAt: string | null;
}

interface QualityMetrics {
  totalEmbeddings: number;
  withQualityScore: number;
  passedCount: number;
  incompleteCount: number;
  failedCount: number;
  averageScore: number | null;
  passRate: number;
}

interface FailedSample {
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex: number;
  chunkContent: string | null;
  qualityScore: number | null;
  preprocessingMetadata: Record<string, unknown> | null;
}

interface TypeConfigResult {
  chunking: ChunkingConfig;
  quality: QualityGateConfig;
}

type AllConfigs = Record<EmbeddingTargetType, TypeConfigResult>;

interface PreprocessingClientProps {
  initialData: {
    queue: PreprocessingQueueStats;
    throughput: PreprocessingThroughput;
    errorLogs: PreprocessingErrorLog[];
    qualityMetrics: QualityMetrics;
    configs: AllConfigs;
  };
}

/** Target type display labels */
const TYPE_LABELS: Record<EmbeddingTargetType, string> = {
  product: "Product",
  post: "Blog Post",
  gallery_item: "Gallery Item",
  comment: "Comment",
};

/** Chunking strategy options */
const STRATEGY_OPTIONS: { value: ChunkingStrategy; label: string }[] = [
  { value: "semantic", label: "Semantic" },
  { value: "paragraph", label: "Paragraph" },
  { value: "sentence", label: "Sentence" },
  { value: "fixed", label: "Fixed Size" },
];

// =============================================================================
// Component
// =============================================================================

export function PreprocessingClient({ initialData }: PreprocessingClientProps) {
  // Translations via next-intl
  const tp = useTranslations("admin.data.preprocessing");

  // State
  const [queue, setQueue] = useState(initialData.queue);
  const [throughput, setThroughput] = useState(initialData.throughput);
  const [errorLogs, setErrorLogs] = useState(initialData.errorLogs);
  const [qualityMetrics, setQualityMetrics] = useState(
    initialData.qualityMetrics
  );
  const [failedSamples, setFailedSamples] = useState<FailedSample[]>([]);
  const [showSamples, setShowSamples] = useState(false);

  // Config Editor state
  const [configs, setConfigs] = useState<AllConfigs>(initialData.configs);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [editingType, setEditingType] = useState<EmbeddingTargetType | null>(
    null
  );
  const [editingConfig, setEditingConfig] = useState<ChunkingConfig | null>(
    null
  );

  // Loading & message states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Show message temporarily
  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // Refresh all stats
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, throughputRes, qualityRes, logsRes] = await Promise.all([
        getQueueStatsAction(),
        getThroughputAction(),
        getQualityMetricsAction(),
        getErrorLogsAction(20),
      ]);

      if (queueRes.success) setQueue(queueRes.data);
      if (throughputRes.success) setThroughput(throughputRes.data);
      if (qualityRes.success) setQualityMetrics(qualityRes.data);
      if (logsRes.success) setErrorLogs(logsRes.data);

      showMessage("success", "Stats refreshed successfully.");
    } catch {
      showMessage("error", "Failed to refresh stats.");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  // Retry failed items
  const handleRetry = useCallback(async () => {
    setLoading(true);
    try {
      const result = await retryFailedAction();
      if (result.success) {
        showMessage("success", `Retried ${result.data.retried} failed items.`);
        await handleRefresh();
      } else {
        showMessage("error", result.error);
      }
    } catch {
      showMessage("error", "Failed to retry items.");
    } finally {
      setLoading(false);
    }
  }, [showMessage, handleRefresh]);

  // Purge failed items
  const handlePurge = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete all failed queue items?"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await purgeFailedAction();
      if (result.success) {
        showMessage("success", `Purged ${result.data.purged} failed items.`);
        await handleRefresh();
      } else {
        showMessage("error", result.error);
      }
    } catch {
      showMessage("error", "Failed to purge items.");
    } finally {
      setLoading(false);
    }
  }, [showMessage, handleRefresh]);

  // Load failed samples
  const handleLoadSamples = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getFailedSamplesAction(10);
      if (result.success) {
        setFailedSamples(result.data);
        setShowSamples(true);
      } else {
        showMessage("error", result.error);
      }
    } catch {
      showMessage("error", "Failed to load samples.");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  // Open config editor for a specific type
  const handleEditConfig = useCallback(
    (targetType: EmbeddingTargetType) => {
      setEditingType(targetType);
      setEditingConfig({ ...configs[targetType].chunking });
      setShowConfigEditor(true);
    },
    [configs]
  );

  // Save config changes
  const handleSaveConfig = useCallback(async () => {
    if (!editingType || !editingConfig) return;

    setLoading(true);
    try {
      const updateRequest = {
        [editingType]: {
          chunking: editingConfig,
        },
      };

      const result = await updatePreprocessingConfigAction(updateRequest);
      if (result.success) {
        // Refresh configs from server
        const configsRes = await getPreprocessingConfigsAction();
        if (configsRes.success) {
          setConfigs(configsRes.data);
        }
        setShowConfigEditor(false);
        setEditingType(null);
        setEditingConfig(null);
        showMessage(
          "success",
          `Config for ${TYPE_LABELS[editingType]} updated successfully.`
        );
      } else {
        showMessage("error", result.error);
      }
    } catch {
      showMessage("error", "Failed to save config.");
    } finally {
      setLoading(false);
    }
  }, [editingType, editingConfig, showMessage]);

  // Update editing config field
  const updateEditingField = useCallback(
    <K extends keyof ChunkingConfig>(field: K, value: ChunkingConfig[K]) => {
      if (!editingConfig) return;
      setEditingConfig({ ...editingConfig, [field]: value });
    },
    [editingConfig]
  );

  // Format duration
  const formatDuration = (ms: number | null): string => {
    if (ms === null) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Format percentage
  const formatPercent = (value: number): string =>
    `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tp("title")}</h1>
          <p className="text-sm text-gray-500">{tp("subtitle")}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`rounded p-3 ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}>
          {message.text}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Queue Status */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">
            Queue Status
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-yellow-600">Pending</span>
              <span className="font-mono">{queue.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Processing</span>
              <span className="font-mono">{queue.processing}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Completed</span>
              <span className="font-mono">{queue.completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Failed</span>
              <span className="font-mono">{queue.failed}</span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="font-mono">{queue.total}</span>
            </div>
          </div>
        </div>

        {/* Throughput */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">Throughput</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Last 1 hour</span>
              <span className="font-mono">{throughput.last1h} items</span>
            </div>
            <div className="flex justify-between">
              <span>Last 24 hours</span>
              <span className="font-mono">{throughput.last24h} items</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Processing Time</span>
              <span className="font-mono">
                {formatDuration(throughput.avgProcessingTimeMs)}
              </span>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">
            Quality Metrics
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Embeddings</span>
              <span className="font-mono">
                {qualityMetrics.totalEmbeddings}
              </span>
            </div>
            <div className="flex justify-between">
              <span>With Score</span>
              <span className="font-mono">
                {qualityMetrics.withQualityScore}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Passed</span>
              <span className="font-mono">{qualityMetrics.passedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Failed</span>
              <span className="font-mono">{qualityMetrics.failedCount}</span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between font-medium">
              <span>Pass Rate</span>
              <span className="font-mono">
                {formatPercent(qualityMetrics.passRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Score</span>
              <span className="font-mono">
                {qualityMetrics.averageScore?.toFixed(2) ?? "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">
            Queue Controls
          </h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRetry}
              disabled={loading || queue.failed === 0}
              className="rounded bg-yellow-600 px-3 py-2 text-sm text-white hover:bg-yellow-700 disabled:opacity-50">
              Retry Failed ({queue.failed})
            </button>
            <button
              onClick={handlePurge}
              disabled={loading || queue.failed === 0}
              className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              Purge Failed
            </button>
            <button
              onClick={handleLoadSamples}
              disabled={loading}
              className="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50">
              Inspect Samples
            </button>
          </div>
        </div>
      </div>

      {/* Error Logs */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-medium">Recent Error Logs</h3>
        {errorLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No error logs.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Target ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Error
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    Attempts
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {errorLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{TYPE_LABELS[log.targetType]}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {log.targetId.slice(0, 8)}...
                    </td>
                    <td
                      className="max-w-xs truncate px-3 py-2 text-red-600"
                      title={log.errorMessage}>
                      {log.errorMessage}
                    </td>
                    <td className="px-3 py-2 text-center">{log.attempts}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {log.processedAt
                        ? new Date(log.processedAt).toLocaleString()
                        : new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Failed Samples Inspector */}
      {showSamples && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Failed Samples Inspector</h3>
            <button
              onClick={() => setShowSamples(false)}
              className="text-sm text-gray-500 hover:text-gray-700">
              Close
            </button>
          </div>
          {failedSamples.length === 0 ? (
            <p className="text-sm text-gray-500">
              No failed samples to inspect.
            </p>
          ) : (
            <div className="space-y-4">
              {failedSamples.map((sample) => (
                <div
                  key={`${sample.targetId}-${sample.chunkIndex}`}
                  className="rounded border p-3">
                  <div className="mb-2 flex items-center gap-4 text-sm">
                    <span className="rounded bg-gray-100 px-2 py-0.5">
                      {TYPE_LABELS[sample.targetType]}
                    </span>
                    <span className="font-mono text-xs text-gray-500">
                      {sample.targetId.slice(0, 8)}... (chunk{" "}
                      {sample.chunkIndex})
                    </span>
                    <span className="text-red-600">
                      Score: {sample.qualityScore?.toFixed(2) ?? "N/A"}
                    </span>
                  </div>
                  <div className="max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs">
                    <pre className="whitespace-pre-wrap">
                      {sample.chunkContent ?? "Content not available"}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config Editor Panel */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Chunking Configuration</h3>
          <span className="text-xs text-gray-500">DB SSOT - Phase 7</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Type
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Target Size
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Overlap
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Strategy
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Min/Max
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Headings
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(Object.keys(TYPE_LABELS) as EmbeddingTargetType[]).map(
                (type) => {
                  const config = configs[type]?.chunking;
                  return (
                    <tr key={type} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">
                        {TYPE_LABELS[type]}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {config?.targetSize ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {config?.overlap ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center capitalize">
                        {config?.splitBy ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {config?.minSize ?? "-"} / {config?.maxSize ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {config?.useHeadingsAsBoundary ? "✓" : "✗"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleEditConfig(type)}
                          disabled={loading}
                          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-50">
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Config Edit Modal */}
      {showConfigEditor && editingType && editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="m-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium">
              Edit {TYPE_LABELS[editingType]} Chunking Config
            </h3>

            <div className="space-y-4">
              {/* Target Size */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Target Size (tokens)
                </label>
                <input
                  type="number"
                  value={editingConfig.targetSize}
                  onChange={(e) =>
                    updateEditingField(
                      "targetSize",
                      parseInt(e.target.value) || 0
                    )
                  }
                  min={50}
                  max={2000}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: 50-2000
                </p>
              </div>

              {/* Overlap */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Overlap (tokens)
                </label>
                <input
                  type="number"
                  value={editingConfig.overlap}
                  onChange={(e) =>
                    updateEditingField("overlap", parseInt(e.target.value) || 0)
                  }
                  min={0}
                  max={500}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: 10-20% of target size
                </p>
              </div>

              {/* Strategy */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Strategy
                </label>
                <select
                  value={editingConfig.splitBy}
                  onChange={(e) =>
                    updateEditingField(
                      "splitBy",
                      e.target.value as ChunkingStrategy
                    )
                  }
                  className="w-full rounded border px-3 py-2 text-sm">
                  {STRATEGY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min/Max Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Min Size
                  </label>
                  <input
                    type="number"
                    value={editingConfig.minSize}
                    onChange={(e) =>
                      updateEditingField(
                        "minSize",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={1}
                    max={1000}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Max Size
                  </label>
                  <input
                    type="number"
                    value={editingConfig.maxSize}
                    onChange={(e) =>
                      updateEditingField(
                        "maxSize",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={100}
                    max={5000}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Use Headings as Boundary */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useHeadingsAsBoundary"
                  checked={editingConfig.useHeadingsAsBoundary}
                  onChange={(e) =>
                    updateEditingField(
                      "useHeadingsAsBoundary",
                      e.target.checked
                    )
                  }
                  className="rounded"
                />
                <label
                  htmlFor="useHeadingsAsBoundary"
                  className="text-sm font-medium">
                  Use Headings as Chunk Boundary
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowConfigEditor(false);
                  setEditingType(null);
                  setEditingConfig(null);
                }}
                className="rounded bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
