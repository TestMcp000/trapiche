import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginClient from './LoginClient';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      <Header locale={locale} />
      <main className="pt-24 pb-16 min-h-screen flex items-center justify-center p-4">
        <Suspense fallback={<div className="w-full max-w-md glass-card rounded-theme-lg shadow-soft border border-border-light/60 p-8" />}>
          <LoginClient routeLocale={locale} />
        </Suspense>
      </main>
      <Footer locale={locale} />
    </>
  );
}
