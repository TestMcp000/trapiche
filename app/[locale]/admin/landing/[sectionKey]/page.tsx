/**
 * Admin Landing Section Editor Page (Server Component)
 *
 * Fetches section data and passes to client editor component.
 */
import { notFound } from 'next/navigation';
import { getLandingSectionByKey } from '@/lib/modules/landing/admin-io';
import { getAllGalleryCategories } from '@/lib/modules/gallery/admin-io';
import SectionEditorClient from './SectionEditorClient';

interface PageProps {
  params: Promise<{ locale: string; sectionKey: string }>;
}

export default async function SectionEditorPage({ params }: PageProps) {
  const { locale, sectionKey } = await params;

  // Fetch section data
  const section = await getLandingSectionByKey(sectionKey);
  
  if (!section) {
    notFound();
  }

  // Fetch gallery categories for gallery type sections
  const categories = await getAllGalleryCategories();

  return (
    <SectionEditorClient
      section={section}
      categories={categories}
      locale={locale}
    />
  );
}
