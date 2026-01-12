"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CouponRow, CouponType } from "@/lib/types/shop";
import { createCoupon, updateCoupon, type CouponInput } from "./actions";

interface CouponDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editCoupon?: CouponRow | null;
}

export default function CouponDialog({
  isOpen,
  onClose,
  editCoupon,
}: CouponDialogProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState(editCoupon?.code || "");
  const [type, setType] = useState<CouponType>(editCoupon?.type || "amount");
  const [value, setValue] = useState(editCoupon?.value || 0);
  const [minSubtotalCents, setMinSubtotalCents] = useState(
    editCoupon?.min_subtotal_cents || null
  );
  const [maxDiscountCents, setMaxDiscountCents] = useState(
    editCoupon?.max_discount_cents || null
  );
  const [maxUsageCount, setMaxUsageCount] = useState(
    editCoupon?.max_usage_count || null
  );
  const [expiresAt, setExpiresAt] = useState(
    editCoupon?.expires_at?.slice(0, 10) || ""
  );
  const [isActive, setIsActive] = useState(editCoupon?.is_active ?? true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const input: CouponInput = {
      code,
      type,
      value: type === "amount" ? Math.round(value * 100) : value, // Convert to cents for amount
      minSubtotalCents: minSubtotalCents
        ? Math.round(minSubtotalCents * 100)
        : null,
      maxDiscountCents: maxDiscountCents
        ? Math.round(maxDiscountCents * 100)
        : null,
      maxUsageCount,
      startsAt: null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      isActive,
    };

    startTransition(async () => {
      const result = editCoupon
        ? await updateCoupon(editCoupon.id, input)
        : await createCoupon(input);

      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || "Failed to save coupon");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editCoupon
              ? t("shop.coupons.dialog.editTitle")
              : t("shop.coupons.dialog.newTitle")}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("shop.coupons.dialog.codeLabel")} *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="VIP888"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.coupons.dialog.typeLabel")}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CouponType)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="amount">
                  {t("shop.coupons.dialog.typeAmount")}
                </option>
                <option value="percentage">
                  {t("shop.coupons.dialog.typePercentage")}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {type === "amount"
                  ? t("shop.coupons.dialog.amountLabel")
                  : t("shop.coupons.dialog.percentageLabel")}
              </label>
              <input
                type="number"
                value={type === "amount" ? value / 100 : value}
                onChange={(e) =>
                  setValue(
                    type === "amount"
                      ? parseFloat(e.target.value) * 100
                      : parseFloat(e.target.value)
                  )
                }
                min={0}
                max={type === "percentage" ? 100 : undefined}
                step={type === "amount" ? 1 : 1}
                required
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.coupons.dialog.minOrderLabel")}
              </label>
              <input
                type="number"
                value={minSubtotalCents ? minSubtotalCents / 100 : ""}
                onChange={(e) =>
                  setMinSubtotalCents(
                    e.target.value ? parseFloat(e.target.value) * 100 : null
                  )
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            {type === "percentage" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("shop.coupons.dialog.maxDiscountLabel")}
                </label>
                <input
                  type="number"
                  value={maxDiscountCents ? maxDiscountCents / 100 : ""}
                  onChange={(e) =>
                    setMaxDiscountCents(
                      e.target.value ? parseFloat(e.target.value) * 100 : null
                    )
                  }
                  min={0}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.coupons.dialog.maxUsageLabel")}
              </label>
              <input
                type="number"
                value={maxUsageCount || ""}
                onChange={(e) =>
                  setMaxUsageCount(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                min={1}
                placeholder={t("shop.coupons.dialog.maxUsagePlaceholder")}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("shop.coupons.dialog.expiresLabel")}
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-900 dark:text-white">
              {t("shop.coupons.dialog.activeLabel")}
            </span>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {t("shop.coupons.dialog.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isPending
                ? t("shop.coupons.dialog.saving")
                : t("shop.coupons.dialog.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
