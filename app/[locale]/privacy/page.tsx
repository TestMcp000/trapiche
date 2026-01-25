import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getMetadataAlternates } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates('/privacy', locale);

  return {
    title: '隱私權政策',
    description: '了解我們如何收集、使用和保護您的個人資料。',
    alternates,
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  
  const content = {
    title: '隱私權政策',
    lastUpdated: '最後更新日期：2024年12月',
    sections: [
      {
        title: '1. 資料收集',
        content: `我們收集以下類型的資料：
        <ul>
          <li><strong>自動收集的資料：</strong>IP 位址、瀏覽器類型、訪問時間、頁面瀏覽記錄</li>
          <li><strong>您主動提供的資料：</strong>聯繫表單中的姓名、電子郵件、訊息內容</li>
          <li><strong>留言系統：</strong>Google 帳號頭像、顯示名稱、電子郵件（用於登入驗證）</li>
        </ul>`,
      },
      {
        title: '2. Cookie 使用',
        content: `本網站使用以下 Cookie：
        <ul>
          <li><strong>必要性 Cookie：</strong>用於維持您的登入狀態與安全性</li>
          <li><strong>分析 Cookie：</strong>我們可能使用 Google Analytics 來了解網站使用情況</li>
          <li><strong>匿名按讚 Cookie（anon_id）：</strong>用於記錄您在畫廊作品和留言的按讚狀態。此 Cookie 為隨機產生的 UUID，不包含任何可識別個人身分的資訊。您可以隨時取消按讚，按讚記錄將被刪除。</li>
        </ul>
        <p>您可以在瀏覽器設定中選擇拒絕或刪除 Cookie。</p>`,
      },
      {
        title: '3. 第三方服務',
        content: `我們使用以下第三方服務：
        <ul>
          <li><strong>Google OAuth：</strong>用於留言系統的身份驗證</li>
          <li><strong>Cloudinary：</strong>用於圖片儲存和優化</li>
          <li><strong>Vercel：</strong>網站託管服務</li>
          <li><strong>Supabase：</strong>資料庫和身份驗證服務</li>
        </ul>`,
      },
      {
        title: '4. 資料保護',
        content: `我們採取以下措施保護您的資料：
        <ul>
          <li>使用 HTTPS 加密所有通訊</li>
          <li>實施嚴格的資料庫存取控制</li>
          <li>定期審查和更新安全措施</li>
        </ul>`,
      },
      {
        title: '5. 您的權利',
        content: `您有權：
        <ul>
          <li>要求存取您的個人資料</li>
          <li>要求更正或刪除您的資料</li>
          <li>退出分析追蹤（如有啟用）</li>
        </ul>
        <p>如需行使這些權利，請透過網站聯絡表單與我們聯繫。</p>`,
      },
      {
        title: '6. 聯繫方式',
        content: `如果您對本隱私權政策有任何疑問，請透過<a href="/${locale}/contact" class="text-primary hover:underline">聯絡頁面</a>與我們聯繫。`,
      },
    ],
  };

  return (
    <>
      <Header locale={locale} />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
            <p className="text-secondary text-sm mb-8">{content.lastUpdated}</p>
            
            {content.sections.map((section, index) => (
              <section key={index} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
                <div 
                  className="text-foreground/80 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
