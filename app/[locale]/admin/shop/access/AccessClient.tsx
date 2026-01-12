"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { ShopAdminRow } from "./actions";
import { addShopAdmin, updateAdminRole, removeShopAdmin } from "./actions";

interface AccessClientProps {
  admins: ShopAdminRow[];
  currentUserEmail: string;
  routeLocale: string;
}

function formatDate(dateStr: string, adminLocale: string): string {
  return new Date(dateStr).toLocaleDateString(
    adminLocale === "zh" ? "zh-TW" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 border-purple-200",
  editor: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function AccessClient({
  admins,
  currentUserEmail,
  routeLocale: _routeLocale,
}: AccessClientProps) {
  const t = useTranslations("admin");
  const adminLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"owner" | "editor">("editor");

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) {
      setError(t("shop.access.dialog.emailRequired"));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await addShopAdmin(newEmail.trim(), newRole);
      if (result.success) {
        setShowAddDialog(false);
        setNewEmail("");
        setNewRole("editor");
        router.refresh();
      } else {
        setError(result.error || "Failed to add admin");
      }
    });
  };

  const handleUpdateRole = async (
    adminId: string,
    newRole: "owner" | "editor"
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await updateAdminRole(adminId, newRole);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to update role");
      }
    });
  };

  const handleRemoveAdmin = async (adminId: string, email: string) => {
    const confirmed = window.confirm(t("shop.access.confirmRemove", { email }));
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await removeShopAdmin(adminId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to remove admin");
      }
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("shop.access.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("shop.access.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
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
          {t("shop.access.addAdmin")}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Role Explanation */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
          {t("shop.access.rolePermissions")}
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>
            <strong>Owner</strong>: {t("shop.access.ownerDesc")}
          </li>
          <li>
            <strong>Editor</strong>: {t("shop.access.editorDesc")}
          </li>
        </ul>
      </div>

      {/* Re-login Notice */}
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>⚠️ {t("shop.access.reLoginNote")}:</strong>{" "}
          {t("shop.access.reLoginNotice")}
        </p>
      </div>

      {/* Admins Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.access.table.email")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.access.table.role")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.access.table.added")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("shop.access.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {admins.length > 0 ? (
                admins.map((admin) => {
                  const isSelf = admin.email === currentUserEmail.toLowerCase();
                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {admin.email}
                          </span>
                          {isSelf && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                              {t("shop.access.you")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={admin.role || "editor"}
                          onChange={(e) =>
                            handleUpdateRole(
                              admin.id,
                              e.target.value as "owner" | "editor"
                            )
                          }
                          disabled={isPending || isSelf}
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${
                            ROLE_COLORS[admin.role || "editor"]
                          } cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}>
                          <option value="owner">
                            {t("shop.access.roles.owner")}
                          </option>
                          <option value="editor">
                            {t("shop.access.roles.editor")}
                          </option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(admin.created_at, adminLocale)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() =>
                              handleRemoveAdmin(admin.id, admin.email)
                            }
                            disabled={isPending}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50">
                            {t("shop.access.remove")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t("shop.access.noAdmins")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t("shop.access.dialog.title")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("shop.access.dialog.roleLabel")}
                </label>
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as "owner" | "editor")
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="editor">
                    {t("shop.access.dialog.editorOption")}
                  </option>
                  <option value="owner">
                    {t("shop.access.dialog.ownerOption")}
                  </option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewEmail("");
                  setNewRole("editor");
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {t("shop.access.dialog.cancel")}
              </button>
              <button
                onClick={handleAddAdmin}
                disabled={isPending || !newEmail.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {isPending
                  ? t("shop.access.dialog.adding")
                  : t("shop.access.dialog.add")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
