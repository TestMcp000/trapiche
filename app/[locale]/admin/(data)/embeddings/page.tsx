/**
 * Embeddings Admin Page
 *
 * Server component for embedding management UI (Owner-only).
 * Displays stats, queue status, and provides initialization/retry controls.
 *
 * @see doc/specs/completed/SUPABASE_AI.md §4.2
 * @see uiux_refactor.md §6.3.2 item 5
 */
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from "@/lib/modules/auth";
import {
  isSemanticSearchEnabled,
  getEmbeddingStats,
  getPendingQueueItems,
} from "@/lib/modules/embedding/io";
import {
  getAdminLocale,
  getAdminMessages,
} from "@/lib/i18n/admin-locale.server";

import { EmbeddingsClient } from "./EmbeddingsClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function EmbeddingsPage({ params }: Props) {
  await params;
  const supabase = await createClient();

  // Owner-only gate
  const owner = await isOwner(supabase);
  if (!owner) {
    redirect("/");
  }

  // Check feature availability
  const enabled = await isSemanticSearchEnabled();

  // Fetch initial data
  const [stats, queueItems] = await Promise.all([
    getEmbeddingStats(),
    getPendingQueueItems(10), // Show first 10 pending items
  ]);

  const adminLocale = await getAdminLocale();
  const messages = await getAdminMessages(adminLocale);

  const initialData = {
    enabled,
    stats,
    queueItems,
  };

  return (
    <NextIntlClientProvider locale={adminLocale} messages={messages}>
      <EmbeddingsClient initialData={initialData} />
    </NextIntlClientProvider>
  );
}
