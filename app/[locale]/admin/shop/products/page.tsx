import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getAdminLocale } from "@/lib/i18n/admin-locale.server";
import { getAllProducts } from "@/lib/modules/shop/admin-io";
import type { Locale } from "@/lib/i18n/locales";

function formatCurrency(cents: number): string {
  return `NT$ ${(cents / 100).toLocaleString()}`;
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: "admin" });

  const page = parseInt(filters.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const {
    items: products,
    total,
    hasMore,
  } = await getAllProducts({
    category: filters.category,
    search: filters.search,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);

  // Helper to get localized product name
  const getProductName = (product: (typeof products)[0], locale: Locale) => {
    return locale === "zh"
      ? product.nameZh || product.nameEn
      : product.nameEn || product.nameZh;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("shop.products.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("shop.products.totalProducts", { count: total })}
          </p>
        </div>
        <Link
          href={`/${locale}/admin/shop/products/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("shop.products.newProduct")}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <form className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("shop.products.category")}
            </label>
            <input
              type="text"
              name="category"
              placeholder={t("shop.products.categoryPlaceholder")}
              defaultValue={filters.category || ""}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("shop.products.search")}
            </label>
            <input
              type="text"
              name="search"
              placeholder={t("shop.products.searchPlaceholder")}
              defaultValue={filters.search || ""}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t("shop.products.filter")}
            </button>
          </div>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.products.product")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.products.category")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.products.priceRange")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.products.stock")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.products.status")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.products.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.length > 0 ? (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {product.coverImageUrl ? (
                          <Image
                            src={product.coverImageUrl}
                            alt=""
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-lg object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {getProductName(product, adminLocale)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {product.category || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      {product.minPriceCents === product.maxPriceCents
                        ? formatCurrency(product.minPriceCents)
                        : `${formatCurrency(
                            product.minPriceCents
                          )} - ${formatCurrency(product.maxPriceCents)}`}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-sm font-medium ${
                          product.totalStock <= 5
                            ? "text-red-600"
                            : "text-gray-900 dark:text-white"
                        }`}>
                        {product.totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          product.isVisible
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                        {product.isVisible
                          ? t("shop.products.visible")
                          : t("shop.products.hidden")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/${locale}/admin/shop/products/${product.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        {t("shop.products.edit")}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t("shop.products.noProducts")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("shop.products.pagination", { page, total: totalPages })}
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/${locale}/admin/shop/products?${new URLSearchParams({
                    ...filters,
                    page: String(page - 1),
                  }).toString()}`}
                  className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                  {t("shop.products.previous")}
                </Link>
              )}
              {hasMore && (
                <Link
                  href={`/${locale}/admin/shop/products?${new URLSearchParams({
                    ...filters,
                    page: String(page + 1),
                  }).toString()}`}
                  className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                  {t("shop.products.next")}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
