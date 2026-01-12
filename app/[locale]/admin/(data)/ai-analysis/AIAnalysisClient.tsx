"use client";

/**
 * AI Analysis Client Component
 *
 * Client component for AI analysis admin UI.
 * Provides template selection, cost estimation, analysis execution,
 * and report detail viewing.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */

import { useState, useTransition, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import MarkdownContent from "@/components/blog/MarkdownContent";
import type {
  AnalysisReportListItem,
  AnalysisUsageMonthly,
  AnalysisTemplateId,
  AnalysisDataType,
  AnalysisMode,
  ModelPricing,
  AnalysisScheduleListItem,
  CreateScheduleRequest,
} from "@/lib/types/ai-analysis";
import type { CronStatus } from "@/lib/modules/ai-analysis/io";
import {
  ANALYSIS_TEMPLATES,
  COST_THRESHOLDS,
  RAG_DEFAULTS,
  SCHEDULE_CRON_PRESETS,
} from "@/lib/types/ai-analysis";
import {
  startAnalysis,
  listAnalysisReports,
  deleteAnalysisReport,
  getUsageStats,
  getAnalysisReportDetail,
  triggerManualProcessing,
  listSchedulesAction,
  createScheduleAction,
  deleteScheduleAction,
  toggleScheduleAction,
  createShareLinkAction,
  revokeShareLinkAction,
  getShareStatusAction,
  type AnalysisReportDetail,
} from "./actions";

// Print styles for report export (admin-only)
import "./print.css";

interface AIAnalysisClientProps {
  initialData: {
    role: "owner" | "editor";
    configured: boolean;
    recentReports: AnalysisReportListItem[];
    totalReports: number;
    usage: AnalysisUsageMonthly | null;
    models: ModelPricing[];
    cronStatus: CronStatus;
    ragEnabled: boolean;
    // Pre-fill member filter from URL (?memberShortId=C1)
    memberShortId?: string | null;
    memberId?: string | null;
    // Initial schedules for owner (pre-fetched by server to avoid useEffect load)
    initialSchedules?: AnalysisScheduleListItem[];
  };
}

export function AIAnalysisClient({ initialData }: AIAnalysisClientProps) {
  // Translations via next-intl
  const ta = useTranslations("admin.data.aiAnalysis");

  const [isPending, startTransition] = useTransition();
  const [reports, setReports] = useState(initialData.recentReports);
  const [usage, setUsage] = useState(initialData.usage);

  // Form state
  const [selectedTemplate, setSelectedTemplate] =
    useState<AnalysisTemplateId>("sales");
  const [selectedDataTypes, setSelectedDataTypes] = useState<
    AnalysisDataType[]
  >(["products", "orders"]);
  const [selectedModel, setSelectedModel] = useState<string>(
    initialData.models[0]?.modelId ?? "openai/gpt-4o-mini"
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // RAG mode state (Phase 6+)
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>("standard");
  const [ragTopK, setRagTopK] = useState<number>(RAG_DEFAULTS.TOP_K);

  // Member filter state (from URL via Users list entrypoint)
  const [memberShortId] = useState<string | null>(
    initialData.memberShortId ?? null
  );
  const [memberId] = useState<string | null>(initialData.memberId ?? null);

  // Get current model pricing for cost estimation
  const currentModelPricing =
    initialData.models.find((m) => m.modelId === selectedModel) ??
    initialData.models[0];

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Report detail panel state
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<AnalysisReportDetail | null>(
    null
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Manual processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Share link state (Owner only, PR-4)
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Schedule state (initialized from server to avoid useEffect load)
  const [schedules, setSchedules] = useState<AnalysisScheduleListItem[]>(
    initialData.initialSchedules ?? []
  );
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null
  );
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  // Schedule form state
  const [scheduleFormName, setScheduleFormName] = useState("");
  const [scheduleFormTemplate, setScheduleFormTemplate] =
    useState<AnalysisTemplateId>("sales");
  const [scheduleFormDataTypes, setScheduleFormDataTypes] = useState<
    AnalysisDataType[]
  >(["products", "orders"]);
  const [scheduleFormModel, setScheduleFormModel] = useState(
    initialData.models[0]?.modelId ?? "openai/gpt-4o-mini"
  );
  const [scheduleFormCron, setScheduleFormCron] = useState<string>(
    SCHEDULE_CRON_PRESETS.weekly
  );
  const [scheduleFormFrequency, setScheduleFormFrequency] = useState<
    "daily" | "weekly" | "monthly" | "custom"
  >("weekly");
  const [scheduleFormMode, setScheduleFormMode] =
    useState<AnalysisMode>("standard");

  // Check if any reports are pending or running
  const hasActiveReports = reports.some(
    (r) => r.status === "pending" || r.status === "running"
  );

  // Refresh reports list from server
  const refreshReports = useCallback(async () => {
    const reportsResult = await listAnalysisReports(10, 0);
    if (reportsResult.success && reportsResult.data) {
      setReports(reportsResult.data.reports);
    }
    const usageResult = await getUsageStats();
    if (usageResult.success) {
      setUsage(usageResult.data ?? null);
    }
  }, []);

  // Load report detail
  const loadReportDetail = useCallback(
    async (reportId: string) => {
      setIsLoadingDetail(true);
      setSelectedReportId(reportId);
      setReportDetail(null);

      const result = await getAnalysisReportDetail(reportId);
      if (result.success && result.data) {
        setReportDetail(result.data);
        // Also load share status for owners
        if (initialData.role === "owner") {
          const shareResult = await getShareStatusAction(reportId);
          if (shareResult.success && shareResult.data?.url) {
            setShareUrl(shareResult.data.url);
          } else {
            setShareUrl(null);
          }
        }
      } else {
        setError("Failed to load report details.");
        setSelectedReportId(null);
      }
      setIsLoadingDetail(false);
    },
    [initialData.role]
  );

  // Close report detail panel
  const closeReportDetail = useCallback(() => {
    setSelectedReportId(null);
    setReportDetail(null);
    setShareUrl(null);
    setShareCopied(false);
  }, []);

  // Check if selected report is still active (pending/running)
  const isSelectedReportActive =
    reportDetail?.status === "pending" || reportDetail?.status === "running";

  // Poll for updates when there are pending/running reports
  useEffect(() => {
    if (!initialData.configured) {
      return;
    }

    // Poll if there are active reports in the list OR the selected report is active
    if (!hasActiveReports && !isSelectedReportActive) {
      return;
    }

    const pollInterval = setInterval(async () => {
      await refreshReports();
      // Also refresh selected report detail if it's active
      if (selectedReportId && isSelectedReportActive) {
        const result = await getAnalysisReportDetail(selectedReportId);
        if (result.success && result.data) {
          setReportDetail(result.data);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [
    hasActiveReports,
    isSelectedReportActive,
    initialData.configured,
    refreshReports,
    selectedReportId,
  ]);

  // Get current template info
  const currentTemplate = ANALYSIS_TEMPLATES.find(
    (t) => t.id === selectedTemplate
  );

  // Handle template change - auto-select required data types
  const handleTemplateChange = (templateId: AnalysisTemplateId) => {
    setSelectedTemplate(templateId);
    const template = ANALYSIS_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedDataTypes([...template.requiredDataTypes]);
    }
  };

  // Handle data type toggle
  const handleDataTypeToggle = (dataType: AnalysisDataType) => {
    const isRequired = currentTemplate?.requiredDataTypes.includes(dataType);
    if (isRequired) {
      // Cannot unselect required types
      return;
    }

    setSelectedDataTypes((prev) =>
      prev.includes(dataType)
        ? prev.filter((t) => t !== dataType)
        : [...prev, dataType]
    );
  };

  // Start analysis
  const handleStartAnalysis = () => {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const request = {
        templateId: selectedTemplate,
        mode: selectedMode,
        modelId: selectedModel,
        dataTypes: selectedDataTypes,
        filters: {
          dateRange:
            dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
          // Include member filter if set from URL
          memberIds: memberId ? [memberId] : undefined,
        },
        ragConfig:
          selectedMode === "rag"
            ? { topK: ragTopK, threshold: RAG_DEFAULTS.THRESHOLD }
            : undefined,
      };

      const result = await startAnalysis(request);

      if (!result.success) {
        setError("Failed to start analysis. Please check configuration.");
        return;
      }

      setSuccessMessage(
        "Analysis started! It will appear in the list when complete."
      );

      // Refresh reports list
      const reportsResult = await listAnalysisReports(10, 0);
      if (reportsResult.success && reportsResult.data) {
        setReports(reportsResult.data.reports);
      }

      // Refresh usage
      const usageResult = await getUsageStats();
      if (usageResult.success) {
        setUsage(usageResult.data ?? null);
      }
    });
  };

  // Delete report
  const handleDeleteReport = (reportId: string) => {
    if (initialData.role !== "owner") {
      setError("Only owners can delete reports.");
      return;
    }

    startTransition(async () => {
      const result = await deleteAnalysisReport(reportId);

      if (!result.success) {
        setError("Failed to delete report.");
        return;
      }

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setSuccessMessage("Report deleted.");
    });
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "running":
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle manual trigger
  const handleManualTrigger = () => {
    setError(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    startTransition(async () => {
      const result = await triggerManualProcessing();
      setIsProcessing(false);

      if (!result.success) {
        setError("Failed to process. Please try again later.");
        return;
      }

      if (!result.data?.processed) {
        setError(result.data?.error ?? "No pending reports to process.");
        return;
      }

      if (result.data.status === "failed") {
        setError(`Report failed: ${result.data.error ?? "Unknown error"}`);
      } else {
        setSuccessMessage(
          `Report processed successfully (${result.data.status}).`
        );
      }

      await refreshReports();
    });
  };

  // =========================================================================
  // Schedule Handlers
  // =========================================================================

  // Load schedules list
  const loadSchedules = useCallback(async () => {
    setIsLoadingSchedules(true);
    const result = await listSchedulesAction(20, 0);
    if (result.success && result.data) {
      setSchedules(result.data.schedules);
    }
    setIsLoadingSchedules(false);
  }, []);

  // Note: loadSchedules() is called only after user actions (create/toggle/delete/refresh),
  // not on mount. Initial schedules are fetched server-side and passed as props.

  // Reset schedule form
  const resetScheduleForm = useCallback(() => {
    setScheduleFormName("");
    setScheduleFormTemplate("sales");
    setScheduleFormDataTypes(["products", "orders"]);
    setScheduleFormModel(
      initialData.models[0]?.modelId ?? "openai/gpt-4o-mini"
    );
    setScheduleFormCron(SCHEDULE_CRON_PRESETS.weekly);
    setScheduleFormFrequency("weekly");
    setScheduleFormMode("standard");
    setEditingScheduleId(null);
  }, [initialData.models]);

  // Open create schedule modal
  const openCreateScheduleModal = () => {
    resetScheduleForm();
    setShowScheduleModal(true);
  };

  // Handle schedule template change (auto-select required data types)
  const handleScheduleTemplateChange = (templateId: AnalysisTemplateId) => {
    setScheduleFormTemplate(templateId);
    const template = ANALYSIS_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setScheduleFormDataTypes([...template.requiredDataTypes]);
    }
  };

  // Handle frequency preset change
  const handleFrequencyChange = (
    freq: "daily" | "weekly" | "monthly" | "custom"
  ) => {
    setScheduleFormFrequency(freq);
    if (freq !== "custom") {
      setScheduleFormCron(SCHEDULE_CRON_PRESETS[freq]);
    }
  };

  // Create schedule
  const handleCreateSchedule = () => {
    if (!scheduleFormName.trim()) {
      setError("Please enter a schedule name.");
      return;
    }

    startTransition(async () => {
      const request: CreateScheduleRequest = {
        name: scheduleFormName.trim(),
        templateId: scheduleFormTemplate,
        dataTypes: scheduleFormDataTypes,
        mode: scheduleFormMode,
        modelId: scheduleFormModel,
        scheduleCron: scheduleFormCron,
      };

      const result = await createScheduleAction(request);

      if (!result.success) {
        setError("Failed to create schedule.");
        return;
      }

      setSuccessMessage("Schedule created successfully.");
      setShowScheduleModal(false);
      resetScheduleForm();
      await loadSchedules();
    });
  };

  // Toggle schedule enabled/disabled
  const handleToggleSchedule = (
    scheduleId: string,
    currentEnabled: boolean
  ) => {
    startTransition(async () => {
      const result = await toggleScheduleAction(scheduleId, !currentEnabled);

      if (!result.success) {
        setError("Failed to toggle schedule.");
        return;
      }

      // Update local state optimistically
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === scheduleId ? { ...s, isEnabled: !currentEnabled } : s
        )
      );
      setSuccessMessage(
        `Schedule ${!currentEnabled ? "enabled" : "disabled"}.`
      );
    });
  };

  // Delete schedule
  const handleDeleteSchedule = (scheduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteScheduleAction(scheduleId);

      if (!result.success) {
        setError("Failed to delete schedule.");
        return;
      }

      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setSuccessMessage("Schedule deleted.");
    });
  };

  // Format cron for display
  const formatCronDisplay = (cron: string) => {
    switch (cron) {
      case "@daily":
        return "Daily (6:00 AM)";
      case "@weekly":
        return "Weekly (Monday 6:00 AM)";
      case "@monthly":
        return "Monthly (1st, 6:00 AM)";
      default:
        return `Custom: ${cron}`;
    }
  };

  // Show not configured message
  if (!initialData.configured) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{ta("title")}</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            OpenRouter API Not Configured
          </p>
          <p className="text-yellow-700 text-sm mt-2">
            To use AI analysis, set the{" "}
            <code className="bg-yellow-100 px-1 rounded">
              OPENROUTER_API_KEY
            </code>{" "}
            environment variable in your deployment settings.
          </p>
          <p className="text-yellow-600 text-xs mt-2">
            Get an API key at{" "}
            <a
              href="https://openrouter.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline">
              openrouter.ai
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{ta("title")}</h1>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Member Filter Badge (from URL via Users list entrypoint) */}
      {memberShortId && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {memberShortId}
              </span>
              <p className="text-purple-800 text-sm">
                Analysis will target this specific user
                {!memberId && " (user not found in customer profiles)"}
              </p>
            </div>
            <a
              href={window.location.pathname}
              className="text-purple-600 hover:text-purple-800 text-sm underline">
              Clear filter
            </a>
          </div>
        </div>
      )}

      {/* Cron Status Warning */}
      {!initialData.cronStatus.cronConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-amber-800 font-medium">Cron Not Configured</p>
          <p className="text-amber-700 text-sm mt-1">
            Reports will not be processed automatically. Set{" "}
            <code className="bg-amber-100 px-1 rounded">CRON_SECRET</code> in
            your environment and configure Vercel Cron.
          </p>
          {initialData.role === "owner" && hasActiveReports && (
            <button
              onClick={handleManualTrigger}
              disabled={isPending || isProcessing}
              className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {isProcessing ? "Processing..." : "Process Pending Report Now"}
            </button>
          )}
        </div>
      )}
      {initialData.cronStatus.cronConfigured &&
        !initialData.cronStatus.cronActive && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-orange-800 font-medium">
              Cron May Not Be Running
            </p>
            <p className="text-orange-700 text-sm mt-1">
              {initialData.cronStatus.pendingCount} pending report(s) have been
              waiting for over 10 minutes. Verify your Vercel Cron
              configuration.
            </p>
            {initialData.role === "owner" && (
              <button
                onClick={handleManualTrigger}
                disabled={isPending || isProcessing}
                className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessing ? "Processing..." : "Process Pending Report Now"}
              </button>
            )}
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <section className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Analysis Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ANALYSIS_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateChange(template.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedTemplate === template.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className="font-medium">{template.name.en}</p>
                  <p className="text-sm text-gray-600">
                    {template.description.en}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Data Types */}
          <section className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Data Types</h2>
            <p className="text-sm text-gray-600 mb-3">
              Required types are auto-selected based on template.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["products", "orders", "members", "comments"] as const).map(
                (dataType) => {
                  const isSelected = selectedDataTypes.includes(dataType);
                  const isRequired =
                    currentTemplate?.requiredDataTypes.includes(dataType);
                  return (
                    <button
                      key={dataType}
                      onClick={() => handleDataTypeToggle(dataType)}
                      disabled={isRequired}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        isSelected
                          ? isRequired
                            ? "bg-blue-500 text-white cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}>
                      {dataType}
                      {isRequired && " (required)"}
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* Analysis Mode (Phase 6+) */}
          {initialData.ragEnabled && (
            <section className="border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Analysis Mode</h2>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setSelectedMode("standard")}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    selectedMode === "standard"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className="font-medium">Standard</p>
                  <p className="text-xs text-gray-500">
                    Send all filtered data to AI
                  </p>
                </button>
                <button
                  onClick={() => setSelectedMode("rag")}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    selectedMode === "rag"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className="font-medium">RAG (Smart)</p>
                  <p className="text-xs text-gray-500">
                    Retrieve relevant data only
                  </p>
                </button>
              </div>

              {selectedMode === "rag" && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Top-K Chunks: {ragTopK}
                  </label>
                  <input
                    type="range"
                    min={RAG_DEFAULTS.MIN_TOP_K}
                    max={RAG_DEFAULTS.MAX_TOP_K}
                    value={ragTopK}
                    onChange={(e) => setRagTopK(Number(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-blue-600 mt-1">
                    <span>{RAG_DEFAULTS.MIN_TOP_K}</span>
                    <span>{RAG_DEFAULTS.MAX_TOP_K}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 RAG mode uses semantic search to find the most relevant
                    data, potentially reducing cost.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Model Selection */}
          <section className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">AI Model</h2>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white">
              {initialData.models.map((model) => (
                <option key={model.modelId} value={model.modelId}>
                  {model.modelName} (${model.inputPricePerMillion.toFixed(2)}/M
                  input, ${model.outputPricePerMillion.toFixed(2)}/M output)
                </option>
              ))}
            </select>
            {currentModelPricing && (
              <p className="text-xs text-gray-500 mt-2">
                Estimated cost varies by data size. Higher-tier models provide
                more detailed analysis.
              </p>
            )}
          </section>

          {/* Date Range */}
          <section className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">
              Date Range (Optional)
            </h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* Cost Warning (High Cost Model) */}
          {currentModelPricing &&
            currentModelPricing.inputPricePerMillion > 1.0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium">
                  Cost Warning
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  {currentModelPricing.modelName} has higher pricing. Estimated
                  cost depends on data size. Consider using a more economical
                  model for routine analyses.
                </p>
              </div>
            )}

          {/* Action Button */}
          <button
            onClick={handleStartAnalysis}
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending
              ? "Starting Analysis..."
              : `Run Analysis with ${
                  currentModelPricing?.modelName ?? "Selected Model"
                }`}
          </button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Usage Stats */}
          <section className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Monthly Usage</h2>
            {usage ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost</span>
                  <span className="font-medium">
                    ${usage.totalCostUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Analyses</span>
                  <span className="font-medium">{usage.analysisCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget</span>
                  <span className="font-medium">
                    ${COST_THRESHOLDS.MONTHLY_BUDGET_LIMIT.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      usage.totalCostUsd >=
                      COST_THRESHOLDS.MONTHLY_BUDGET_LIMIT * 0.8
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (usage.totalCostUsd /
                          COST_THRESHOLDS.MONTHLY_BUDGET_LIMIT) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No usage this month</p>
            )}
          </section>

          {/* Recent Reports */}
          <section className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Recent Reports</h2>
            {reports.length === 0 ? (
              <p className="text-gray-500 text-sm">No reports yet</p>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedReportId === report.id
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => loadReportDetail(report.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {report.templateId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${getStatusColor(
                              report.status
                            )}`}>
                            {report.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{formatDate(report.createdAt)}</span>
                          {report.costUsd !== null && (
                            <span className="text-green-600">
                              ${report.costUsd.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                      {initialData.role === "owner" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(report.id);
                          }}
                          className="text-red-500 hover:text-red-700 text-xs ml-2 flex-shrink-0"
                          disabled={isPending}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Scheduled Reports (Owner only) */}
          {initialData.role === "owner" && (
            <section className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Scheduled Reports</h2>
                <button
                  onClick={openCreateScheduleModal}
                  disabled={isPending}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                  + New
                </button>
              </div>
              {isLoadingSchedules ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                </div>
              ) : schedules.length === 0 ? (
                <p className="text-gray-500 text-sm">No scheduled reports</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`p-2 rounded ${
                        schedule.isEnabled
                          ? "bg-gray-50"
                          : "bg-gray-100 opacity-60"
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {schedule.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCronDisplay(schedule.scheduleCron)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Next: {formatDate(schedule.nextRunAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() =>
                              handleToggleSchedule(
                                schedule.id,
                                schedule.isEnabled
                              )
                            }
                            disabled={isPending}
                            className={`w-10 h-5 rounded-full relative transition-colors ${
                              schedule.isEnabled
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                            aria-label={
                              schedule.isEnabled ? "Disable" : "Enable"
                            }>
                            <span
                              className={`absolute top-0.5 ${
                                schedule.isEnabled ? "right-0.5" : "left-0.5"
                              } w-4 h-4 bg-white rounded-full shadow transition-all`}
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            disabled={isPending}
                            className="text-red-500 hover:text-red-700 text-xs">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Report Detail Panel (Modal-style overlay) */}
      {selectedReportId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print-modal-backdrop">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col print-container">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Report Details</h2>
              <button
                onClick={closeReportDetail}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label="Close">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 print-content">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : reportDetail ? (
                <div className="space-y-4">
                  {/* Status & Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Status
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                          reportDetail.status
                        )}`}>
                        {reportDetail.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Template
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {reportDetail.templateId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Model
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {reportDetail.model ?? "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Created
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {formatDate(reportDetail.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Token & Cost Info */}
                  {(reportDetail.inputTokens !== null ||
                    reportDetail.costUsd !== null) && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                        Usage
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Input Tokens:</span>{" "}
                          <span className="font-medium">
                            {reportDetail.inputTokens?.toLocaleString() ??
                              "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Output Tokens:</span>{" "}
                          <span className="font-medium">
                            {reportDetail.outputTokens?.toLocaleString() ??
                              "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Cost:</span>{" "}
                          <span className="font-medium text-green-600">
                            ${reportDetail.costUsd?.toFixed(4) ?? "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Types */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Data Types
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {reportDetail.dataTypes.map((dt) => (
                        <span
                          key={dt}
                          className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {dt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Error Message */}
                  {reportDetail.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-600 uppercase tracking-wide mb-1">
                        Error
                      </p>
                      <p className="text-sm text-red-800">
                        {reportDetail.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Pending/Running Status */}
                  {(reportDetail.status === "pending" ||
                    reportDetail.status === "running") && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto mb-2" />
                      <p className="text-yellow-800 text-sm">
                        {reportDetail.status === "pending"
                          ? "Waiting for analysis to start..."
                          : "Analysis in progress..."}
                      </p>
                      <p className="text-yellow-600 text-xs mt-1">
                        This may take a few minutes. The page will update
                        automatically.
                      </p>
                    </div>
                  )}

                  {/* Report Content */}
                  {reportDetail.resultHtml && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                        Analysis Result
                      </p>
                      <div className="border rounded-lg p-4 bg-white">
                        <MarkdownContent html={reportDetail.resultHtml} />
                      </div>
                    </div>
                  )}

                  {/* Incomplete Warning */}
                  {reportDetail.status === "incomplete" && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800">
                        This analysis completed but produced less content than
                        expected. Consider adjusting filters or including more
                        data types.
                      </p>
                    </div>
                  )}

                  {/* Share Link Section (Owner only, completed reports) */}
                  {initialData.role === "owner" &&
                    (reportDetail.status === "completed" ||
                      reportDetail.status === "incomplete") && (
                      <div className="bg-gray-50 rounded-lg p-4 no-print">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                          Share Report
                        </p>
                        {shareUrl ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(shareUrl);
                                  setShareCopied(true);
                                  setTimeout(() => setShareCopied(false), 2000);
                                }}
                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                {shareCopied ? "Copied!" : "Copy"}
                              </button>
                            </div>
                            <button
                              onClick={async () => {
                                setShareLoading(true);
                                const token = shareUrl.split("/").pop() ?? "";
                                const result = await revokeShareLinkAction(
                                  token
                                );
                                if (result.success) {
                                  setShareUrl(null);
                                  setSuccessMessage("Share link revoked.");
                                } else {
                                  setError("Failed to revoke share link.");
                                }
                                setShareLoading(false);
                              }}
                              disabled={shareLoading}
                              className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50">
                              {shareLoading
                                ? "Revoking..."
                                : "Revoke Share Link"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              if (!selectedReportId) return;
                              setShareLoading(true);
                              const result = await createShareLinkAction(
                                selectedReportId
                              );
                              if (result.success && result.data) {
                                setShareUrl(result.data.url);
                                setSuccessMessage("Share link created.");
                              } else {
                                setError("Failed to create share link.");
                              }
                              setShareLoading(false);
                            }}
                            disabled={shareLoading}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50">
                            {shareLoading ? "Creating..." : "Create Share Link"}
                          </button>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Anyone with this link can view the report without
                          logging in.
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">
                  Failed to load report details.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end gap-2 no-print">
              {/* Print / Save as PDF button (only show for completed reports) */}
              {reportDetail &&
                (reportDetail.status === "completed" ||
                  reportDetail.status === "incomplete") && (
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Print / Save as PDF
                  </button>
                )}
              <button
                onClick={closeReportDetail}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingScheduleId ? "Edit Schedule" : "Create Schedule"}
              </h2>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  resetScheduleForm();
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label="Close">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={scheduleFormName}
                  onChange={(e) => setScheduleFormName(e.target.value)}
                  placeholder="e.g., Weekly Sales Report"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              {/* Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Analysis Template
                </label>
                <select
                  value={scheduleFormTemplate}
                  onChange={(e) =>
                    handleScheduleTemplateChange(
                      e.target.value as AnalysisTemplateId
                    )
                  }
                  className="w-full border rounded-lg px-3 py-2 bg-white">
                  {ANALYSIS_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <div className="flex gap-2">
                  {(["daily", "weekly", "monthly", "custom"] as const).map(
                    (freq) => (
                      <button
                        key={freq}
                        onClick={() => handleFrequencyChange(freq)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                          scheduleFormFrequency === freq
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    )
                  )}
                </div>
                {scheduleFormFrequency === "custom" && (
                  <input
                    type="text"
                    value={scheduleFormCron}
                    onChange={(e) => setScheduleFormCron(e.target.value)}
                    placeholder="e.g., 0 6 * * 1 (cron syntax)"
                    className="w-full border rounded-lg px-3 py-2 mt-2 text-sm"
                  />
                )}
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Model
                </label>
                <select
                  value={scheduleFormModel}
                  onChange={(e) => setScheduleFormModel(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white text-sm">
                  {initialData.models.map((model) => (
                    <option key={model.modelId} value={model.modelId}>
                      {model.modelName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode (if RAG enabled) */}
              {initialData.ragEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Analysis Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setScheduleFormMode("standard")}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                        scheduleFormMode === "standard"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}>
                      Standard
                    </button>
                    <button
                      onClick={() => setScheduleFormMode("rag")}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                        scheduleFormMode === "rag"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}>
                      RAG (Smart)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  resetScheduleForm();
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={isPending || !scheduleFormName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isPending ? "Creating..." : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
