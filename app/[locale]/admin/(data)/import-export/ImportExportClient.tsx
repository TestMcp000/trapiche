"use client";

/**
 * Import/Export Client Component
 * @see doc/specs/completed/IMPORT_EXPORT.md
 * @see uiux_refactor.md §6.1.4 JSON Import UI (Gallery/Shop/Content)
 *
 * Client component for bulk data import/export UI.
 * Client only handles file selection/upload and displays results.
 * All parsing/validation happens server-side.
 */

import { useState, useTransition, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
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
  // Shop (job-tracked exports for history)
  exportProductsWithJob,
  exportCouponsWithJob,
  exportOrdersWithJob,
  exportMembersWithJob,
  previewProductsImportAction,
  applyProductsImportAction,
  previewCouponsImportAction,
  applyCouponsImportAction,
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
  | "products"
  | "coupons"
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
    products: { file: null, previewResult: null, importResult: null },
    coupons: { file: null, previewResult: null, importResult: null },
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
    products: "json",
    coupons: "json",
    orders: "json",
    members: "json",
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
    products: null,
    coupons: null,
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
      if (result.success && result.result?.success) {
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
              ? {
                  success: blogExportResult.success,
                  downloadUrl: blogExportResult.downloadUrl,
                  stats: blogExportResult.stats
                    ? {
                        count:
                          blogExportResult.stats.postsCount +
                          blogExportResult.stats.categoriesCount,
                        bundleSizeBytes: blogExportResult.stats.bundleSizeBytes,
                      }
                    : undefined,
                  error: blogExportResult.error,
                }
              : null
          }
          statsLabel={
            blogExportResult?.stats
              ? `${blogExportResult.stats.postsCount} ${ti("posts")}, ${
                  blogExportResult.stats.categoriesCount
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

      {/* Shop Section */}
      <SectionTitle>{ti("shop")}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <ExportCardWithFormat
          title={tc("products")}
          description={ti("productsDesc")}
          format={exportFormats.products}
          onFormatChange={(f) =>
            setExportFormats((prev) => ({ ...prev, products: f }))
          }
          onExport={() => {
            const format = exportFormats.products;
            startTransition(async () => {
              setExportResults((prev) => ({ ...prev, products: null }));
              const result = await exportProductsWithJob(format);
              setExportResults((prev) => ({ ...prev, products: result }));
            });
          }}
          isPending={isPending}
          result={exportResults.products ?? null}
          compact
        />
        <ExportCardWithFormat
          title="Coupons"
          description={ti("couponsDesc")}
          format={exportFormats.coupons}
          onFormatChange={(f) =>
            setExportFormats((prev) => ({ ...prev, coupons: f }))
          }
          onExport={() => {
            const format = exportFormats.coupons;
            startTransition(async () => {
              setExportResults((prev) => ({ ...prev, coupons: null }));
              const result = await exportCouponsWithJob(format);
              setExportResults((prev) => ({ ...prev, coupons: result }));
            });
          }}
          isPending={isPending}
          result={exportResults.coupons ?? null}
          compact
        />
        <ExportCardWithFormat
          title={tc("orders")}
          description={ti("ordersDesc")}
          format={exportFormats.orders}
          onFormatChange={(f) =>
            setExportFormats((prev) => ({ ...prev, orders: f }))
          }
          onExport={() => {
            const format = exportFormats.orders;
            startTransition(async () => {
              setExportResults((prev) => ({ ...prev, orders: null }));
              const result = await exportOrdersWithJob({ format });
              setExportResults((prev) => ({ ...prev, orders: result }));
            });
          }}
          isPending={isPending}
          result={exportResults.orders ?? null}
          compact
        />
        <ExportCardWithFormat
          title={tc("members")}
          description={ti("membersDesc")}
          format={exportFormats.members}
          onFormatChange={(f) =>
            setExportFormats((prev) => ({ ...prev, members: f }))
          }
          onExport={() => {
            const format = exportFormats.members;
            startTransition(async () => {
              setExportResults((prev) => ({ ...prev, members: null }));
              const result = await exportMembersWithJob({ format });
              setExportResults((prev) => ({ ...prev, members: result }));
            });
          }}
          isPending={isPending}
          result={exportResults.members ?? null}
          compact
        />
      </div>
      {/* Shop Import Cards (Products & Coupons only - Orders/Members are export-only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <JsonImportCard
          title={tc("products")}
          description={ti("productsImportDesc")}
          isOwner={isOwner}
          isPending={isPending}
          importKey="products"
          state={jsonImportStates.products}
          onFileChange={(file) => handleJsonFileChange("products", file)}
          onPreview={() =>
            handleJsonPreview("products", previewProductsImportAction)
          }
          onApply={() => handleJsonApply("products", applyProductsImportAction)}
          onClear={() => handleJsonClear("products")}
          setInputRef={(el) => {
            jsonFileInputRefs.current.products = el;
          }}
        />
        <JsonImportCard
          title={ti("couponsDesc").split(".")[0]}
          description={ti("couponsImportDesc")}
          isOwner={isOwner}
          isPending={isPending}
          importKey="coupons"
          state={jsonImportStates.coupons}
          onFileChange={(file) => handleJsonFileChange("coupons", file)}
          onPreview={() =>
            handleJsonPreview("coupons", previewCouponsImportAction)
          }
          onApply={() => handleJsonApply("coupons", applyCouponsImportAction)}
          onClear={() => handleJsonClear("coupons")}
          setInputRef={(el) => {
            jsonFileInputRefs.current.coupons = el;
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
              const result = await exportCommentsWithJob({ format });
              setExportResults((prev) => ({ ...prev, comments: result }));
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
        {isPending ? "Exporting..." : "Export"}
      </button>

      {result && (
        <div className="mt-3">
          {result.success ? (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-800 font-medium">Success!</p>
              {(statsLabel || result.stats) && (
                <p className="text-green-700 text-xs mt-1">
                  {statsLabel || `${result.stats?.count ?? 0} items`}
                  {result.stats?.bundleSizeBytes && (
                    <span className="text-green-600 ml-1">
                      ({(result.stats.bundleSizeBytes / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </p>
              )}
              {result.downloadUrl && (
                <a
                  href={result.downloadUrl}
                  download
                  className="inline-block mt-1 text-blue-600 hover:text-blue-800 underline text-xs">
                  Download
                </a>
              )}
            </div>
          ) : (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-xs">{result.error}</p>
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
        {isPending ? "Exporting..." : `Export ${format.toUpperCase()}`}
      </button>

      {result && (
        <div className="mt-3">
          {result.success ? (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-800 font-medium">Success!</p>
              {(statsLabel || result.stats) && (
                <p className="text-green-700 text-xs mt-1">
                  {statsLabel || `${result.stats?.count ?? 0} items`}
                  {result.stats?.bundleSizeBytes && (
                    <span className="text-green-600 ml-1">
                      ({(result.stats.bundleSizeBytes / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </p>
              )}
              {result.downloadUrl && (
                <a
                  href={result.downloadUrl}
                  download
                  className="inline-block mt-1 text-blue-600 hover:text-blue-800 underline text-xs">
                  Download
                </a>
              )}
            </div>
          ) : (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-xs">{result.error}</p>
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
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-medium">Import {title}</h3>
      <p className="text-gray-500 text-sm mt-2 mb-3">{description}</p>

      {!isOwner ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 italic text-sm">
            Import is restricted to owners only.
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
              {isPending ? "Validating..." : "Preview"}
            </button>
            <button
              onClick={onClear}
              disabled={isPending}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm">
              Clear
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
// JSON Import Card (for Gallery/Shop/Content)
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files?.[0] ?? null);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-medium">Import {title}</h3>
      <p className="text-gray-500 text-sm mt-2 mb-3">{description}</p>

      {!isOwner ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 italic text-sm">
            Import is restricted to owners only.
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
              {isPending ? "Validating..." : "Preview"}
            </button>
            <button
              onClick={onClear}
              disabled={isPending}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm">
              Clear
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
  if (!previewResult.success) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">{previewResult.error}</p>
      </div>
    );
  }

  const preview: BlogImportPreview | undefined = previewResult.preview;
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
        {hasErrors ? "Validation Failed" : "Preview"}
      </h4>

      {preview.error && (
        <p className="text-red-800 text-xs mb-2">{preview.error}</p>
      )}

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">Categories:</span>{" "}
          {preview.categories.valid}/{preview.categories.total} valid
        </p>
        <p>
          <span className="font-medium">Posts:</span> {preview.posts.valid}/
          {preview.posts.total} valid
        </p>
        {preview.missingCategories.length > 0 && (
          <p className="text-amber-700">
            <span className="font-medium">Missing:</span>{" "}
            {preview.missingCategories.join(", ")}
          </p>
        )}
      </div>

      {/* Validation errors */}
      {preview.categories.items.filter((i) => !i.valid).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer">
            Category errors (
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
            Post errors ({preview.posts.items.filter((i) => !i.valid).length})
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
          {isPending ? "Importing..." : "Apply Import"}
        </button>
      )}
    </div>
  );
}

interface ImportResultCardProps {
  importResult: ImportApplyActionResult;
}

function ImportResultCard({ importResult }: ImportResultCardProps) {
  if (!importResult.success) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">{importResult.error}</p>
      </div>
    );
  }

  const result: BlogImportResult | undefined = importResult.result;
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
        {result.success ? "Import Complete!" : "Import Failed"}
      </h4>

      {result.error && (
        <p className="text-red-800 text-xs mb-2">{result.error}</p>
      )}

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">Categories:</span>{" "}
          {result.categoriesImported}
        </p>
        <p>
          <span className="font-medium">Posts:</span> {result.postsImported}
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
  if (!previewResult.success) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">{previewResult.error}</p>
      </div>
    );
  }

  const preview = previewResult.preview;
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
      <h4 className="font-medium text-sm mb-2">Preview</h4>

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">Valid:</span> {preview.valid}/
          {preview.total} items
        </p>
      </div>

      {/* Validation errors */}
      {preview.items.filter((i) => !i.valid).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer">
            Validation errors ({preview.items.filter((i) => !i.valid).length})
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
          {isPending ? "Importing..." : "Apply Import"}
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
  if (!importResult.success && !importResult.imported) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">{importResult.error}</p>
      </div>
    );
  }

  const hasErrors = (importResult.errors?.length ?? 0) > 0;

  return (
    <div
      className={`mt-3 p-3 border rounded-md ${
        hasErrors
          ? "bg-amber-50 border-amber-200"
          : "bg-green-50 border-green-200"
      }`}>
      <h4 className="font-medium text-sm mb-2">
        {hasErrors ? "Import Completed with Errors" : "Import Complete!"}
      </h4>

      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">Imported:</span>{" "}
          {importResult.imported ?? 0} items
        </p>
      </div>

      {hasErrors && (
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer">
            Errors ({importResult.errors?.length})
          </summary>
          <ul className="mt-1 text-xs text-red-600 max-h-24 overflow-y-auto">
            {importResult.errors?.map((err, idx) => (
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
  const [jobs, setJobs] = useState<ImportExportJobListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    const result = await listJobsAction({ limit: 20 });
    if (result.success) {
      setJobs(result.jobs ?? []);
    } else {
      setError(result.error ?? "Failed to load jobs");
    }
    setLoading(false);
  };

  const handleRedownload = async (jobId: string) => {
    startTransition(async () => {
      const result = await redownloadJobAction(jobId);
      if (result.success && result.downloadUrl) {
        window.open(result.downloadUrl, "_blank");
      } else {
        alert(result.error ?? "Failed to generate download URL");
      }
    });
  };

  const handleDelete = async (jobId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this job? The associated file will also be deleted."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteJobAction(jobId);
      if (result.success) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        alert(result.error ?? "Failed to delete job");
      }
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
        <h2 className="text-lg font-semibold text-gray-800">Job History</h2>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && jobs.length === 0) {
              loadJobs();
            }
          }}
          className="text-sm text-blue-600 hover:text-blue-800">
          {showHistory ? "Hide" : "Show History"}
        </button>
      </div>

      {showHistory && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No jobs in history
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Entity
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Format
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Rows
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Size
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-2 capitalize">{job.kind}</td>
                      <td className="px-4 py-2 capitalize">{job.entity}</td>
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
                                Re-download
                              </button>
                            )}
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(job.id)}
                              disabled={isPending}
                              className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50">
                              Delete
                            </button>
                          )}
                          {job.status === "failed" && job.error_message && (
                            <span
                              title={job.error_message}
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
                Refresh
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
  const statusConfig: Record<string, { color: string; icon: string }> = {
    pending: { color: "bg-gray-100 text-gray-600", icon: "⏳" },
    processing: { color: "bg-blue-100 text-blue-600", icon: "🔄" },
    completed: { color: "bg-green-100 text-green-600", icon: "✓" },
    failed: { color: "bg-red-100 text-red-600", icon: "✗" },
  };

  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.icon} {status}
    </span>
  );
}

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
