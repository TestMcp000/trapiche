"use client";

/**
 * Import/Export Client Component
 * @see doc/specs/completed/IMPORT_EXPORT.md
 * @see uiux_refactor.md §6.1.4 JSON Import UI (Gallery/Content)
 *
 * Client component for bulk data import/export UI.
 * Client only handles file selection/upload and displays results.
 * All parsing/validation happens server-side.
 */

import { useState, useTransition, useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AdminRoleType } from "@/lib/modules/auth";
import type { ExportFormat } from "./actions";
import {
  // Blog
  exportBlog,
  previewBlogImportAction,
  applyBlogImportAction,
  type ExportBlogActionResult,
  type ImportPreviewActionResult,
  type ImportApplyActionResult,
  // Gallery
  exportGalleryItems,
  exportGalleryCategories,
  previewGalleryItemsImportAction,
  applyGalleryItemsImportAction,
  previewGalleryCategoriesImportAction,
  applyGalleryCategoriesImportAction,
  // Content
  exportSiteContent,
  exportLandingSections,
  previewSiteContentImportAction,
  applySiteContentImportAction,
  previewLandingSectionsImportAction,
  applyLandingSectionsImportAction,
  // Comments (job-tracked export for history)
  exportCommentsWithJob,
  // Job History
  listJobsAction,
  redownloadJobAction,
  deleteJobAction,
  type GenericExportResult,
  type GenericImportPreviewResult,
  type GenericImportApplyResult,
} from "./actions";
import { getErrorLabel } from "@/lib/types/action-result";
import type {
  BlogImportPreview,
  BlogImportResult,
} from "@/lib/modules/import-export/import-blog-io";
import type { ImportExportJobListItem } from "@/lib/types/import-export";

// =============================================================================
// Types
// =============================================================================

/** JSON import key identifiers */
type JsonImportKey =
  | "galleryItems"
  | "galleryCategories"
  | "siteContent"
  | "landingSections";

/** State for a single JSON import */
interface JsonImportState {
  file: File | null;
  previewResult: GenericImportPreviewResult | null;
  importResult: GenericImportApplyResult | null;
}

// =============================================================================
// Props
// =============================================================================

interface ImportExportClientProps {
  /** Admin role: 'owner' can import/export; 'editor' can export only */
  role: NonNullable<AdminRoleType>;
}

// =============================================================================
// Initial State Factory
// =============================================================================

function createInitialJsonImportState(): Record<
  JsonImportKey,
  JsonImportState
> {
  return {
    galleryItems: { file: null, previewResult: null, importResult: null },
    galleryCategories: { file: null, previewResult: null, importResult: null },
    siteContent: { file: null, previewResult: null, importResult: null },
    landingSections: { file: null, previewResult: null, importResult: null },
  };
}

// =============================================================================
// Main Component
// =============================================================================

export function ImportExportClient({ role }: ImportExportClientProps) {
  const isOwner = role === "owner";
  const [isPending, startTransition] = useTransition();
  const tc = useTranslations("admin.data.common");
  const ti = useTranslations("admin.data.importExport");

  // Blog state (existing)
  const [blogExportResult, setBlogExportResult] =
    useState<ExportBlogActionResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] =
    useState<ImportPreviewActionResult | null>(null);
  const [importResult, setImportResult] =
    useState<ImportApplyActionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phase 2+3 export results
  const [exportResults, setExportResults] = useState<
    Record<string, GenericExportResult | null>
  >({});

  // Format selection state for CSV-capable exports
  const [exportFormats, setExportFormats] = useState<
    Record<string, ExportFormat>
  >({
    comments: "json",
  });

  // Phase 2+3 JSON import states
  const [jsonImportStates, setJsonImportStates] = useState<
    Record<JsonImportKey, JsonImportState>
  >(createInitialJsonImportState);
  const jsonFileInputRefs = useRef<
    Record<JsonImportKey, HTMLInputElement | null>
  >({
    galleryItems: null,
    galleryCategories: null,
    siteContent: null,
    landingSections: null,
  });

  // ---------------------------------------------------------------------------
  // Blog handlers (existing)
  // ---------------------------------------------------------------------------

  const handleExportBlog = () => {
    startTransition(async () => {
      setBlogExportResult(null);
      const result = await exportBlog();
      setBlogExportResult(result);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setPreviewResult(null);
    setImportResult(null);
  };

  const handlePreview = () => {
    if (!importFile) return;
    startTransition(async () => {
      setPreviewResult(null);
      setImportResult(null);
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await previewBlogImportAction(formData);
      setPreviewResult(result);
    });
  };

  const handleApplyImport = () => {
    if (!importFile) return;
    startTransition(async () => {
      setImportResult(null);
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await applyBlogImportAction(formData);
      setImportResult(result);
      if (result.success && result.data?.success) {
        setImportFile(null);
        setPreviewResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const handleClearImport = () => {
    setImportFile(null);
    setPreviewResult(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---------------------------------------------------------------------------
  // Generic export handler for Phase 2+3
  // ---------------------------------------------------------------------------

  const handleGenericExport = (
    key: string,
    exportFn: () => Promise<GenericExportResult>
  ) => {
    startTransition(async () => {
      setExportResults((prev) => ({ ...prev, [key]: null }));
      const result = await exportFn();
      setExportResults((prev) => ({ ...prev, [key]: result }));
    });
  };

  // ---------------------------------------------------------------------------
  // JSON import handlers for Phase 2+3
  // ---------------------------------------------------------------------------

  const handleJsonFileChange = (key: JsonImportKey, file: File | null) => {
    setJsonImportStates((prev) => ({
      ...prev,
      [key]: { file, previewResult: null, importResult: null },
    }));
  };

  const handleJsonPreview = (
    key: JsonImportKey,
    previewFn: (formData: FormData) => Promise<GenericImportPreviewResult>
  ) => {
    const file = jsonImportStates[key].file;
    if (!file) return;

    startTransition(async () => {
      setJsonImportStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], previewResult: null, importResult: null },
      }));
      const formData = new FormData();
      formData.append("file", file);
      const result = await previewFn(formData);
      setJsonImportStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], previewResult: result },
      }));
    });
  };

  const handleJsonApply = (
    key: JsonImportKey,
    applyFn: (formData: FormData) => Promise<GenericImportApplyResult>
  ) => {
    const file = jsonImportStates[key].file;
    if (!file) return;

    startTransition(async () => {
      setJsonImportStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], importResult: null },
      }));
      const formData = new FormData();
      formData.append("file", file);
      const result = await applyFn(formData);
      setJsonImportStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], importResult: result },
      }));
      if (result.success) {
        // Clear file on success
        const inputRef = jsonFileInputRefs.current[key];
        if (inputRef) inputRef.value = "";
        setJsonImportStates((prev) => ({
          ...prev,
          [key]: { file: null, previewResult: null, importResult: result },
        }));
      }
    });
  };

  const handleJsonClear = (key: JsonImportKey) => {
    const inputRef = jsonFileInputRefs.current[key];
    if (inputRef) inputRef.value = "";
    setJsonImportStates((prev) => ({
      ...prev,
      [key]: { file: null, previewResult: null, importResult: null },
    }));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{ti("title")}</h1>

      {/* Blog Section */}
      <SectionTitle>{ti("blog")}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ExportCard
          title={ti("blogData")}
          description={ti("blogExportDesc")}
          onExport={handleExportBlog}
          isPending={isPending}
          result={
            blogExportResult
              ? blogExportResult.success
                ? {
                    success: true,
                    data: {
                      downloadUrl: blogExportResult.data.downloadUrl,
                      stats: {
                        count:
                          blogExportResult.data.stats.postsCount +
                          blogExportResult.data.stats.categoriesCount,
                        bundleSizeBytes: blogExportResult.data.stats.bundleSizeBytes,
                      },
                    },
                  }
                : { success: false, errorCode: blogExportResult.errorCode }
              : null
          }
          statsLabel={
            blogExportResult?.success
              ? `${blogExportResult.data.stats.postsCount} ${ti("posts")}, ${
                  blogExportResult.data.stats.categoriesCount
                } ${ti("categories")}`
              : undefined
          }
        />

        <ImportCard
          title={ti("blogData")}
          description={ti("blogImportDesc")}
          isOwner={isOwner}
          isPending={isPending}
          file={importFile}
          fileInputRef={fileInputRef}
          fileAccept=".zip"
          onFileChange={handleFileChange}
          onPreview={handlePreview}
          onApply={handleApplyImport}
          onClear={handleClearImport}
          previewResult={previewResult}
          importResult={importResult}
        />
      </div>

      {/* Gallery Section */}
      <SectionTitle>{ti("gallery")}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ExportCard
          title={tc("galleryItems")}
          description={ti("galleryItemsExportDesc")}
          onExport={() =>
            handleGenericExport("galleryItems", exportGalleryItems)
          }
          isPending={isPending}
          result={exportResults.galleryItems ?? null}
        />
        <JsonImportCard
          title={tc("galleryItems")}
          description={ti("galleryItemsImportDesc")}
          isOwner={isOwner}
          isPending={isPending}
          importKey="galleryItems"
          state={jsonImportStates.galleryItems}
          onFileChange={(file) => handleJsonFileChange("galleryItems", file)}
          onPreview={() =>
            handleJsonPreview("galleryItems", previewGalleryItemsImportAction)
          }
          onApply={() =>
            handleJsonApply("galleryItems", applyGalleryItemsImportAction)
          }
          onClear={() => handleJsonClear("galleryItems")}
          setInputRef={(el) => {
            jsonFileInputRefs.current.galleryItems = el;
          }}
        />
        <ExportCard
          title={tc("galleryCategories")}
          description={ti("galleryCategoriesExportDesc")}
          onExport={() =>
            handleGenericExport("galleryCategories", exportGalleryCategories)
          }
          isPending={isPending}
          result={exportResults.galleryCategories ?? null}
        />
        <JsonImportCard
          title={tc("galleryCategories")}
          description={ti("galleryCategoriesImportDesc")}
          isOwner={isOwner}
          isPending={isPending}
          importKey="galleryCategories"
          state={jsonImportStates.galleryCategories}
          onFileChange={(file) =>
            handleJsonFileChange("galleryCategories", file)
          }
          onPreview={() =>
            handleJsonPreview(
              "galleryCategories",
              previewGalleryCategoriesImportAction
            )
          }
          onApply={() =>
            handleJsonApply(
              "galleryCategories",
              applyGalleryCategoriesImportAction
            )
          }
          onClear={() => handleJsonClear("galleryCategories")}
          setInputRef={(el) => {
            jsonFileInputRefs.current.galleryCategories = el;
          }}
        />
      </div>

      {/* Content Section */}
      <SectionTitle>{ti("content")}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <ExportCard
          title={ti("siteContent")}
          description={ti("siteContentDesc")}
          onExport={() => handleGenericExport("siteContent", exportSiteContent)}
          isPending={isPending}
          result={exportResults.siteContent ?? null}
          compact
        />
        <ExportCard
          title={ti("landingSections")}
          description={ti("landingSectionsDesc")}
          onExport={() =>
            handleGenericExport("landingSections", exportLandingSections)
          }
          isPending={isPending}
          result={exportResults.landingSections ?? null}
          compact
        />
        <ExportCardWithFormat
          title={tc("comments")}
          description={ti("commentsDesc")}
          format={exportFormats.comments}
          onFormatChange={(f) =>
            setExportFormats((prev) => ({ ...prev, comments: f }))
          }
          onExport={() => {
            const format = exportFormats.comments;
            startTransition(async () => {
              setExportResults((prev) => ({ ...prev, comments: null }));
              const jobResult = await exportCommentsWithJob({ format });
              const mapped: GenericExportResult = jobResult.success
                ? {
                    success: true,
                    data: {
                      downloadUrl: jobResult.data.downloadUrl,
                      stats: jobResult.data.stats,
                    },
                  }
                : { success: false, errorCode: jobResult.errorCode };
              setExportResults((prev) => ({ ...prev, comments: mapped }));
            });
          }}
          isPending={isPending}
          result={exportResults.comments ?? null}
          compact
        />
      </div>
      {/* Content Import Cards (Site Content & Landing only - Comments is export-only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <JsonImportCard
          title={ti("siteContent")}
          description={ti("siteContentImportDesc")}
          isOwner={isOwner}
          isPending={isPending}
          importKey="siteContent"
          state={jsonImportStates.siteContent}
          onFileChange={(file) => handleJsonFileChange("siteContent", file)}
          onPreview={() =>
            handleJsonPreview("siteContent", previewSiteContentImportAction)
          }
          onApply={() =>
            handleJsonApply("siteContent", applySiteContentImportAction)
          }
          onClear={() => handleJsonClear("siteContent")}
          setInputRef={(el) => {
            jsonFileInputRefs.current.siteContent = el;
          }}
        />
        <JsonImportCard
          title={ti("landingSections")}
          description={ti("landingSectionsImportDesc")}
          isOwner={isOwner}
          isPending={isPending}
          importKey="landingSections"
          state={jsonImportStates.landingSections}
          onFileChange={(file) => handleJsonFileChange("landingSections", file)}
          onPreview={() =>
            handleJsonPreview(
              "landingSections",
              previewLandingSectionsImportAction
            )
          }
          onApply={() =>
            handleJsonApply("landingSections", applyLandingSectionsImportAction)
          }
          onClear={() => handleJsonClear("landingSections")}
          setInputRef={(el) => {
            jsonFileInputRefs.current.landingSections = el;
          }}
        />
      </div>

      {/* Job History Section */}
      <JobHistorySection
        isOwner={isOwner}
        isPending={isPending}
        startTransition={startTransition}
      />
    </div>
  );
}

// =============================================================================
// Reusable Components
// =============================================================================

/** Section title */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
      {children}
    </h2>
  );
}

/** Export card props */
interface ExportCardProps {
  title: string;
  description: string;
  onExport: () => void;
  isPending: boolean;
  result: GenericExportResult | null;
  statsLabel?: string;
  compact?: boolean;
}

/** Generic export card component */
function ExportCard({
  title,
  description,
  onExport,
  isPending,
  result,
  statsLabel,
  compact = false,
}: ExportCardProps) {
  const locale = useLocale();
  const tc = useTranslations("admin.data.common");

  return (
    <div
      className={`border rounded-lg bg-white shadow-sm ${
        compact ? "p-3" : "p-4"
      }`}>
      <h3 className={`font-medium ${compact ? "text-sm" : "text-base"}`}>
        {title}
      </h3>
      <p
        className={`text-gray-500 ${
          compact ? "text-xs mt-1" : "text-sm mt-2"
        } mb-3`}>
        {description}
      </p>

      <button
        onClick={onExport}
        disabled={isPending}
        className={`w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
          compact ? "text-sm" : ""
        }`}>
        {isPending ? tc("exporting") : tc("export")}
      </button>

      {result && (
        <div className="mt-3">
          {result.success ? (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-800 font-medium">{tc("success")}</p>
              {(statsLabel || result.data?.stats) && (
                <p className="text-green-700 text-xs mt-1">
                  {statsLabel ||
                    `${result.data?.stats?.count ?? 0} ${tc("items")}`}
                  {result.data?.stats?.bundleSizeBytes && (
                    <span className="text-green-600 ml-1">
                      (
                      {(
                        ((result.data?.stats?.bundleSizeBytes ?? 0) / 1024) as number
                      ).toFixed(1)}{" "}
                      KB)
                    </span>
                  )}
                </p>
              )}
              {result.data?.downloadUrl && (
                <a
                  href={result.data.downloadUrl}
                  download
                  className="inline-block mt-1 text-blue-600 hover:text-blue-800 underline text-xs">
                  {tc("download")}
                </a>
              )}
            </div>
          ) : (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-xs">
                {getErrorLabel(result.errorCode, locale)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Export card with format selector props */
interface ExportCardWithFormatProps {
  title: string;
  description: string;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
  isPending: boolean;
  result: GenericExportResult | null;
  statsLabel?: string;
  compact?: boolean;
}

/** Export card with format selector (JSON/CSV) */
function ExportCardWithFormat({
  title,
  description,
  format,
  onFormatChange,
  onExport,
  isPending,
  result,
  statsLabel,
  compact = false,
}: ExportCardWithFormatProps) {
  const locale = useLocale();
  const tc = useTranslations("admin.data.common");

  return (
    <div
      className={`border rounded-lg bg-white shadow-sm ${
        compact ? "p-3" : "p-4"
      }`}>
      <h3 className={`font-medium ${compact ? "text-sm" : "text-base"}`}>
        {title}
      </h3>
      <p
        className={`text-gray-500 ${
          compact ? "text-xs mt-1" : "text-sm mt-2"
        } mb-2`}>
        {description}
      </p>

      {/* Format selector */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => onFormatChange("json")}
          className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
            format === "json"
              ? "bg-blue-100 border-blue-400 text-blue-800"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
          }`}>
          JSON
        </button>
        <button
          type="button"
          onClick={() => onFormatChange("csv")}
          className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
            format === "csv"
              ? "bg-green-100 border-green-400 text-green-800"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
          }`}>
          CSV
        </button>
      </div>

      <button
        onClick={onExport}
        disabled={isPending}
        className={`w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
          compact ? "text-sm" : ""
        }`}>
        {isPending ? tc("exporting") : `${tc("export")} ${format.toUpperCase()}`}
      </button>

      {result && (
        <div className="mt-3">
          {result.success ? (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-800 font-medium">{tc("success")}</p>
              {(statsLabel || result.data?.stats) && (
                <p className="text-green-700 text-xs mt-1">
                  {statsLabel ||
                    `${result.data?.stats?.count ?? 0} ${tc("items")}`}
                  {result.data?.stats?.bundleSizeBytes && (
                    <span className="text-green-600 ml-1">
                      (
                      {(
                        ((result.data?.stats?.bundleSizeBytes ?? 0) / 1024) as number
                      ).toFixed(1)}{" "}
                      KB)
                    </span>
                  )}
                </p>
              )}
              {result.data?.downloadUrl && (
                <a
                  href={result.data.downloadUrl}
                  download
                  className="inline-block mt-1 text-blue-600 hover:text-blue-800 underline text-xs">
                  {tc("download")}
                </a>
              )}
            </div>
          ) : (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-xs">
                {getErrorLabel(result.errorCode, locale)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Import card props (for Blog) */
interface ImportCardProps {
  title: string;
  description: string;
  isOwner: boolean;
  isPending: boolean;
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileAccept: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: () => void;
  onApply: () => void;
  onClear: () => void;
  previewResult: ImportPreviewActionResult | null;
  importResult: ImportApplyActionResult | null;
}

function ImportCard({
  title,
  description,
  isOwner,
  isPending,
  file,
  fileInputRef,
  fileAccept,
  onFileChange,
  onPreview,
  onApply,
  onClear,
  previewResult,
  importResult,
}: ImportCardProps) {
  const tc = useTranslations("admin.data.common");

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-medium">
        {tc("import")} {title}
      </h3>
      <p className="text-gray-500 text-sm mt-2 mb-3">{description}</p>

      {!isOwner ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 italic text-sm">
            {tc("ownerOnly")}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={fileAccept}
              onChange={onFileChange}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onPreview}
              disabled={!file || isPending}
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
              {isPending ? tc("validating") : tc("preview")}
            </button>
            <button
              onClick={onClear}
              disabled={isPending}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm">
              {tc("clear")}
            </button>
          </div>

          {previewResult && (
            <PreviewResultCard
              previewResult={previewResult}
              onApply={onApply}
              isPending={isPending}
            />
          )}

          {importResult && <ImportResultCard importResult={importResult} />}
        </>
      )}
    </div>
  );
}

// =============================================================================
// JSON Import Card (for Gallery/Content)
// =============================================================================

interface JsonImportCardProps {
  title: string;
  description: string;
  isOwner: boolean;
  isPending: boolean;
  importKey: JsonImportKey;
  state: JsonImportState;
  onFileChange: (file: File | null) => void;
  onPreview: () => void;
  onApply: () => void;
  onClear: () => void;
  setInputRef: (el: HTMLInputElement | null) => void;
}

function JsonImportCard({
  title,
  description,
  isOwner,
  isPending,
  state,
  onFileChange,
  onPreview,
  onApply,
  onClear,
  setInputRef,
}: JsonImportCardProps) {
  const tc = useTranslations("admin.data.common");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files?.[0] ?? null);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-medium">
        {tc("import")} {title}
      </h3>
      <p className="text-gray-500 text-sm mt-2 mb-3">{description}</p>

      {!isOwner ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 italic text-sm">
            {tc("ownerOnly")}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <input
              ref={setInputRef}
              type="file"
              accept=".json"
              onChange={handleChange}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onPreview}
              disabled={!state.file || isPending}
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
              {isPending ? tc("validating") : tc("preview")}
            </button>
            <button
              onClick={onClear}
              disabled={isPending}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm">
              {tc("clear")}
            </button>
          </div>

          {state.previewResult && (
            <GenericPreviewResultCard
              previewResult={state.previewResult}
              onApply={onApply}
              isPending={isPending}
            />
          )}

          {state.importResult && (
            <GenericImportResultCard importResult={state.importResult} />
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Preview/Import Result Cards (Blog-specific)
// =============================================================================

interface PreviewResultCardProps {
  previewResult: ImportPreviewActionResult;
  onApply: () => void;
  isPending: boolean;
}

function PreviewResultCard({
  previewResult,
  onApply,
  isPending,
}: PreviewResultCardProps) {
  const locale = useLocale();
  const tc = useTranslations("admin.data.common");
  const ti = useTranslations("admin.data.importExport");

  if (!previewResult.success) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">
          {getErrorLabel(previewResult.errorCode, locale)}
        </p>
      </div>
    );
  }

  const preview: BlogImportPreview | undefined = previewResult.data;
  if (!preview) return null;

  const hasErrors = !preview.success;
  const canApply =
    preview.success &&
    (preview.categories.valid > 0 || preview.posts.valid > 0);

  return (
    <div
      className={`mt-3 p-3 border rounded-md ${
        hasErrors ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
      }`}>
      <h4 className="font-medium text-sm mb-2">
        {hasErrors ? ti("validationFailed") : tc("preview")}
      </h4>

      {preview.error && (
        <p className="text-red-800 text-xs mb-2">{preview.error}</p>
      )}

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">{ti("categoriesLabel")}:</span>{" "}
          {preview.categories.valid}/{preview.categories.total} {ti("validCount")}
        </p>
        <p>
          <span className="font-medium">{ti("postsLabel")}:</span>{" "}
          {preview.posts.valid}/{preview.posts.total} {ti("validCount")}
        </p>
        {preview.missingCategories.length > 0 && (
          <p className="text-amber-700">
            <span className="font-medium">{ti("missingCategoriesLabel")}:</span>{" "}
            {preview.missingCategories.join(", ")}
          </p>
        )}
      </div>

      {/* Validation errors */}
      {preview.categories.items.filter((i) => !i.valid).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer">
            {ti("categoryErrors")} (
            {preview.categories.items.filter((i) => !i.valid).length})
          </summary>
          <ul className="mt-1 text-xs text-red-600 max-h-24 overflow-y-auto">
            {preview.categories.items
              .filter((i) => !i.valid)
              .map((item, idx) => (
                <li key={idx}>
                  <code>{item.slug}</code>:{" "}
                  {Object.values(item.errors ?? {}).join(", ")}
                </li>
              ))}
          </ul>
        </details>
      )}

      {preview.posts.items.filter((i) => !i.valid).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer">
            {ti("postErrors")} ({preview.posts.items.filter((i) => !i.valid).length})
          </summary>
          <ul className="mt-1 text-xs text-red-600 max-h-24 overflow-y-auto">
            {preview.posts.items
              .filter((i) => !i.valid)
              .map((item, idx) => (
                <li key={idx}>
                  <code>{item.slug}</code>:{" "}
                  {Object.values(item.errors ?? {}).join(", ")}
                </li>
              ))}
          </ul>
        </details>
      )}

      {canApply && (
        <button
          onClick={onApply}
          disabled={isPending}
          className="mt-3 w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
          {isPending ? tc("importing") : tc("applyImport")}
        </button>
      )}
    </div>
  );
}

interface ImportResultCardProps {
  importResult: ImportApplyActionResult;
}

function ImportResultCard({ importResult }: ImportResultCardProps) {
  const locale = useLocale();
  const ti = useTranslations("admin.data.importExport");

  if (!importResult.success) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">
          {getErrorLabel(importResult.errorCode, locale)}
        </p>
      </div>
    );
  }

  const result: BlogImportResult | undefined = importResult.data;
  if (!result) return null;

  // Atomic import: success = true means all succeeded, success = false means all rolled back
  return (
    <div
      className={`mt-3 p-3 border rounded-md ${
        result.success
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}>
      <h4 className="font-medium text-sm mb-2">
        {result.success ? ti("importComplete") : ti("importFailed")}
      </h4>

      {result.error && (
        <p className="text-red-800 text-xs mb-2">{result.error}</p>
      )}

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">{ti("categoriesLabel")}:</span>{" "}
          {result.categoriesImported}
        </p>
        <p>
          <span className="font-medium">{ti("postsLabel")}:</span>{" "}
          {result.postsImported}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Generic Preview/Import Result Cards (for JSON imports)
// =============================================================================

interface GenericPreviewResultCardProps {
  previewResult: GenericImportPreviewResult;
  onApply: () => void;
  isPending: boolean;
}

function GenericPreviewResultCard({
  previewResult,
  onApply,
  isPending,
}: GenericPreviewResultCardProps) {
  const locale = useLocale();
  const tc = useTranslations("admin.data.common");
  const ti = useTranslations("admin.data.importExport");

  if (!previewResult.success) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">
          {getErrorLabel(previewResult.errorCode, locale)}
        </p>
      </div>
    );
  }

  const preview = previewResult.data;
  if (!preview) return null;

  const hasErrors = preview.valid < preview.total;
  const canApply = preview.valid > 0;

  return (
    <div
      className={`mt-3 p-3 border rounded-md ${
        hasErrors
          ? "bg-amber-50 border-amber-200"
          : "bg-blue-50 border-blue-200"
      }`}>
      <h4 className="font-medium text-sm mb-2">{tc("preview")}</h4>

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">{ti("validCount")}:</span> {preview.valid}/
          {preview.total} {tc("items")}
        </p>
      </div>

      {/* Validation errors */}
      {preview.items.filter((i) => !i.valid).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer">
            {ti("validationErrors")} ({preview.items.filter((i) => !i.valid).length})
          </summary>
          <ul className="mt-1 text-xs text-red-600 max-h-24 overflow-y-auto">
            {preview.items
              .filter((i) => !i.valid)
              .map((item, idx) => (
                <li key={idx}>
                  <code>{item.slug}</code>:{" "}
                  {Object.values(item.errors ?? {}).join(", ")}
                </li>
              ))}
          </ul>
        </details>
      )}

      {canApply && (
        <button
          onClick={onApply}
          disabled={isPending}
          className="mt-3 w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
          {isPending ? tc("importing") : tc("applyImport")}
        </button>
      )}
    </div>
  );
}

interface GenericImportResultCardProps {
  importResult: GenericImportApplyResult;
}

function GenericImportResultCard({
  importResult,
}: GenericImportResultCardProps) {
  const locale = useLocale();
  const tc = useTranslations("admin.data.common");
  const ti = useTranslations("admin.data.importExport");

  if (!importResult.success) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">
          {getErrorLabel(importResult.errorCode, locale)}
        </p>
      </div>
    );
  }

  const data = importResult.data;
  if (!data) return null;

  const hasErrors = (data.errors?.length ?? 0) > 0;

  return (
    <div
      className={`mt-3 p-3 border rounded-md ${
        hasErrors
          ? "bg-amber-50 border-amber-200"
          : "bg-green-50 border-green-200"
      }`}>
      <h4 className="font-medium text-sm mb-2">
        {hasErrors ? ti("importCompletedWithErrors") : ti("importComplete")}
      </h4>

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">{ti("importedLabel")}:</span>{" "}
          {data.imported} {tc("items")}
        </p>
      </div>

      {hasErrors && (
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer">
            {ti("errorsLabel")} ({data.errors?.length})
          </summary>
          <ul className="mt-1 text-xs text-red-600 max-h-24 overflow-y-auto">
            {data.errors?.map((err, idx) => (
              <li key={idx}>
                <code>{err.slug}</code>: {err.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// =============================================================================
// Job History Section
// =============================================================================

interface JobHistorySectionProps {
  isOwner: boolean;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
}

function JobHistorySection({
  isOwner,
  isPending,
  startTransition,
}: JobHistorySectionProps) {
  const locale = useLocale();
  const tc = useTranslations("admin.data.common");
  const ti = useTranslations("admin.data.importExport");

  const [jobs, setJobs] = useState<ImportExportJobListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    const result = await listJobsAction({ limit: 20 });
    if (result.success) {
      setJobs(result.data ?? []);
    } else {
      setError(getErrorLabel(result.errorCode, locale));
    }
    setLoading(false);
  };

  const handleRedownload = async (jobId: string) => {
    startTransition(async () => {
      const result = await redownloadJobAction(jobId);
      if (result.success) {
        window.open(result.data.downloadUrl, "_blank");
      } else {
        alert(getErrorLabel(result.errorCode, locale));
      }
    });
  };

  const handleDelete = async (jobId: string) => {
    if (
      !confirm(
        ti("confirmDeleteJob")
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteJobAction(jobId);
      if (result.success) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        alert(getErrorLabel(result.errorCode, locale));
      }
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
        <h2 className="text-lg font-semibold text-gray-800">{ti("jobHistory")}</h2>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && jobs.length === 0) {
              loadJobs();
            }
          }}
          className="text-sm text-blue-600 hover:text-blue-800">
          {showHistory ? ti("hideJobHistory") : ti("showJobHistory")}
        </button>
      </div>

      {showHistory && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {loading ? (
            <div className="p-4 text-center text-gray-500">{tc("loading")}</div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {ti("noJobs")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {tc("status")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {tc("type")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {ti("entity")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {tc("format")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {ti("rows")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {ti("size")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {tc("date")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      {tc("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-2">
                        {job.kind === "export" ? tc("export") : tc("import")}
                      </td>
                      <td className="px-4 py-2">
                        {job.entity === "comments" ? tc("comments") : job.entity}
                      </td>
                      <td className="px-4 py-2 uppercase text-xs">
                        {job.format}
                      </td>
                      <td className="px-4 py-2">{job.row_count ?? "-"}</td>
                      <td className="px-4 py-2">
                        {job.size_bytes ? formatBytes(job.size_bytes) : "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          {job.status === "completed" &&
                            job.kind === "export" && (
                              <button
                                onClick={() => handleRedownload(job.id)}
                                disabled={isPending}
                                className="text-blue-600 hover:text-blue-800 text-xs disabled:opacity-50">
                                {tc("redownload")}
                              </button>
                            )}
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(job.id)}
                              disabled={isPending}
                              className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50">
                              {tc("delete")}
                            </button>
                          )}
                          {job.status === "failed" && job.error_message && (
                            <span
                              title={ti("jobFailedHint")}
                              className="text-red-500 cursor-help">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div className="p-2 border-t border-gray-100 text-center">
              <button
                onClick={loadJobs}
                disabled={isPending}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
                {tc("refresh")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Job status badge component */
function JobStatusBadge({ status }: { status: string }) {
  const tc = useTranslations("admin.data.common");

  const statusConfig: Record<string, { color: string; icon: string }> = {
    pending: { color: "bg-gray-100 text-gray-600", icon: "⏳" },
    processing: { color: "bg-blue-100 text-blue-600", icon: "🔄" },
    completed: { color: "bg-green-100 text-green-600", icon: "✓" },
    failed: { color: "bg-red-100 text-red-600", icon: "✗" },
  };

  const config = statusConfig[status] ?? statusConfig.pending;
  const label =
    status === "processing"
      ? tc("processing")
      : status === "completed"
        ? tc("completed")
        : status === "failed"
          ? tc("failed")
          : tc("pending");

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.icon} {label}
    </span>
  );
}

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
