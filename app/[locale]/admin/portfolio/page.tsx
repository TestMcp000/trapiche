/**
 * Admin Portfolio Page (Server Component)
 *
 * Displays portfolio items with server-side data fetching.
 * Client component handles CRUD operations via server actions.
 */
import { getAllPortfolioItems } from '@/lib/modules/content/io';
import PortfolioClient from './PortfolioClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function PortfolioPage({ params }: PageProps) {
  const { locale } = await params;

  // Server-side data fetching
  const items = await getAllPortfolioItems();

  return <PortfolioClient initialItems={items} locale={locale} />;
}
