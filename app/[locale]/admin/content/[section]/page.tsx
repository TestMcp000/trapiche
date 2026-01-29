/**
 * Content Editor Page (Server Component)
 *
 * Displays content editor with server-side data fetching.
 * Client component handles editing and save actions.
 */
import { redirect } from 'next/navigation';
import { getSiteContent, getContentHistory } from '@/lib/modules/content/io';
import ContentEditorClient from './ContentEditorClient';

interface PageProps {
  params: Promise<{ locale: string; section: string }>;
}

export default async function ContentEditorPage({ params }: PageProps) {
  const { locale, section: sectionKey } = await params;

  // Navigation is managed via the visual editor only.
  if (sectionKey === 'hamburger_nav' || sectionKey === 'nav') {
    redirect(`/${locale}/admin/settings/navigation`);
  }

  // Deprecated: site name now comes from company settings, not site_content.
  if (sectionKey === 'company') {
    redirect(`/${locale}/admin/settings`);
  }

  // Server-side data fetching
  const content = await getSiteContent(sectionKey);

  // Fetch history if content exists
  let history: Awaited<ReturnType<typeof getContentHistory>> = [];
  if (content?.id) {
    history = await getContentHistory('site_content', content.id);
  }

  return (
    <ContentEditorClient
      initialContent={content}
      initialHistory={history}
      locale={locale}
      sectionKey={sectionKey}
    />
  );
}
