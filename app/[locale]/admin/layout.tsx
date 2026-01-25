import { redirect } from 'next/navigation';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin, getAdminRole } from '@/lib/modules/auth';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import AdminSidebar from '@/components/admin/common/AdminSidebar';

export const dynamic = 'force-dynamic';

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

  // Single-language admin UI: use route locale for messages
  const allMessages = await getMessages({ locale: routeLocale });
  // Extract admin namespace for scoped provider
  const adminNamespaceMessages = { admin: allMessages.admin } as AbstractIntlMessages;
  
  // Get role mismatch text from messages (with type-safe access)
  const adminMessages = allMessages.admin as Record<string, Record<string, string>> | undefined;
  const commonMessages = adminMessages?.common;
  const roleMismatchTitle = commonMessages?.roleMismatchTitle ?? '角色未同步';
  const roleMismatchMessage = commonMessages?.roleMismatchMessage ?? 
    '您是透過環境變數 fallback 進入後台，但 JWT 角色尚未同步；部分操作可能會被 RLS 拒絕。請聯繫擁有者將您加入 site_admins。';

  return (
    <NextIntlClientProvider locale={routeLocale} messages={adminNamespaceMessages}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex">
          <AdminSidebar locale={routeLocale} userEmail={user.email || ''} />
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
    </NextIntlClientProvider>
  );
}
