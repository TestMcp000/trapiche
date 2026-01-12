/**
 * Admin Settings Page (Server Component)
 *
 * Displays company settings with server-side data fetching.
 * Client component handles editing and save actions.
 */
import { getCompanySettings } from '@/lib/modules/content/io';
import SettingsClient from './SettingsClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params;

  // Server-side data fetching
  const settings = await getCompanySettings();

  return <SettingsClient initialSettings={settings} locale={locale} />;
}
