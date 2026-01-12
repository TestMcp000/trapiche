/**
 * Admin Landing Sections Page (Server Component)
 *
 * Displays all landing sections with visibility toggles and sort order.
 * Client component handles interactive operations.
 */
import { getAllLandingSections } from '@/lib/modules/landing/admin-io';
import LandingSectionsClient from './LandingSectionsClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: PageProps) {
  const { locale } = await params;

  // Server-side data fetching
  const sections = await getAllLandingSections();

  return (
    <LandingSectionsClient
      initialSections={sections}
      locale={locale}
    />
  );
}
