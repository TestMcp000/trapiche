/**
 * FAQs Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Uses lib/modules/faq/admin-io.ts for IO operations
 *
 * @see lib/modules/faq/admin-io.ts - Data access layer
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { getTranslations, getMessages } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { getAllFAQsAdmin } from "./actions";
import FAQsListClient from "./components/FAQsListClient";

export default async function FAQsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;

  const t = await getTranslations({
    locale: routeLocale,
    namespace: "admin.faqs",
  });

  const allMessages = await getMessages({ locale: routeLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;

  const faqs = await getAllFAQsAdmin();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* FAQs List */}
      <FAQsListClient
        initialFaqs={faqs}
        routeLocale={routeLocale}
        messages={adminMessages}
      />
    </div>
  );
}
