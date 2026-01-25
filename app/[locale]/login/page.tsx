import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <LoginClient routeLocale={locale} />
    </Suspense>
  );
}
