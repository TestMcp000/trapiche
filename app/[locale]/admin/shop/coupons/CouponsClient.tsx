"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { CouponRow } from "@/lib/types/shop";
import CouponDialog from "./CouponDialog";

interface CouponsClientProps {
  coupons: CouponRow[];
  routeLocale: string;
}

function formatCurrency(cents: number): string {
  return `NT$ ${(cents / 100).toLocaleString()}`;
}

function formatDate(dateStr: string | null, adminLocale: string): string {
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

export default function CouponsClient({
  coupons,
  routeLocale: _routeLocale,
}: CouponsClientProps) {
  const t = useTranslations("admin");
  const adminLocale = useLocale();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<CouponRow | null>(null);

  const handleNew = () => {
    setEditCoupon(null);
    setDialogOpen(true);
  };

  const handleEdit = (coupon: CouponRow) => {
    setEditCoupon(coupon);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditCoupon(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("shop.coupons.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("shop.coupons.totalCount", { count: coupons.length })}
          </p>
        </div>
        <button
          onClick={handleNew}
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
          {t("shop.coupons.newCoupon")}
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.code")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.type")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.discount")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.minOrder")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.usage")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.validUntil")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.status")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.coupons.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {coupons.length > 0 ? (
                coupons.map((coupon) => {
                  const isExpired =
                    coupon.expires_at &&
                    new Date(coupon.expires_at) < new Date();
                  const isMaxedOut =
                    coupon.max_usage_count &&
                    coupon.current_usage_count >= coupon.max_usage_count;
                  const isActive =
                    coupon.is_active && !isExpired && !isMaxedOut;

                  return (
                    <tr
                      key={coupon.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {t(`shop.coupons.types.${coupon.type}`)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {coupon.type === "amount"
                          ? formatCurrency(coupon.value)
                          : `${coupon.value}%`}
                        {coupon.type === "percentage" &&
                          coupon.max_discount_cents && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                              ({t("shop.coupons.maxDiscount")}{" "}
                              {formatCurrency(coupon.max_discount_cents)})
                            </span>
                          )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {coupon.min_subtotal_cents
                          ? formatCurrency(coupon.min_subtotal_cents)
                          : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {coupon.current_usage_count}
                        {coupon.max_usage_count && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {" / "}
                            {coupon.max_usage_count}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(coupon.expires_at, adminLocale)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                            isActive
                              ? "bg-green-100 text-green-700"
                              : isExpired
                              ? "bg-red-100 text-red-700"
                              : isMaxedOut
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                          {isActive
                            ? t("shop.coupons.status.active")
                            : isExpired
                            ? t("shop.coupons.status.expired")
                            : isMaxedOut
                            ? t("shop.coupons.status.maxedOut")
                            : t("shop.coupons.status.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          {t("shop.coupons.edit")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t("shop.coupons.noCoupons")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CouponDialog
        isOpen={dialogOpen}
        onClose={handleClose}
        editCoupon={editCoupon}
      />
    </div>
  );
}
