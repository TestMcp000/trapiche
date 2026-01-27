"use client";

/**
 * Event Form Client Component
 *
 * Form for creating and editing events.
 * Handles all form state and validation.
 *
 * @see ../actions.ts - Server actions
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  createEventAction,
  updateEventAction,
  type EventActionInput,
} from "../actions";

interface EventFormClientProps {
  event?: EventWithType;
  eventTypes: EventTypeWithCount[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

export default function EventFormClient(props: EventFormClientProps) {
  return (
    <NextIntlClientProvider
      locale={props.routeLocale}
      messages={props.messages}>
      <EventFormContent {...props} />
    </NextIntlClientProvider>
  );
}

function EventFormContent({
  event,
  eventTypes,
  routeLocale,
}: EventFormClientProps) {
  const router = useRouter();
  const t = useTranslations("admin.events");
  const tCommon = useTranslations("admin.common");

  const isEditing = !!event;

  // Form state
  const [formData, setFormData] = useState<EventActionInput>({
    type_id: event?.type_id ?? null,
    slug: event?.slug ?? "",
    title_zh: event?.title_zh ?? "",
    excerpt_zh: event?.excerpt_zh ?? "",
    content_md_zh: event?.content_md_zh ?? "",
    cover_image_url: event?.cover_image_url ?? "",
    cover_image_alt_zh: event?.cover_image_alt_zh ?? "",
    start_at: event?.start_at ? formatDateTimeLocal(event.start_at) : "",
    end_at: event?.end_at ? formatDateTimeLocal(event.end_at) : "",
    timezone: event?.timezone ?? "Asia/Taipei",
    location_name: event?.location_name ?? "",
    location_address: event?.location_address ?? "",
    online_url: event?.online_url ?? "",
    registration_url: event?.registration_url ?? "",
    visibility: event?.visibility ?? "draft",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title_zh.trim()) {
        setError(t("form.validation.requireTitle"));
        setLoading(false);
        return;
      }
      if (!formData.slug.trim()) {
        setError(t("form.validation.requireSlug"));
        setLoading(false);
        return;
      }
      if (!formData.start_at) {
        setError(t("form.validation.requireStartAt"));
        setLoading(false);
        return;
      }

      // Convert datetime-local to ISO string
      const submitData: EventActionInput = {
        ...formData,
        type_id: formData.type_id || null,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: formData.end_at
          ? new Date(formData.end_at).toISOString()
          : null,
      };

      if (isEditing && event) {
        const result = await updateEventAction(
          event.id,
          submitData,
          routeLocale,
        );
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
      } else {
        const result = await createEventAction(submitData, routeLocale);
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
          return;
        }
      }

      // Redirect to events list
      router.push(`/${routeLocale}/admin/events`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("form.sections.basicInfo")}
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="title_zh"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.titleLabel")} *
            </label>
            <input
              type="text"
              id="title_zh"
              name="title_zh"
              value={formData.title_zh}
              onChange={handleChange}
              placeholder={t("form.titlePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.slugLabel")} *
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder={t("form.slugPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("form.slugHint")}
            </p>
          </div>

          {/* Event Type */}
          <div>
            <label
              htmlFor="type_id"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.typeLabel")}
            </label>
            <select
              id="type_id"
              name="type_id"
              value={formData.type_id ?? ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="">{t("form.noType")}</option>
              {eventTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name_zh}
                </option>
              ))}
            </select>
          </div>

          {/* Excerpt */}
          <div>
            <label
              htmlFor="excerpt_zh"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.excerptLabel")}
            </label>
            <textarea
              id="excerpt_zh"
              name="excerpt_zh"
              value={formData.excerpt_zh ?? ""}
              onChange={handleChange}
              placeholder={t("form.excerptPlaceholder")}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content_md_zh"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.contentLabel")}
            </label>
            <textarea
              id="content_md_zh"
              name="content_md_zh"
              value={formData.content_md_zh ?? ""}
              onChange={handleChange}
              placeholder={t("form.contentPlaceholder")}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("form.contentHint")}
            </p>
          </div>
        </div>
      </div>

      {/* Date & Time Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("form.sections.dateTime")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start At */}
          <div>
            <label
              htmlFor="start_at"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.startAtLabel")} *
            </label>
            <input
              type="datetime-local"
              id="start_at"
              name="start_at"
              value={formData.start_at}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* End At */}
          <div>
            <label
              htmlFor="end_at"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.endAtLabel")}
            </label>
            <input
              type="datetime-local"
              id="end_at"
              name="end_at"
              value={formData.end_at ?? ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Timezone */}
          <div>
            <label
              htmlFor="timezone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.timezoneLabel")}
            </label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="Asia/Taipei">Asia/Taipei (UTC+8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("form.sections.location")}
        </h2>

        <div className="space-y-4">
          {/* Location Name */}
          <div>
            <label
              htmlFor="location_name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.locationNameLabel")}
            </label>
            <input
              type="text"
              id="location_name"
              name="location_name"
              value={formData.location_name ?? ""}
              onChange={handleChange}
              placeholder={t("form.locationNamePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location Address */}
          <div>
            <label
              htmlFor="location_address"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.locationAddressLabel")}
            </label>
            <input
              type="text"
              id="location_address"
              name="location_address"
              value={formData.location_address ?? ""}
              onChange={handleChange}
              placeholder={t("form.locationAddressPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Online URL */}
          <div>
            <label
              htmlFor="online_url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.onlineUrlLabel")}
            </label>
            <input
              type="url"
              id="online_url"
              name="online_url"
              value={formData.online_url ?? ""}
              onChange={handleChange}
              placeholder={t("form.onlineUrlPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("form.onlineUrlHint")}
            </p>
          </div>
        </div>
      </div>

      {/* Media Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("form.sections.media")}
        </h2>

        <div className="space-y-4">
          {/* Cover Image URL */}
          <div>
            <label
              htmlFor="cover_image_url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.coverImageLabel")}
            </label>
            <input
              type="url"
              id="cover_image_url"
              name="cover_image_url"
              value={formData.cover_image_url ?? ""}
              onChange={handleChange}
              placeholder={t("form.coverImagePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Cover Image Alt */}
          <div>
            <label
              htmlFor="cover_image_alt_zh"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.coverImageAltLabel")}
            </label>
            <input
              type="text"
              id="cover_image_alt_zh"
              name="cover_image_alt_zh"
              value={formData.cover_image_alt_zh ?? ""}
              onChange={handleChange}
              placeholder={t("form.coverImageAltPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Publishing Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("form.sections.publishing")}
        </h2>

        <div className="space-y-4">
          {/* Registration URL */}
          <div>
            <label
              htmlFor="registration_url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.registrationUrlLabel")}
            </label>
            <input
              type="url"
              id="registration_url"
              name="registration_url"
              value={formData.registration_url ?? ""}
              onChange={handleChange}
              placeholder={t("form.registrationUrlPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Visibility */}
          <div>
            <label
              htmlFor="visibility"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("form.visibilityLabel")}
            </label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="draft">{t("visibility.draft")}</option>
              <option value="private">{t("visibility.private")}</option>
              <option value="public">{t("visibility.public")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Link
          href={`/${routeLocale}/admin/events`}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          {tCommon("cancel")}
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
          {loading
            ? tCommon("saving")
            : isEditing
              ? t("form.updateEvent")
              : t("form.createEvent")}
        </button>
      </div>
    </form>
  );
}

// ==========================================================================
// Helpers
// ==========================================================================

function formatDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
