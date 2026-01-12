'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/infrastructure/supabase/client';

interface AdminSignOutButtonProps {
  locale: string;
  /** Optional messages for i18n - if provided, uses buttons text; otherwise defaults */
  messages?: {
    buttons: string;
  };
}

/**
 * Client-only sign-out button for admin sidebar.
 * Extracted to minimize client-side code in the sidebar.
 */
export default function AdminSignOutButton({ locale, messages }: AdminSignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  // Use i18n message if provided, otherwise fallback to default
  const buttonText = messages?.buttons ?? 'Sign Out';

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {buttonText}
    </button>
  );
}
