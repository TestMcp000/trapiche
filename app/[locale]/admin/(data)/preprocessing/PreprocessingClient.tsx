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
import { useLocale, useTranslations } from "next-intl";

import type { EmbeddingTargetType, PreprocessableTargetType } from "@/lib/types/embedding";
import type {
  ChunkingConfig,
  ChunkingStrategy,
  QualityGateConfig,
} from "@/lib/modules/preprocessing/types";
import { getErrorLabel } from "@/lib/types/action-result";

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

type AllConfigs = Record<PreprocessableTargetType, TypeConfigResult>;

interface PreprocessingClientProps {
  initialData: {
    queue: PreprocessingQueueStats;
    throughput: PreprocessingThroughput;
    errorLogs: PreprocessingErrorLog[];
    qualityMetrics: QualityMetrics;
    configs: AllConfigs;
  };
}

// =============================================================================
// Component
// =============================================================================

export function PreprocessingClient({ initialData }: PreprocessingClientProps) {
  // Translations via next-intl
  const tp = useTranslations("admin.data.preprocessing");
  const tc = useTranslations("admin.data.common");
  const routeLocale = useLocale();

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
  const [editingType, setEditingType] = useState<PreprocessableTargetType | null>(
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

      showMessage("success", tp("statsRefreshed"));
    } catch {
      showMessage("error", tp("refreshFailed"));
    } finally {
      setLoading(false);
    }
  }, [showMessage, tp]);

  // Retry failed items
  const handleRetry = useCallback(async () => {
    setLoading(true);
    try {
      const result = await retryFailedAction();
      if (result.success) {
        showMessage("success", tp("retriedCount", { count: result.data.retried }));
        await handleRefresh();
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    } catch {
      showMessage("error", tp("retryFailedMessage"));
    } finally {
      setLoading(false);
    }
  }, [showMessage, handleRefresh, tp, routeLocale]);

  // Purge failed items
  const handlePurge = useCallback(async () => {
    if (
      !window.confirm(
        tp("purgeConfirm")
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await purgeFailedAction();
      if (result.success) {
        showMessage("success", tp("purgedCount", { count: result.data.purged }));
        await handleRefresh();
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    } catch {
      showMessage("error", tp("purgeFailedMessage"));
    } finally {
      setLoading(false);
    }
  }, [showMessage, handleRefresh, tp, routeLocale]);

  // Load failed samples
  const handleLoadSamples = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getFailedSamplesAction(10);
      if (result.success) {
        setFailedSamples(result.data);
        setShowSamples(true);
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    } catch {
      showMessage("error", tp("loadSamplesFailed"));
    } finally {
      setLoading(false);
    }
  }, [showMessage, tp, routeLocale]);

  // Open config editor for a specific type
  const handleEditConfig = useCallback(
    (targetType: PreprocessableTargetType) => {
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
          tp("configUpdated", { type: tp(`typeLabels.${editingType}`) })
        );
      } else {
        showMessage("error", getErrorLabel(result.errorCode, routeLocale));
      }
    } catch {
      showMessage("error", tp("saveConfigFailed"));
    } finally {
      setLoading(false);
    }
  }, [editingType, editingConfig, showMessage, tp, routeLocale]);

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
    if (ms === null) return tp("notAvailable");
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
          {loading ? tc("refreshing") : tc("refresh")}
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
          <h3 className="mb-2 text-sm font-medium text-gray-500">{tp("queueStatus")}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-yellow-600">{tp("pending")}</span>
              <span className="font-mono">{queue.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">{tp("processing")}</span>
              <span className="font-mono">{queue.processing}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">{tp("completed")}</span>
              <span className="font-mono">{queue.completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">{tp("failed")}</span>
              <span className="font-mono">{queue.failed}</span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between font-medium">
              <span>{tp("total")}</span>
              <span className="font-mono">{queue.total}</span>
            </div>
          </div>
        </div>

        {/* Throughput */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">{tp("throughput")}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{tp("last1Hour")}</span>
              <span className="font-mono">
                {throughput.last1h} {tc("items")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tp("last24Hours")}</span>
              <span className="font-mono">
                {throughput.last24h} {tc("items")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tp("avgProcessingTime")}</span>
              <span className="font-mono">
                {formatDuration(throughput.avgProcessingTimeMs)}
              </span>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">{tp("qualityMetrics")}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{tp("totalEmbeddings")}</span>
              <span className="font-mono">
                {qualityMetrics.totalEmbeddings}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tp("withScoreLabel")}</span>
              <span className="font-mono">
                {qualityMetrics.withQualityScore}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">{tp("passed")}</span>
              <span className="font-mono">{qualityMetrics.passedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">{tp("failed")}</span>
              <span className="font-mono">{qualityMetrics.failedCount}</span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between font-medium">
              <span>{tp("passRateLabel")}</span>
              <span className="font-mono">
                {formatPercent(qualityMetrics.passRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tp("avgScore")}</span>
              <span className="font-mono">
                {qualityMetrics.averageScore?.toFixed(2) ?? tp("notAvailable")}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">{tp("queueControls")}</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRetry}
              disabled={loading || queue.failed === 0}
              className="rounded bg-yellow-600 px-3 py-2 text-sm text-white hover:bg-yellow-700 disabled:opacity-50">
              {tp("retryFailed")} ({queue.failed})
            </button>
            <button
              onClick={handlePurge}
              disabled={loading || queue.failed === 0}
              className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              {tp("purgeFailed")}
            </button>
            <button
              onClick={handleLoadSamples}
              disabled={loading}
              className="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50">
              {tp("inspectSamples")}
            </button>
          </div>
        </div>
      </div>

      {/* Error Logs */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-medium">{tp("recentErrorLogs")}</h3>
        {errorLogs.length === 0 ? (
          <p className="text-sm text-gray-500">{tp("noErrorLogs")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    {tc("type")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    {tp("targetId")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    {tp("error")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    {tp("attempts")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    {tp("time")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {errorLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{tp(`typeLabels.${log.targetType}`)}</td>
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
            <h3 className="text-lg font-medium">{tp("failedSamplesInspector")}</h3>
            <button
              onClick={() => setShowSamples(false)}
              className="text-sm text-gray-500 hover:text-gray-700">
              {tc("close")}
            </button>
          </div>
          {failedSamples.length === 0 ? (
            <p className="text-sm text-gray-500">{tp("noFailedSamples")}</p>
          ) : (
            <div className="space-y-4">
              {failedSamples.map((sample) => (
                <div
                  key={`${sample.targetId}-${sample.chunkIndex}`}
                  className="rounded border p-3">
                  <div className="mb-2 flex items-center gap-4 text-sm">
                    <span className="rounded bg-gray-100 px-2 py-0.5">
                      {tp(`typeLabels.${sample.targetType}`)}
                    </span>
                    <span className="font-mono text-xs text-gray-500">
                      {sample.targetId.slice(0, 8)}... ({tp("chunk")} {sample.chunkIndex})
                    </span>
                    <span className="text-red-600">
                      {tp("score")}: {sample.qualityScore?.toFixed(2) ?? tp("notAvailable")}
                    </span>
                  </div>
                  <div className="max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs">
                    <pre className="whitespace-pre-wrap">
                      {sample.chunkContent ?? tp("contentNotAvailable")}
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
          <h3 className="text-lg font-medium">{tp("chunkingConfig")}</h3>
          <span className="text-xs text-gray-500">{tp("dbSsotPhase7")}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  {tc("type")}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  {tp("targetSize")}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  {tp("overlap")}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  {tp("strategy")}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  {tp("minMax")}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  {tp("headings")}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  {tc("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(Object.keys(configs) as PreprocessableTargetType[]).map((type) => {
                  const config = configs[type]?.chunking;
                  return (
                    <tr key={type} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">
                        {tp(`typeLabels.${type}`)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {config?.targetSize ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {config?.overlap ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center capitalize">
                        {config?.splitBy ? tp(`strategyLabels.${config.splitBy}`) : "-"}
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
                          {tp("editConfig")}
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
              {tp("editConfigTitle", { type: tp(`typeLabels.${editingType}`) })}
            </h3>

            <div className="space-y-4">
              {/* Target Size */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {tp("targetSizeTokens")}
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
                  {tp("targetSizeRecommended")}
                </p>
              </div>

              {/* Overlap */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {tp("overlapTokens")}
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
                  {tp("overlapRecommended")}
                </p>
              </div>

              {/* Strategy */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {tp("strategy")}
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
                  {(
                    ["semantic", "paragraph", "sentence", "fixed"] as const
                  ).map((value) => (
                    <option key={value} value={value}>
                      {tp(`strategyLabels.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min/Max Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {tp("minSize")}
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
                    {tp("maxSize")}
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
                  {tp("useHeadingsAsBoundary")}
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
                {tc("cancel")}
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? tc("saving") : tc("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
