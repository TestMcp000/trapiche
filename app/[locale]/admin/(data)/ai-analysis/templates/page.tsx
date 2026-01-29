/**
 * AI Analysis Custom Templates Admin Page
 *
 * Server component for managing custom AI analysis templates.
 * RBAC: Owner can CRUD, Editor can view enabled templates.
 *
 * @see lib/modules/ai-analysis/analysis-templates-io.ts
 * @see doc/specs/completed/ai-analysis-spec.md (templates contract)
 */
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getAdminRole } from '@/lib/modules/auth';
import { listTemplates } from '@/lib/modules/ai-analysis/analysis-templates-io';

import { TemplatesClient } from './TemplatesClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function TemplatesPage({ params }: PageProps) {
  const { locale: routeLocale } = await params;
  const supabase = await createClient();
  const role = await getAdminRole(supabase);

  if (!role) {
    redirect(`/${routeLocale}`);
  }

  // Fetch templates based on role
  const templates = await listTemplates(role);

  const messages = await getMessages({ locale: routeLocale });

  return (
    <NextIntlClientProvider locale={routeLocale} messages={messages}>
      <TemplatesClient
        role={role}
        initialTemplates={templates}
        routeLocale={routeLocale}
      />
    </NextIntlClientProvider>
  );
}
