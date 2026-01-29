/**
 * Control Center Admin Page
 *
 * Server component for semantic search admin UI.
 * RBAC: Owner/Editor can access.
 *
 * @see doc/specs/completed/SUPABASE_AI.md §3.1
 * @see uiux_refactor.md §6.3.2 item 1
 */
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getAdminRole } from '@/lib/modules/auth';
import { isSemanticSearchEnabled } from '@/lib/modules/embedding/io';
import { EMBEDDING_TARGET_TYPES } from '@/lib/validators/embedding';

import { ControlCenterClient } from './ControlCenterClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ControlCenterPage({ params }: PageProps) {
  const { locale: routeLocale } = await params;
  const supabase = await createClient();
  const role = await getAdminRole(supabase);

  if (!role) {
    redirect(`/${routeLocale}`);
  }

  // Check if semantic search is available
  const enabled = await isSemanticSearchEnabled();

  const initialData = {
    role,
    enabled,
    targetTypes: [...EMBEDDING_TARGET_TYPES],
  };

  return <ControlCenterClient routeLocale={routeLocale} initialData={initialData} />;
}
