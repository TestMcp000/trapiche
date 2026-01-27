"use client";

/**
 * Contact Messages List Client Component
 *
 * Interactive list with read/archive/delete functionality for contact messages.
 *
 * @see ../actions.ts - Server actions
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { ContactMessageListItem } from "@/lib/types/contact";
import { getErrorLabel } from "@/lib/types/action-result";
import {
  markAsReadAction,
  markAsUnreadAction,
  archiveMessageAction,
  unarchiveMessageAction,
  deleteMessageAction,
} from "../actions";

interface ContactMessagesListClientProps {
  initialMessages: ContactMessageListItem[];
  totalCount: number;
  unreadCount: number;
  showArchived: boolean;
  routeLocale: string;
  messages: AbstractIntlMessages;
}

export default function ContactMessagesListClient(
  props: ContactMessagesListClientProps,
) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <ContactMessagesListContent {...props} />
    </NextIntlClientProvider>
  );
}

function ContactMessagesListContent({
  initialMessages,
  totalCount: _totalCount,
  unreadCount: initialUnreadCount,
  showArchived,
  routeLocale,
}: ContactMessagesListClientProps) {
  const router = useRouter();
  const t = useTranslations("admin.contactMessages");
  const tCommon = useTranslations("admin.common");

  // State
  const [messages, setMessages] = useState(initialMessages);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const toggleExpand = async (message: ContactMessageListItem) => {
    if (expandedId === message.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(message.id);

    // Mark as read when expanding
    if (!message.is_read) {
      const result = await markAsReadAction(message.id, routeLocale);
      if (result.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleMarkAsUnread = async (message: ContactMessageListItem) => {
    setLoading(true);
    setError(null);

    try {
      const result = await markAsUnreadAction(message.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, is_read: false } : m)),
      );
      setUnreadCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (message: ContactMessageListItem) => {
    setLoading(true);
    setError(null);

    try {
      const result = await archiveMessageAction(message.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      if (!message.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (message: ContactMessageListItem) => {
    setLoading(true);
    setError(null);

    try {
      const result = await unarchiveMessageAction(message.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (message: ContactMessageListItem) => {
    if (!confirm(t("confirmDelete"))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await deleteMessageAction(message.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      if (!message.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleShowArchived = () => {
    const newShowArchived = !showArchived;
    router.push(
      `/${routeLocale}/admin/contact-messages${newShowArchived ? "?archived=true" : ""}`,
    );
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-full">
              {t("unreadBadge", { count: unreadCount })}
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={toggleShowArchived}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          {t("showArchived")}
        </label>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {showArchived ? t("emptyArchived") : t("empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${
                !message.is_read ? "border-l-4 border-l-blue-500" : ""
              } ${message.is_archived ? "opacity-60" : ""}`}>
              {/* Header (clickable) */}
              <button
                onClick={() => toggleExpand(message)}
                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!message.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {message.name}
                      </span>
                      <span className="text-gray-400">
                        &lt;{message.email}&gt;
                      </span>
                    </div>
                    {message.subject && (
                      <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {message.subject}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {message.message}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(message.created_at)}
                    </p>
                    <svg
                      className={`w-5 h-5 mt-2 text-gray-400 transition-transform ${
                        expandedId === message.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedId === message.id && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                  {/* Full Message */}
                  <div className="pt-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {message.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <a
                      href={`mailto:${message.email}?subject=Re: ${message.subject || t("replySubject")}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                        />
                      </svg>
                      {t("reply")}
                    </a>
                    {message.is_read ? (
                      <button
                        onClick={() => handleMarkAsUnread(message)}
                        disabled={loading}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50">
                        {t("markAsUnread")}
                      </button>
                    ) : null}
                    {message.is_archived ? (
                      <button
                        onClick={() => handleUnarchive(message)}
                        disabled={loading}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50">
                        {t("unarchive")}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(message)}
                        disabled={loading}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50">
                        {t("archive")}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(message)}
                      disabled={loading}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
                      {tCommon("delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
