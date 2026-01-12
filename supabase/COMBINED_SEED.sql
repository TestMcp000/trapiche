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

-- ============================================
-- SEED: 留言系統預設資料 + 全站管理員 (Comments + Site Admins)
-- ============================================
-- 
-- 說明：
-- - PART 1-2: 留言系統設定 (審核模式、黑名單)
-- - PART 3: 全站管理員 (site_admins 控制整個後台權限)
-- - PART 4: 公開設定初始化
--
-- ⚠️ 重要: 請在 PART 3 設定您的管理員 email
-- site_admins 表控制的是整個網站的後台權限，
-- 包含：部落格、作品集、畫廊、商城、留言管理等所有功能！
--
-- ============================================


-- ============================================
-- PART 1: 預設設定
-- ============================================

INSERT INTO public.comment_settings (key, value) VALUES
('moderation_mode', 'auto'),
('max_links_before_moderation', '2'),
('enable_honeypot', 'true'),
('enable_akismet', 'true'),
('enable_recaptcha', 'false'),
('recaptcha_threshold', '0.5'),
('rate_limit_per_minute', '3'),
('max_content_length', '4000')
ON CONFLICT (key) DO NOTHING;


-- ============================================
-- PART 2: 預設黑名單
-- ============================================

INSERT INTO public.comment_blacklist (type, value, reason) VALUES
('keyword', 'viagra', 'Common spam'),
('keyword', 'cialis', 'Common spam'),
('keyword', 'casino', 'Common spam'),
('keyword', 'poker', 'Common spam'),
('keyword', 'cryptocurrency investment', 'Crypto scam'),
('keyword', 'make money fast', 'Scam')
ON CONFLICT (type, value) DO NOTHING;


-- ============================================
-- PART 3: 新增管理員 (Site Admins)
-- ============================================
-- 
-- ⚠️ 重要: 請將下方替換為您的管理員 email
-- 不新增管理員將無法進入後台!
--
-- 角色說明 (Role Description):
-- - owner: 最高權限，可管理所有內容與設定
-- - editor: 編輯權限，可管理內容但無法變更系統設定
--
-- ============================================

INSERT INTO public.site_admins (email, role) VALUES
  -- Owners: 最高權限管理員
  ('leanderkuo0815@gmail.com', 'owner'),
  ('quantumnexuslnk@gmail.com', 'owner'),
  ('lijenkuo085@gmail.com', 'owner'),
  -- Editors: 編輯權限管理員
  ('majorkang1291@gmail.com', 'editor')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;


-- ============================================
-- PART 4: 初始化公開設定
-- ============================================

INSERT INTO public.comment_public_settings (key, value)
SELECT 'enable_recaptcha', COALESCE(
  (SELECT value FROM public.comment_settings WHERE key = 'enable_recaptcha'),
  'false'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = TIMEZONE('utc', NOW());

INSERT INTO public.comment_public_settings (key, value)
SELECT 'max_content_length', COALESCE(
  (SELECT value FROM public.comment_settings WHERE key = 'max_content_length'),
  '4000'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = TIMEZONE('utc', NOW());


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- SEED: 電商預設資料 (Shop / E-Commerce)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-19
--
-- 說明：插入商城預設設定
-- 此檔案為可選，可依需求修改
--
-- ============================================


-- ============================================
-- PART 1: 初始化商城設定 (singleton)
-- ============================================

INSERT INTO shop_settings (
  reserved_ttl_minutes,
  invoice_config_mode,
  invoice_toggles_json
) VALUES (
  30,     -- 庫存保留 30 分鐘
  'toggles',
  '{"taxId": false, "mobileCarrier": false, "citizenCert": false}'::jsonb
);


-- ============================================
-- PART 2: 初始化金流設定（預設關閉）
-- ============================================

INSERT INTO payment_provider_configs (gateway, is_enabled, is_test_mode, validation_status)
VALUES 
  ('stripe', false, true, 'pending'),
  ('linepay', false, true, 'pending'),
  ('ecpay', false, true, 'pending');


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- SEED: 功能設定與 Landing Sections
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-21
--
-- 說明：
-- 1. 初始化功能開關（all disabled by default）
-- 2. 初始化 Landing Page 預設區塊
--
-- ============================================


-- ============================================
-- PART 1: 功能開關 (Feature Settings)
-- ============================================
-- All features disabled by default, owner enables manually

INSERT INTO feature_settings (feature_key, is_enabled, display_order, description_en, description_zh) VALUES
  ('blog', false, 1, 'Blog posts and articles section', '部落格文章區塊'),
  ('gallery', false, 2, 'Pinterest-style image gallery', 'Pinterest 風格圖片畫廊'),
  ('shop', false, 3, 'E-commerce storefront', '電商商城')
ON CONFLICT (feature_key) DO NOTHING;


-- ============================================
-- PART 2: Landing Sections 預設區塊
-- ============================================
-- These are the preset sections with fixed section_keys.
-- Content for most preset sections comes from external sources (site_content, services, etc.).
-- Only custom sections store their content in content_en/zh.

INSERT INTO landing_sections (section_key, section_type, sort_order, title_en, title_zh, is_visible) VALUES
  ('hero', 'text_image', 0, 'Welcome', '歡迎', true),
  ('about', 'text_image', 1, 'About Us', '關於我們', true),
  ('services', 'cards', 2, 'Our Services', '我們的服務', true),
  ('platforms', 'cards', 3, 'Platforms', '平台', true),
  ('product_design', 'gallery', 4, 'Product Design', '產品設計', true),
  ('portfolio', 'gallery', 5, 'Portfolio', '專案作品', true),
  ('contact', 'cta', 99, 'Contact Us', '聯繫我們', true)
ON CONFLICT (section_key) DO NOTHING;


-- ============================================
-- SEED: 畫廊假資料 (Gallery Seed Data)
-- ============================================

-- Gallery Categories
INSERT INTO public.gallery_categories (sort_order, name_en, name_zh, slug, is_visible) VALUES
  (1, 'Product Design', '產品設計', 'product-design', true),
  (2, 'UI/UX Design', '介面設計', 'ui-ux-design', true),
  (3, 'Illustration', '插畫創作', 'illustration', true);

-- Gallery Items: Product Design
INSERT INTO public.gallery_items (
  category_id, title_en, title_zh, slug,
  description_en, description_zh,
  image_url, image_width, image_height,
  image_alt_en, image_alt_zh,
  material_en, material_zh,
  tags_en, tags_zh, is_visible
) VALUES
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'product-design'),
  'Smart Home Hub', '智慧家庭中樞', 'smart-home-hub',
  'A minimalist smart home control device featuring an intuitive touch interface.',
  '極簡風格智慧家庭控制裝置，具備直覺觸控介面。',
  'https://picsum.photos/seed/product1/800/600', 800, 600,
  'Smart home hub device', '智慧家庭中樞裝置',
  'Aluminum, Glass, LED', '鋁合金、玻璃、LED',
  ARRAY['product', 'iot', 'smart-home'], ARRAY['產品', '物聯網', '智慧家庭'], true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'product-design'),
  'Wireless Earbuds Case', '無線耳機充電盒', 'wireless-earbuds-case',
  'Ergonomic charging case design with magnetic closure.',
  '人體工學充電盒設計，具備磁吸開合。',
  'https://picsum.photos/seed/product2/800/600', 800, 600,
  'Wireless earbuds charging case', '無線耳機充電盒',
  'Polycarbonate, Silicone', '聚碳酸酯、矽膠',
  ARRAY['product', 'audio', 'wearable'], ARRAY['產品', '音訊', '穿戴裝置'], true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'product-design'),
  'Portable Projector', '便攜投影機', 'portable-projector',
  'Compact cinema-quality projector with 4K support.',
  '緊湊型影院級投影機，支援 4K 畫質。',
  'https://picsum.photos/seed/product3/800/600', 800, 600,
  'Portable projector', '便攜投影機',
  'Aluminum, ABS Plastic', '鋁合金、ABS 塑膠',
  ARRAY['product', 'entertainment', 'portable'], ARRAY['產品', '娛樂', '便攜'], true
);

-- Gallery Items: UI/UX Design
INSERT INTO public.gallery_items (
  category_id, title_en, title_zh, slug,
  description_en, description_zh,
  image_url, image_width, image_height,
  image_alt_en, image_alt_zh,
  material_en, material_zh,
  tags_en, tags_zh, is_visible
) VALUES
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'ui-ux-design'),
  'Finance Dashboard', '金融儀表板', 'finance-dashboard',
  'Dark-themed financial analytics dashboard with real-time data visualization.',
  '深色主題金融分析儀表板，具備即時數據視覺化。',
  'https://picsum.photos/seed/uiux1/1200/800', 1200, 800,
  'Financial dashboard interface', '金融儀表板介面',
  'Figma, React', 'Figma、React',
  ARRAY['ui', 'dashboard', 'fintech'], ARRAY['介面', '儀表板', '金融科技'], true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'ui-ux-design'),
  'Health Tracking App', '健康追蹤應用', 'health-tracking-app',
  'Mobile app design for comprehensive health monitoring.',
  '手機應用設計，提供全方位健康監測。',
  'https://picsum.photos/seed/uiux2/800/1200', 800, 1200,
  'Mobile health app', '行動健康應用',
  'Figma, Swift UI', 'Figma、Swift UI',
  ARRAY['ui', 'mobile', 'health'], ARRAY['介面', '行動裝置', '健康'], true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'ui-ux-design'),
  'E-commerce Checkout Flow', '電商結帳流程', 'ecommerce-checkout',
  'Streamlined checkout experience designed to reduce cart abandonment.',
  '精簡結帳體驗設計，旨在降低購物車放棄率。',
  'https://picsum.photos/seed/uiux3/1200/800', 1200, 800,
  'E-commerce checkout page', '電商結帳頁面',
  'Figma, Next.js', 'Figma、Next.js',
  ARRAY['ui', 'ecommerce', 'checkout'], ARRAY['介面', '電商', '結帳'], true
);

-- Gallery Items: Illustration
INSERT INTO public.gallery_items (
  category_id, title_en, title_zh, slug,
  description_en, description_zh,
  image_url, image_width, image_height,
  image_alt_en, image_alt_zh,
  material_en, material_zh,
  tags_en, tags_zh, is_visible
) VALUES
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'illustration'),
  'Cyberpunk City', '賽博朋克城市', 'cyberpunk-city',
  'Futuristic cityscape illustration featuring neon lights and flying vehicles.',
  '未來城市風景插畫，展現霓虹燈光與飛行載具。',
  'https://picsum.photos/seed/illust1/1000/1400', 1000, 1400,
  'Neon-lit cyberpunk city at night', '霓虹燈光下的賽博朋克夜城',
  'Digital, Procreate', '數位、Procreate',
  ARRAY['illustration', 'sci-fi', 'cyberpunk'], ARRAY['插畫', '科幻', '賽博朋克'], true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'illustration'),
  'Forest Spirit', '森林精靈', 'forest-spirit',
  'Mystical creature illustration blending nature elements with fantasy aesthetics.',
  '神秘生物插畫，融合自然元素與奇幻美學。',
  'https://picsum.photos/seed/illust2/1000/1400', 1000, 1400,
  'Ethereal forest spirit', '飄渺森林精靈',
  'Digital, Photoshop', '數位、Photoshop',
  ARRAY['illustration', 'fantasy', 'nature'], ARRAY['插畫', '奇幻', '自然'], true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'illustration'),
  'Space Explorer', '太空探險家', 'space-explorer',
  'Character illustration of an astronaut discovering alien landscapes.',
  '太空人角色插畫，在遙遠星球上探索外星地景。',
  'https://picsum.photos/seed/illust3/1000/1400', 1000, 1400,
  'Astronaut exploring alien planet', '太空人探索外星球',
  'Digital, Clip Studio', '數位、Clip Studio',
  ARRAY['illustration', 'space', 'character'], ARRAY['插畫', '太空', '角色'], true
);

-- Gallery Pins
INSERT INTO public.gallery_pins (surface, item_id, sort_order) VALUES
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'smart-home-hub'), 1),
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'finance-dashboard'), 2),
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'cyberpunk-city'), 3),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'smart-home-hub'), 1),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'wireless-earbuds-case'), 2),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'finance-dashboard'), 3),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'health-tracking-app'), 4),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'cyberpunk-city'), 5),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'forest-spirit'), 6);


-- ============================================
-- SEED: 部落格假資料 (Blog Seed Data)
-- ============================================

-- Blog Categories
INSERT INTO public.categories (name_en, name_zh, slug) VALUES
  ('Artificial Intelligence', '人工智慧', 'ai'),
  ('Web3 & Blockchain', 'Web3 與區塊鏈', 'web3')
ON CONFLICT (slug) DO NOTHING;

-- Blog Posts
INSERT INTO public.posts (
  title_en, title_zh, slug,
  content_en, content_zh,
  excerpt_en, excerpt_zh,
  cover_image_url, cover_image_alt_en, cover_image_alt_zh,
  category_id, visibility, published_at, reading_time_minutes
) VALUES
(
  'Understanding Tokens and Embeddings in LLMs',
  '理解大型語言模型中的 Token 與 Embedding',
  'tokens-and-embeddings-in-llms',
  '## What are Tokens?

Tokens are the fundamental units that LLMs use to process text. A token can be a word, part of a word, or even a single character.

## What are Embeddings?

Embeddings are dense vector representations of tokens. Each token is mapped to a high-dimensional vector that captures semantic meaning.

### Why Embeddings Matter

1. **Semantic similarity**: Similar words have similar vectors
2. **Arithmetic properties**: king - man + woman ≈ queen
3. **Contextual understanding**: Same word can have different embeddings based on context',
  '## 什麼是 Token？

Token 是 LLM 處理文字的基本單位。一個 token 可以是一個詞、詞的一部分，甚至是單一字元。

## 什麼是 Embedding？

Embedding 是 token 的密集向量表示。每個 token 被映射到一個高維向量，用於捕捉語義含義。

### 為什麼 Embedding 重要

1. **語義相似性**：相似的詞有相似的向量
2. **算術特性**：國王 - 男人 + 女人 ≈ 女王
3. **上下文理解**：同一個詞根據上下文可以有不同的 embedding',
  'Deep dive into tokens and embeddings - the foundation of how LLMs understand text.',
  '深入探討 token 與 embedding — 大型語言模型理解文字的基礎。',
  'https://picsum.photos/seed/ai-tokens/1200/630',
  'Neural network representing token embeddings', '代表 token embedding 的神經網路',
  (SELECT id FROM public.categories WHERE slug = 'ai'),
  'public', TIMEZONE('utc', NOW()) - INTERVAL '7 days', 8
),
(
  'Attention Mechanism, Loss Functions, and Gradient Descent',
  '注意力機制、損失函數與梯度下降',
  'attention-loss-gradient',
  '## The Attention Mechanism

Attention allows the model to focus on relevant parts of the input when generating each output token.

### Self-Attention Formula
```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

## Loss Functions

Cross-entropy loss measures the difference between actual and predicted next tokens.

## Gradient Descent

The process: Forward pass → Compute loss → Backward pass → Update weights',
  '## 注意力機制

注意力機制讓模型在生成輸出時能夠專注於輸入的相關部分。

### 自注意力公式
```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

## 損失函數

交叉熵損失衡量實際與預測下一個 token 之間的差異。

## 梯度下降

過程：前向傳播 → 計算損失 → 反向傳播 → 更新權重',
  'Understanding attention, loss functions, and gradient descent in neural networks.',
  '理解神經網路中的注意力機制、損失函數與梯度下降。',
  'https://picsum.photos/seed/ai-attention/1200/630',
  'Gradient descent on loss landscape', '損失地形上的梯度下降',
  (SELECT id FROM public.categories WHERE slug = 'ai'),
  'public', TIMEZONE('utc', NOW()) - INTERVAL '3 days', 12
),
(
  'From Web2 Certificate Authorities to Decentralized Trust',
  '從 Web2 憑證授權到去中心化信任',
  'web2-ca-to-decentralization',
  '## The Web2 Trust Model

Trust is established through Certificate Authorities (CAs) - Root CAs issue certificates that browsers trust.

### Problems with Centralized Trust
- Single points of failure
- Political control possibilities
- Cost barriers

## The Web3 Trust Model

Web3 replaces centralized trust with cryptographic guarantees:
- **Self-sovereign identity**: Your private key = Your identity
- **Consensus-based trust**: Trust the network, not a single authority
- **Smart contract trust**: Transparent, immutable, verifiable code',
  '## Web2 信任模型

信任透過憑證授權機構（CA）建立 - 根 CA 發行瀏覽器信任的憑證。

### 中心化信任的問題
- 單點故障
- 政治控制可能性
- 成本障礙

## Web3 信任模型

Web3 用密碼學保障取代中心化信任：
- **自主主權身份**：你的私鑰 = 你的身份
- **基於共識的信任**：信任網路，而非單一權威
- **智能合約信任**：透明、不可變、可驗證的程式碼',
  'How Web3 replaces CAs with decentralized trust mechanisms.',
  '探索 Web3 如何用去中心化信任機制取代傳統憑證授權。',
  'https://picsum.photos/seed/web3-trust/1200/630',
  'Decentralized network nodes', '去中心化網路節點',
  (SELECT id FROM public.categories WHERE slug = 'web3'),
  'public', TIMEZONE('utc', NOW()) - INTERVAL '5 days', 10
),
(
  'Byzantine Fault Tolerance: The Foundation of Blockchain Consensus',
  '拜占庭容錯：區塊鏈共識的基石',
  'byzantine-fault-tolerance',
  '## The Byzantine Generals Problem

Generals must agree on attack or retreat, but some may be traitors sending false messages.

### In Blockchain
- Generals = Nodes
- Messages = Transactions and blocks
- Traitors = Malicious nodes
- Agreement = Consensus

## The 3f + 1 Rule

To tolerate f Byzantine faults, need at least 3f + 1 nodes.

## Practical BFT

Three phases: Pre-prepare → Prepare → Commit',
  '## 拜占庭將軍問題

將軍們必須就進攻或撤退達成一致，但有些可能是發送假訊息的叛徒。

### 在區塊鏈中
- 將軍 = 節點
- 訊息 = 交易和區塊
- 叛徒 = 惡意節點
- 共識 = 一致

## 3f + 1 規則

要容忍 f 個拜占庭故障，需要至少 3f + 1 個節點。

## 實用拜占庭容錯

三個階段：預準備 → 準備 → 提交',
  'Understanding Byzantine Fault Tolerance in blockchain consensus.',
  '理解區塊鏈共識中的拜占庭容錯。',
  'https://picsum.photos/seed/web3-bft/1200/630',
  'Byzantine generals representing consensus', '代表共識的拜占庭將軍',
  (SELECT id FROM public.categories WHERE slug = 'web3'),
  'public', TIMEZONE('utc', NOW()) - INTERVAL '1 day', 15
);


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- SEED: 主題配置預設資料 (Theme/Site Config)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-23
--
-- 說明：插入預設主題配置（確保永遠有 id=1）
-- 此檔案為必要，確保 Singleton row 存在
--
-- ============================================


-- ============================================
-- PART 1: 初始化 site_config (Singleton)
-- ============================================
-- 
-- 使用 ON CONFLICT 確保冪等性
-- 若 id=1 已存在則不做任何事
--
-- ============================================

INSERT INTO public.site_config (id, global_theme, page_themes, theme_overrides, preprocessing_config)
VALUES (
  1,
  'tech-pro',
  '{}'::jsonb,
  '{}'::jsonb,
  '{
    "product": {
      "chunking": { "targetSize": 300, "overlap": 45, "splitBy": "semantic", "minSize": 64, "maxSize": 600, "useHeadingsAsBoundary": true }
    },
    "post": {
      "chunking": { "targetSize": 500, "overlap": 75, "splitBy": "semantic", "minSize": 128, "maxSize": 1000, "useHeadingsAsBoundary": true }
    },
    "gallery_item": {
      "chunking": { "targetSize": 128, "overlap": 20, "splitBy": "sentence", "minSize": 32, "maxSize": 256, "useHeadingsAsBoundary": false }
    },
    "comment": {
      "chunking": { "targetSize": 128, "overlap": 0, "splitBy": "sentence", "minSize": 16, "maxSize": 256, "useHeadingsAsBoundary": false }
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- 完成 DONE
-- ============================================
