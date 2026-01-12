-- ============================================
-- SEED: 主網站預設資料 (Main Website)
-- ============================================
-- 
-- 說明：插入預設的網站內容、服務、作品集等資料
-- 此檔案為可選，可依需求修改
--
-- ============================================


-- ============================================
-- PART 1: 預設分類
-- ============================================

INSERT INTO categories (name_en, name_zh, slug) VALUES
  ('Technology', '科技', 'technology'),
  ('Tutorial', '教學', 'tutorial'),
  ('Project', '專案', 'project'),
  ('Thoughts', '隨想', 'thoughts');


-- ============================================
-- PART 2: 預設網站內容
-- ============================================

INSERT INTO site_content (section_key, content_en, content_zh, is_published) VALUES
(
  'hero',
  '{
    "eyebrow": "Quantum Nexus LNK Digital Workshop",
    "title": "Infusing technology with warmth, driving community innovation.",
    "lead": "We focus on building seamless cross-language digital experiences.",
    "cta": "Start a conversation",
    "secondaryCta": "Explore open source projects",
    "cardTitle": "Core Technologies & Services",
    "cardItems": [
      "Deep insight into real user pain points and needs",
      "Agile development architecture based on Supabase & GCP",
      "High-performance global deployment via Vercel",
      "Custom LLM fine-tuning & AI application integration",
      "Human-centered approach to help organizations scale"
    ]
  }'::jsonb,
  '{
    "eyebrow": "Quantum Nexus LNK 數位工坊",
    "title": "賦予科技溫度，驅動社群創新。",
    "lead": "我們專注於構建跨語言的無縫數位體驗。",
    "cta": "開啟對話",
    "secondaryCta": "探索開源專案",
    "cardTitle": "核心技術與服務",
    "cardItems": [
      "深入洞察使用者的真實痛點與需求",
      "基於 Supabase 與 GCP 的敏捷開發架構",
      "利用 Vercel 實現高效能全球部署",
      "客製化 LLM 模型微調與 AI 應用整合",
      "以人為本，協助組織實現規模化成長"
    ]
  }'::jsonb,
  true
),
(
  'about',
  '{
    "title": "Vision & Mission",
    "paragraph1": "Quantum Nexus LNK is dedicated to transforming abstract needs into concrete digital competitiveness.",
    "paragraph2": "We deeply believe that technology begins with humanity.",
    "snapshot": "About Us",
    "founder": "Founder",
    "email": "Contact",
    "domain": "Domain",
    "focus": "Focus",
    "focusValue": "AI-driven & borderless digital experiences"
  }'::jsonb,
  '{
    "title": "願景與使命",
    "paragraph1": "Quantum Nexus LNK 致力於將抽象需求轉化為具體的數位競爭力。",
    "paragraph2": "我們深信科技始於人性。",
    "snapshot": "關於我們",
    "founder": "Founder",
    "email": "Contact",
    "domain": "Domain",
    "focus": "Focus",
    "focusValue": "AI 驅動與無國界數位體驗"
  }'::jsonb,
  true
),
(
  'platforms',
  '{
    "title": "Tech Architecture & Infrastructure",
    "paragraph1": "We employ industry-leading modern cloud stacks.",
    "paragraph2": "With Docker containerization as our foundation.",
    "cardTitle": "Core Technology Matrix",
    "items": [
      "Frontend Engineering: React/Next.js ecosystem",
      "Cloud Backend: Serverless architecture based on Supabase & GCP",
      "DevOps Deployment: Docker & automated CI/CD pipelines",
      "Frontier AI: Custom LLM fine-tuning"
    ]
  }'::jsonb,
  '{
    "title": "技術架構與基礎設施",
    "paragraph1": "我們採用業界領先的現代化雲端堆疊。",
    "paragraph2": "以 Docker 容器化技術為基石。",
    "cardTitle": "核心技術矩陣",
    "items": [
      "前端工程：React/Next.js 生態系",
      "雲端後端：基於 Supabase 與 GCP",
      "維運部署：Docker 與自動化 CI/CD",
      "前瞻 AI：專屬 LLM 模型微調"
    ]
  }'::jsonb,
  true
),
(
  'contact',
  '{
    "title": "Start a Conversation",
    "paragraph": "Contact us now to co-create forward-thinking digital initiatives.",
    "email": "Email",
    "github": "GitHub",
    "ctaTitle": "Get in Touch",
    "ctaText": "We are deeply invested in deep learning technology.",
    "ctaButton": "Schedule a consultation"
  }'::jsonb,
  '{
    "title": "開啟對話",
    "paragraph": "立即聯繫我們，共同打造前瞻性的數位計畫。",
    "email": "電子郵件",
    "github": "GitHub",
    "ctaTitle": "聯繫我們",
    "ctaText": "我們深耕深度學習技術。",
    "ctaButton": "預約諮詢會議"
  }'::jsonb,
  true
),
(
  'footer',
  '{
    "tagline": "Building solutions that empower communities.",
    "companyName": "Quantum Nexus LNK Limited Liability Co.",
    "rights": "All rights reserved."
  }'::jsonb,
  '{
    "tagline": "打造賦能社群的解決方案。",
    "companyName": "Quantum Nexus LNK 有限責任公司",
    "rights": "保留所有權利。"
  }'::jsonb,
  true
),
(
  'metadata',
  '{
    "title": "Quantum Nexus LNK | AI-Driven Digital Solutions",
    "description": "Building technology platforms that connect communities."
  }'::jsonb,
  '{
    "title": "Quantum Nexus LNK | AI 驅動數位解決方案",
    "description": "打造連接社群與尖端數位服務的科技平台。"
  }'::jsonb,
  true
),
(
  'nav',
  '{"about": "About", "services": "Services", "platforms": "Platforms", "portfolio": "Portfolio", "gallery": "Gallery", "contact": "Contact", "blog": "Blog", "privacy": "Privacy"}'::jsonb,
  '{"about": "關於我們", "services": "服務項目", "platforms": "技術平台", "portfolio": "作品展示", "gallery": "畫廊", "contact": "聯絡我們", "blog": "部落格", "privacy": "隱私權"}'::jsonb,
  true
),
(
  'company',
  '{"name": "Quantum Nexus LNK Limited Liability Co.", "nameShort": "Quantum Nexus LNK"}'::jsonb,
  '{"name": "Quantum Nexus LNK Limited Liability Co.", "nameShort": "Quantum Nexus LNK"}'::jsonb,
  true
),
(
  'gallery',
  '{}'::jsonb,
  '{}'::jsonb,
  true
);


-- ============================================
-- PART 3: 預設服務
-- ============================================

INSERT INTO services (sort_order, title_en, title_zh, description_en, description_zh, icon, is_visible) VALUES
(1, 'Full-Stack Web Development', '全端網頁開發', 
 'Building responsive websites using Vue, React, and Next.js.',
 '使用 Vue、React 和 Next.js 打造響應式網站。',
 'code', true),
(2, 'Cloud Infrastructure & Deployment', '雲端基礎設施與部署',
 'Dockerized applications hosted on Google Cloud Platform.',
 '使用 Docker 容器化, 託管於 GCP。',
 'cloud', true),
(3, 'AI & LLM Integration', 'AI 與大型語言模型整合',
 'Fine-tuning, deploying, and integrating LLMs.',
 '精進 LLM 的微調、部署和整合。',
 'ai', true);


-- ============================================
-- PART 4: 預設作品集
-- ============================================

INSERT INTO portfolio_items (sort_order, title_en, title_zh, description_en, description_zh, url, status, badge_color, is_featured, is_visible) VALUES
(1, 'Submange', 'Submange',
 'Subscription management platform.',
 '訂閱管理平台。',
 'https://www.submange.com/', 'live', 'blue', true, true),
(2, 'Costco Group Buying Platform', '好市多分購平台',
 'Collaborative shopping experiences.',
 '促進協作購物體驗。',
 NULL, 'development', 'blue', false, true),
(3, 'Taiwan Emergency Resource Integration', '台灣救災資源整合平台',
 'Disaster relief coordination platform.',
 '災害救援協調平台。',
 NULL, 'development', 'green', false, true);


-- ============================================
-- PART 5: 預設公司設定
-- ============================================

INSERT INTO company_settings (key, value, label_en, label_zh, category) VALUES
('company_name', 'Quantum Nexus LNK Limited Liability Co.', 'Company Name', '公司名稱', 'general'),
('company_name_short', 'Quantum Nexus LNK', 'Short Name', '簡稱', 'general'),
('email', 'contact@quantumnexuslnk.com', 'Contact Email', '聯絡信箱', 'contact'),
('domain', 'quantumnexuslnk.com', 'Domain', '網域', 'general'),
('github_url', 'https://github.com/LeanderKuo', 'GitHub URL', 'GitHub 網址', 'social'),
('github_repo', 'https://github.com/LeanderKuo/myownwebsite', 'Repository URL', '專案庫網址', 'social'),
('founder_name', 'Leander Kuo', 'Founder Name', '創辦人姓名', 'general'),
('founder_github', 'https://github.com/LeanderKuo', 'Founder GitHub', '創辦人 GitHub', 'social'),
('gallery_featured_limit_home', '6', 'Gallery Featured Limit (Home)', '畫廊精選張數（首頁）', 'general'),
('gallery_featured_limit_gallery', '12', 'Gallery Featured Limit (Gallery)', '畫廊精選張數（列表）', 'general');


-- ============================================
-- 完成 DONE
-- ============================================
