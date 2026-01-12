import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  
  return {
    title: locale === 'zh' ? '隱私權政策 | Quantum Nexus LNK' : 'Privacy Policy | Quantum Nexus LNK',
    description: locale === 'zh' 
      ? '了解我們如何收集、使用和保護您的個人資料。'
      : 'Learn how we collect, use, and protect your personal data.',
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  
  const content = locale === 'zh' ? {
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
          <li><strong>必要性 Cookie：</strong>用於維持您的登入狀態和語言偏好</li>
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
  } : {
    title: 'Privacy Policy',
    lastUpdated: 'Last Updated: December 2024',
    sections: [
      {
        title: '1. Data Collection',
        content: `We collect the following types of data:
        <ul>
          <li><strong>Automatically collected:</strong> IP address, browser type, visit time, page views</li>
          <li><strong>Data you provide:</strong> Name, email, and message content from contact forms</li>
          <li><strong>Comment system:</strong> Google account avatar, display name, email (for authentication)</li>
        </ul>`,
      },
      {
        title: '2. Cookie Usage',
        content: `This website uses the following cookies:
        <ul>
          <li><strong>Essential cookies:</strong> To maintain your login status and language preferences</li>
          <li><strong>Analytics cookies:</strong> We may use Google Analytics to understand site usage</li>
          <li><strong>Anonymous Like Cookie (anon_id):</strong> Used to track your like status on gallery items and comments. This cookie contains a randomly generated UUID and does not include any personally identifiable information. You can unlike at any time, and your like record will be removed.</li>
        </ul>
        <p>You can choose to refuse or delete cookies in your browser settings.</p>`,
      },
      {
        title: '3. Third-Party Services',
        content: `We use the following third-party services:
        <ul>
          <li><strong>Google OAuth:</strong> For comment system authentication</li>
          <li><strong>Cloudinary:</strong> For image storage and optimization</li>
          <li><strong>Vercel:</strong> Website hosting</li>
          <li><strong>Supabase:</strong> Database and authentication services</li>
        </ul>`,
      },
      {
        title: '4. Data Protection',
        content: `We take the following measures to protect your data:
        <ul>
          <li>Use HTTPS encryption for all communications</li>
          <li>Implement strict database access controls</li>
          <li>Regularly review and update security measures</li>
        </ul>`,
      },
      {
        title: '5. Your Rights',
        content: `You have the right to:
        <ul>
          <li>Request access to your personal data</li>
          <li>Request correction or deletion of your data</li>
          <li>Opt out of analytics tracking (if enabled)</li>
        </ul>
        <p>To exercise these rights, please contact us through the website contact form.</p>`,
      },
      {
        title: '6. Contact',
        content: `If you have any questions about this privacy policy, please contact us through our <a href="/${locale}/contact" class="text-primary hover:underline">contact page</a>.`,
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
