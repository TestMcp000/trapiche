import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAdminLocale } from "@/lib/i18n/admin-locale.server";
import { getCustomerList } from "@/lib/modules/shop/admin-io";
import type { Locale } from "@/lib/i18n/locales";

function formatCurrency(cents: number): string {
  return `NT$ ${(cents / 100).toLocaleString()}`;
}

function formatDate(dateStr: string | null, adminLocale: Locale): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString(
    adminLocale === "zh" ? "zh-TW" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

export default async function MembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const adminLocale = await getAdminLocale();
  const t = await getTranslations({ locale: adminLocale, namespace: "admin" });
  const customers = await getCustomerList();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("shop.members.title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t("shop.members.totalCount", { count: customers.length })}{" "}
          {t("shop.members.v1Note")}
        </p>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.members.table.memberId")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.members.table.email")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.members.table.orders")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.members.table.totalSpent")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.members.table.firstOrder")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.members.table.lastOrder")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.members.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <tr
                    key={customer.userId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {customer.userId.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {customer.email || t("shop.members.emailV2")}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {customer.orderCount}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-green-600">
                      {formatCurrency(customer.ltvCents)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(customer.firstOrderAt, adminLocale)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(customer.lastOrderAt, adminLocale)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/${locale}/admin/users/${customer.userId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        {t("shop.members.details")}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t("shop.members.noMembers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
