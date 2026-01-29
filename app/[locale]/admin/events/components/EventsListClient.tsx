"use client";

/**
 * Events List Client Component
 *
 * Interactive list with create/edit/delete functionality for events.
 * Uses tabs to switch between Events and Event Types management.
 *
 * @see ../actions.ts - Server actions
 */

import { useState } from "react";
import Link from "next/link";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type {
  EventWithType,
  EventTypeWithCount,
  EventVisibility,
} from "@/lib/types/events";
import { getErrorLabel } from "@/lib/types/action-result";
import {
  deleteEventAction,
  createEventTypeAction,
  updateEventTypeAction,
  deleteEventTypeAction,
  toggleEventTypeVisibilityAction,
  reorderEventTypesAction,
} from "../actions";

interface EventsListClientProps {
  initialEvents: EventWithType[];
  eventTypes: EventTypeWithCount[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

export default function EventsListClient(props: EventsListClientProps) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <EventsListContent {...props} />
    </NextIntlClientProvider>
  );
}

type TabType = "events" | "types";

function EventsListContent({
  initialEvents,
  eventTypes: initialEventTypes,
  routeLocale,
}: EventsListClientProps) {
  const t = useTranslations("admin.events");
  const tCommon = useTranslations("admin.common");

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("events");

  // Events state
  const [events, setEvents] = useState(initialEvents);
  const [eventTypes, setEventTypes] = useState(initialEventTypes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [visibilityFilter, setVisibilityFilter] = useState<
    EventVisibility | ""
  >("");
  const [searchQuery, setSearchQuery] = useState("");

  // Event Types modal state
  const [editingType, setEditingType] = useState<EventTypeWithCount | null>(
    null,
  );
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [typeFormData, setTypeFormData] = useState({
    name_zh: "",
    slug: "",
    is_visible: true,
  });

  // Drag state for event types
  const [draggedTypeId, setDraggedTypeId] = useState<string | null>(null);

  // ==========================================================================
  // Filtered events
  // ==========================================================================

  const filteredEvents = events.filter((event) => {
    if (typeFilter && event.type_id !== typeFilter) return false;
    if (visibilityFilter && event.visibility !== visibilityFilter) return false;
    if (
      searchQuery &&
      !event.title_zh.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // ==========================================================================
  // Event handlers
  // ==========================================================================

  const handleDeleteEvent = async (event: EventWithType) => {
    if (!confirm(t("confirmDelete", { title: event.title_zh }))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await deleteEventAction(event.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Event Type handlers
  // ==========================================================================

  const openCreateTypeModal = () => {
    setTypeFormData({ name_zh: "", slug: "", is_visible: true });
    setIsCreatingType(true);
    setEditingType(null);
    setError(null);
  };

  const openEditTypeModal = (type: EventTypeWithCount) => {
    setTypeFormData({
      name_zh: type.name_zh,
      slug: type.slug,
      is_visible: type.is_visible,
    });
    setEditingType(type);
    setIsCreatingType(false);
    setError(null);
  };

  const closeTypeModal = () => {
    setEditingType(null);
    setIsCreatingType(false);
    setError(null);
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreatingType) {
        const result = await createEventTypeAction(typeFormData, routeLocale);
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setEventTypes((prev) => [
            ...prev,
            { ...result.data!, event_count: 0 },
          ]);
        }
      } else if (editingType) {
        const result = await updateEventTypeAction(
          editingType.id,
          typeFormData,
          routeLocale,
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
        if (result.data) {
          setEventTypes((prev) =>
            prev.map((t) =>
              t.id === editingType.id
                ? { ...result.data!, event_count: t.event_count }
                : t,
            ),
          );
        }
      }
      closeTypeModal();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (type: EventTypeWithCount) => {
    if (type.event_count > 0) {
      setError(t("types.cannotDeleteWithEvents"));
      return;
    }

    if (!confirm(t("types.confirmDelete", { name: type.name_zh }))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await deleteEventTypeAction(type.id, routeLocale);
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      setEventTypes((prev) => prev.filter((t) => t.id !== type.id));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTypeVisibility = async (type: EventTypeWithCount) => {
    setLoading(true);
    setError(null);

    try {
      const result = await toggleEventTypeVisibilityAction(
        type.id,
        !type.is_visible,
        routeLocale,
      );
      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }
      if (result.data) {
        setEventTypes((prev) =>
          prev.map((t) =>
            t.id === type.id
              ? { ...t, is_visible: result.data!.is_visible }
              : t,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Drag and drop for event types
  // ==========================================================================

  const handleTypeDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTypeId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTypeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleTypeDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTypeId || draggedTypeId === targetId) {
      setDraggedTypeId(null);
      return;
    }

    const draggedIndex = eventTypes.findIndex((t) => t.id === draggedTypeId);
    const targetIndex = eventTypes.findIndex((t) => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTypeId(null);
      return;
    }

    const newTypes = [...eventTypes];
    const [removed] = newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, removed);

    setEventTypes(newTypes);
    setDraggedTypeId(null);

    // Save new order
    const orderedIds = newTypes.map((t) => t.id);
    const result = await reorderEventTypesAction(orderedIds, routeLocale);
    if (!result.success) {
      setError(getErrorLabel(result.errorCode, routeLocale));
      // Revert on error
      setEventTypes(eventTypes);
    }
  };

  const handleTypeDragEnd = () => {
    setDraggedTypeId(null);
  };

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const getVisibilityBadge = (visibility: EventVisibility) => {
    switch (visibility) {
      case "public":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {t("visibility.public")}
          </span>
        );
      case "private":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            {t("visibility.private")}
          </span>
        );
      case "draft":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {t("visibility.draft")}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div>
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab("events")}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === "events"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}>
            {t("tabs.events")}
          </button>
          <button
            onClick={() => setActiveTab("types")}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === "types"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}>
            {t("tabs.types")}
          </button>
        </nav>
      </div>

      {/* Events Tab */}
      {activeTab === "events" && (
        <div>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Search */}
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="">{t("filters.allTypes")}</option>
              {eventTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name_zh}
                </option>
              ))}
            </select>

            {/* Visibility Filter */}
            <select
              value={visibilityFilter}
              onChange={(e) =>
                setVisibilityFilter(e.target.value as EventVisibility | "")
              }
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="">{t("filters.allVisibility")}</option>
              <option value="public">{t("visibility.public")}</option>
              <option value="private">{t("visibility.private")}</option>
              <option value="draft">{t("visibility.draft")}</option>
            </select>

            {/* New Event Button */}
            <Link
              href={`/${routeLocale}/admin/events/new`}
              className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              {t("newEvent")}
            </Link>
          </div>

          {/* Events Table */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                {t("noEvents")}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t("noEventsDesc")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t("table.title")}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t("table.type")}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t("table.startAt")}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t("table.visibility")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t("table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {event.title_zh}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          /{event.slug}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {event.event_type?.name_zh || "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(event.start_at)}
                      </td>
                      <td className="py-3 px-4">
                        {getVisibilityBadge(event.visibility)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/${routeLocale}/admin/events/${event.id}/edit`}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded">
                            {tCommon("edit")}
                          </Link>
                          <button
                            onClick={() => handleDeleteEvent(event)}
                            disabled={loading}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded disabled:opacity-50">
                            {tCommon("delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Event Types Tab */}
      {activeTab === "types" && (
        <div>
          {/* Toolbar */}
          <div className="flex justify-end mb-6">
            <button
              onClick={openCreateTypeModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              {t("types.add")}
            </button>
          </div>

          {/* Event Types List */}
          {eventTypes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                {t("types.noTypes")}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t("types.noTypesDesc")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventTypes.map((type) => (
                <div
                  key={type.id}
                  draggable
                  onDragStart={(e) => handleTypeDragStart(e, type.id)}
                  onDragOver={handleTypeDragOver}
                  onDrop={(e) => handleTypeDrop(e, type.id)}
                  onDragEnd={handleTypeDragEnd}
                  className={`flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move ${
                    draggedTypeId === type.id ? "opacity-50" : ""
                  }`}>
                  <div className="flex items-center gap-4">
                    {/* Drag handle */}
                    <div className="text-gray-400 dark:text-gray-500">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {type.name_zh}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        /{type.slug} · {type.event_count} {t("types.events")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Visibility toggle */}
                    <button
                      onClick={() => handleToggleTypeVisibility(type)}
                      disabled={loading}
                      className={`px-2 py-1 text-xs rounded ${
                        type.is_visible
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                      {type.is_visible ? t("types.visible") : t("types.hidden")}
                    </button>

                    <button
                      onClick={() => openEditTypeModal(type)}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded">
                      {tCommon("edit")}
                    </button>
                    <button
                      onClick={() => handleDeleteType(type)}
                      disabled={loading || type.event_count > 0}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded disabled:opacity-50">
                      {tCommon("delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event Type Create/Edit Modal */}
      {(isCreatingType || editingType) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isCreatingType ? t("types.createTitle") : t("types.editTitle")}
              </h3>
              <button
                onClick={closeTypeModal}
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleTypeSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("types.nameLabel")}
                </label>
                <input
                  type="text"
                  value={typeFormData.name_zh}
                  onChange={(e) =>
                    setTypeFormData((prev) => ({
                      ...prev,
                      name_zh: e.target.value,
                    }))
                  }
                  placeholder={t("types.namePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("types.slugLabel")}
                </label>
                <input
                  type="text"
                  value={typeFormData.slug}
                  onChange={(e) =>
                    setTypeFormData((prev) => ({
                      ...prev,
                      slug: e.target.value,
                    }))
                  }
                  placeholder={t("types.slugPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("types.slugHint")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_visible"
                  checked={typeFormData.is_visible}
                  onChange={(e) =>
                    setTypeFormData((prev) => ({
                      ...prev,
                      is_visible: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label
                  htmlFor="is_visible"
                  className="text-sm text-gray-700 dark:text-gray-300">
                  {t("types.visibleLabel")}
                </label>
              </div>

              {/* Modal error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeTypeModal}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                  {loading ? tCommon("saving") : tCommon("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
