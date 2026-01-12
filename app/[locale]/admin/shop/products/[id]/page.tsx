import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import {
  getAdminLocale,
  getAdminMessages,
} from "@/lib/i18n/admin-locale.server";
import { getProductById } from "@/lib/modules/shop/admin-io";
import ProductEditor from "../components/ProductEditor";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: "admin" });
  const messages = await getAdminMessages(adminLocale);
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const initialData = {
    id: product.id,
    slug: product.slug,
    nameEn: product.nameEn,
    nameZh: product.nameZh,
    descriptionShortEn: product.descriptionShortEn,
    descriptionShortZh: product.descriptionShortZh,
    descriptionFullEn: product.descriptionFullEn,
    descriptionFullZh: product.descriptionFullZh,
    category: product.category,
    tagsEn: product.tagsEn,
    tagsZh: product.tagsZh,
    coverImageUrl: product.coverImageUrl,
    mediaUrls: product.mediaUrls,
    seoTitleEn: product.seoTitleEn,
    seoTitleZh: product.seoTitleZh,
    seoDescriptionEn: product.seoDescriptionEn,
    seoDescriptionZh: product.seoDescriptionZh,
    isVisible: product.isVisible,
    sortOrder: 0, // Not in ProductDetail, default to 0
    variants: product.variants,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-2">
        <Link
          href={`/${locale}/admin/shop/products`}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("shop.products.editProduct")}
        </h1>
      </div>

      <NextIntlClientProvider locale={adminLocale} messages={messages}>
        <ProductEditor
          mode="edit"
          initialData={initialData}
          routeLocale={locale}
        />
      </NextIntlClientProvider>
    </div>
  );
}
