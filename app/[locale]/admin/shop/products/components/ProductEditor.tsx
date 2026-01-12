"use client";

/**
 * Product Editor Component
 *
 * Features:
 * - Bilingual product editing
 * - Variants management
 * - Image upload
 * - SEO fields
 *
 * @see ../actions.ts - Server actions (route-local)
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import ProductVariantEditor from "@/components/admin/shop/ProductVariantEditor";
import ImageUploader from "@/components/admin/common/ImageUploader";
import { generateSlug } from "@/lib/utils/slug";
import type { ProductVariantRow } from "@/lib/types/shop";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
  type VariantInput,
} from "../actions";

interface ProductEditorProps {
  routeLocale: string;
  mode: "new" | "edit";
  initialData?: {
    id: string;
    slug: string;
    nameEn: string | null;
    nameZh: string | null;
    descriptionShortEn: string | null;
    descriptionShortZh: string | null;
    descriptionFullEn: string | null;
    descriptionFullZh: string | null;
    category: string | null;
    tagsEn: string[];
    tagsZh: string[];
    coverImageUrl: string | null;
    mediaUrls: string[];
    seoTitleEn: string | null;
    seoTitleZh: string | null;
    seoDescriptionEn: string | null;
    seoDescriptionZh: string | null;
    isVisible: boolean;
    sortOrder: number;
    variants: ProductVariantRow[];
  };
}

export default function ProductEditor({
  routeLocale,
  mode,
  initialData,
}: ProductEditorProps) {
  const t = useTranslations("admin");
  const adminLocale = useLocale();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [nameEn, setNameEn] = useState(initialData?.nameEn || "");
  const [nameZh, setNameZh] = useState(initialData?.nameZh || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [descriptionShortEn, setDescriptionShortEn] = useState(
    initialData?.descriptionShortEn || ""
  );
  const [descriptionShortZh, setDescriptionShortZh] = useState(
    initialData?.descriptionShortZh || ""
  );
  const [descriptionFullEn, setDescriptionFullEn] = useState(
    initialData?.descriptionFullEn || ""
  );
  const [descriptionFullZh, setDescriptionFullZh] = useState(
    initialData?.descriptionFullZh || ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [tagsEn, setTagsEn] = useState(initialData?.tagsEn?.join(", ") || "");
  const [tagsZh, setTagsZh] = useState(initialData?.tagsZh?.join(", ") || "");
  const [isVisible, setIsVisible] = useState(initialData?.isVisible ?? true);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);

  // Media
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialData?.coverImageUrl || ""
  );
  const [mediaUrls, setMediaUrls] = useState<string[]>(
    initialData?.mediaUrls || []
  );

  // SEO
  const [seoTitleEn, setSeoTitleEn] = useState(initialData?.seoTitleEn || "");
  const [seoTitleZh, setSeoTitleZh] = useState(initialData?.seoTitleZh || "");
  const [seoDescriptionEn, setSeoDescriptionEn] = useState(
    initialData?.seoDescriptionEn || ""
  );
  const [seoDescriptionZh, setSeoDescriptionZh] = useState(
    initialData?.seoDescriptionZh || ""
  );

  // Variants
  const [variants, setVariants] = useState<ProductVariantRow[]>(
    initialData?.variants || []
  );

  const handleGenerateSlug = useCallback(() => {
    const source = nameEn || nameZh || "";
    if (source) {
      setSlug(generateSlug(source));
    }
  }, [nameEn, nameZh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const productInput: ProductInput = {
      slug: slug || undefined,
      nameEn: nameEn || null,
      nameZh: nameZh || null,
      descriptionShortEn: descriptionShortEn || null,
      descriptionShortZh: descriptionShortZh || null,
      descriptionFullEn: descriptionFullEn || null,
      descriptionFullZh: descriptionFullZh || null,
      category,
      tagsEn: tagsEn
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      tagsZh: tagsZh
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      coverImageUrl: coverImageUrl || null,
      mediaUrls,
      seoTitleEn: seoTitleEn || null,
      seoTitleZh: seoTitleZh || null,
      seoDescriptionEn: seoDescriptionEn || null,
      seoDescriptionZh: seoDescriptionZh || null,
      isVisible,
      sortOrder,
    };

    const variantInputs: VariantInput[] = variants.map((v) => ({
      variantKey: v.variant_key,
      optionValuesJson: v.option_values_json,
      sku: v.sku,
      priceCents: v.price_cents,
      compareAtPriceCents: v.compare_at_price_cents,
      stock: v.stock,
      isEnabled: v.is_enabled,
    }));

    try {
      const result =
        mode === "new"
          ? await createProduct(productInput, variantInputs)
          : await updateProduct(initialData!.id, productInput, variantInputs);

      if (result.success) {
        router.push(`/${routeLocale}/admin/shop/products`);
        router.refresh();
      } else {
        setError(result.error || "Failed to save product");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    const confirmed = window.confirm(t("shop.productForm.confirmDelete"));

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const result = await deleteProduct(initialData.id);
      if (result.success) {
        router.push(`/${routeLocale}/admin/shop/products`);
        router.refresh();
      } else {
        setError(result.error || "Failed to delete product");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("shop.productForm.basicInfo")}
          </h2>
        </div>
        <div className="p-6 grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.nameEn")}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.nameZh")}
              </label>
              <input
                type="text"
                value={nameZh}
                onChange={(e) => setNameZh(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL Slug
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="product-url-slug"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                {t("shop.productForm.generate")}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("shop.productForm.categoryLabel")} *
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              placeholder={t("shop.productForm.categoryPlaceholder")}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("shop.productForm.categoryHint")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.descriptionShortEn")}
              </label>
              <textarea
                rows={2}
                value={descriptionShortEn}
                onChange={(e) => setDescriptionShortEn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.descriptionShortZh")}
              </label>
              <textarea
                rows={2}
                value={descriptionShortZh}
                onChange={(e) => setDescriptionShortZh(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.descriptionFullEn")}
              </label>
              <textarea
                rows={4}
                value={descriptionFullEn}
                onChange={(e) => setDescriptionFullEn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.descriptionFullZh")}
              </label>
              <textarea
                rows={4}
                value={descriptionFullZh}
                onChange={(e) => setDescriptionFullZh(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.tagsEn")}
              </label>
              <input
                type="text"
                value={tagsEn}
                onChange={(e) => setTagsEn(e.target.value)}
                placeholder={t("shop.productForm.tagsPlaceholder")}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.productForm.tagsZh")}
              </label>
              <input
                type="text"
                value={tagsZh}
                onChange={(e) => setTagsZh(e.target.value)}
                placeholder={t("shop.productForm.tagsPlaceholder")}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-900 dark:text-white">
                {t("shop.productForm.visible")}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                {t("shop.productForm.sortOrder")}
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("shop.productForm.media")}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("shop.productForm.coverImage")}
            </label>
            <ImageUploader
              value={coverImageUrl}
              onChange={(url) => setCoverImageUrl(url)}
              locale={adminLocale}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("shop.productForm.galleryUrls")}
            </label>
            <textarea
              rows={4}
              value={mediaUrls.join("\n")}
              onChange={(e) =>
                setMediaUrls(e.target.value.split("\n").filter(Boolean))
              }
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("shop.productForm.variants")}
          </h2>
        </div>
        <div className="p-6">
          <ProductVariantEditor
            initialVariants={variants}
            onChange={setVariants}
            locale={adminLocale}
          />
        </div>
      </div>

      {/* SEO */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            SEO
          </h2>
        </div>
        <div className="p-6 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meta Title (EN)
              </label>
              <input
                type="text"
                value={seoTitleEn}
                onChange={(e) => setSeoTitleEn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meta Title (ZH)
              </label>
              <input
                type="text"
                value={seoTitleZh}
                onChange={(e) => setSeoTitleZh(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meta Description (EN)
              </label>
              <textarea
                rows={2}
                value={seoDescriptionEn}
                onChange={(e) => setSeoDescriptionEn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meta Description (ZH)
              </label>
              <textarea
                rows={2}
                value={seoDescriptionZh}
                onChange={(e) => setSeoDescriptionZh(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-4 py-2 text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors">
              {t("shop.productForm.delete")}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {t("shop.productForm.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isSubmitting
              ? t("shop.productForm.saving")
              : t("shop.productForm.save")}
          </button>
        </div>
      </div>
    </form>
  );
}
