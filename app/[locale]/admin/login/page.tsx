import { redirect } from 'next/navigation';

interface AdminLoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminLoginPage({ params }: AdminLoginPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}
