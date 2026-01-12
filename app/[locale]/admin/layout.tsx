import { redirect } from 'next/navigation';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin, getAdminRole } from '@/lib/modules/auth';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import AdminSidebar from '@/components/admin/common/AdminSidebar';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect(`/${routeLocale}/login`);
  }

  // Check if user is admin via DB site_admins
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    // Unauthorized: redirect to home with error
    redirect(`/${routeLocale}?error=unauthorized`);
  }

  // Check for role mismatch: entered via env fallback but JWT lacks role
  const jwtRole = await getAdminRole(supabase);
  const roleMismatch = isAdmin && !jwtRole;

  // Get admin UI locale (independent from route locale)
  const adminLocale = await getAdminLocale();

  // Get messages for the admin locale and extract admin namespace
  const allMessages = await getMessages({ locale: adminLocale });
  // Extract admin namespace for scoped provider
  const adminNamespaceMessages = { admin: allMessages.admin } as AbstractIntlMessages;
  
  // Get role mismatch text from messages (with type-safe access)
  const adminMessages = allMessages.admin as Record<string, Record<string, string>> | undefined;
  const commonMessages = adminMessages?.common;
  const roleMismatchTitle = commonMessages?.roleMismatchTitle ?? 'Role Not Synced';
  const roleMismatchMessage = commonMessages?.roleMismatchMessage ?? 
    'You entered via environment fallback, but your database role is not synced. Some operations may be denied by RLS. Please contact the Owner to add you to the site_admins table.';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex">
        <AdminSidebar
          routeLocale={routeLocale}
          adminLocale={adminLocale}
          userEmail={user.email || ''}
          messages={adminNamespaceMessages}
        />
        <main className="flex-1 ml-64 p-8">
          {roleMismatch && (
            <div className="mb-6 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    {roleMismatchTitle}
                  </h3>
                  <p className="text-orange-700 dark:text-orange-300 text-sm">
                    {roleMismatchMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
