-- ============================================
-- SEED: 主網站預設資料 (Main Website)
-- ============================================
-- 
-- 說明：插入預設的網站內容、服務、作品集等資料
-- 此檔案為可選，可依需求修改
--
-- ============================================


-- ============================================
-- PART 1: 預設網站內容
-- ============================================

INSERT INTO site_content (section_key, content_en, content_zh, is_published) VALUES
(
  'hero',
  '{
    "eyebrow": "Art Therapy & Psychoeducation",
    "title": "Practice calm in daily life.",
    "lead": "Gentle, practical strategies for emotion care and self-understanding.",
    "cta": "Get in touch",
    "secondaryCta": "Read articles",
    "cardTitle": "Start Here",
    "cardItems": [
      "Emotion care: name and soothe",
      "Anxiety & stress: body signals",
      "Sleep: bedtime rituals",
      "Boundaries: gentle but clear",
      "Self-awareness: come back to yourself"
    ]
  }'::jsonb,
  '{
    "eyebrow": "藝術療癒與心理衛教",
    "title": "在日常裡練習安定，讓情緒有被理解的出口。",
    "lead": "用溫柔但可實作的方法，陪你看見焦慮、壓力與關係裡的需要，慢慢找回自己的節奏。",
    "cta": "聯絡我",
    "secondaryCta": "閱讀文章",
    "cardTitle": "你可以從這裡開始",
    "cardItems": [
      "情緒照顧：辨識與安撫",
      "焦慮壓力：身體訊號與調節",
      "睡眠議題：建立睡前儀式",
      "關係界線：溫柔但清楚",
      "自我覺察：回到自己"
    ]
  }'::jsonb,
  true
),
(
  'about',
  '{
    "title": "About",
    "paragraph1": "This site shares psychoeducation and art-therapy-inspired practices for daily emotion care.",
    "paragraph2": "Healing is a journey that can be understood and practiced gently.",
    "snapshot": "About",
    "founder": "Therapist",
    "email": "Contact",
    "domain": "Domain",
    "focus": "Focus",
    "focusValue": "Emotion care, boundaries, sleep, self-awareness"
  }'::jsonb,
  '{
    "title": "關於",
    "paragraph1": "本網站以身心健康與情緒照顧為主題，透過文章、講座與創作練習，提供可落地的陪伴與支持。",
    "paragraph2": "我們相信療癒不是一次完成，而是一段可以被理解、被練習、被溫柔對待的旅程。",
    "snapshot": "簡介",
    "founder": "心理師",
    "email": "聯絡方式",
    "domain": "網站",
    "focus": "主題",
    "focusValue": "情緒照顧、焦慮壓力、睡眠議題、關係界線、自我覺察"
  }'::jsonb,
  true
),
(
  'platforms',
  '{
    "title": "Events",
    "paragraph1": "Use this page to publish upcoming talks / workshops.",
    "paragraph2": "Links and details can be updated from the admin panel.",
    "cardTitle": "Upcoming",
    "items": [
      "Art therapy workshop",
      "Boundaries practice",
      "Sleep ritual building",
      "Collaboration invitation"
    ]
  }'::jsonb,
  '{
    "title": "講座／活動",
    "paragraph1": "此頁面用於呈現近期講座／活動資訊、報名連結與合作邀請。",
    "paragraph2": "內容可由後台管理並依活動更新。",
    "cardTitle": "近期活動",
    "items": [
      "情緒的顏色（藝術療癒工作坊）",
      "界線練習（關係與自我照顧）",
      "睡眠儀式（安定與復原）",
      "合作：企業內訓／校園講座"
    ]
  }'::jsonb,
  true
),
(
  'contact',
  '{
    "title": "Contact",
    "paragraph": "For collaboration or workshop inquiries, feel free to reach out.",
    "email": "Email",
    "github": "Link",
    "ctaTitle": "Get in Touch",
    "ctaText": "Leave a short message and we will reply on business days.",
    "ctaButton": "Send"
  }'::jsonb,
  '{
    "title": "聯絡我們",
    "paragraph": "若你有合作邀請、講座需求或想分享你的狀況，歡迎與我們聯繫。",
    "email": "電子郵件",
    "github": "連結",
    "ctaTitle": "保持聯繫",
    "ctaText": "請留下你的需求與方便的聯絡方式，我們會在工作日回覆。",
    "ctaButton": "送出訊息"
  }'::jsonb,
  true
),
(
  'footer',
  '{
    "tagline": "Take it slow. You are not alone.",
    "companyName": "Healing Space",
    "rights": "All rights reserved."
  }'::jsonb,
  '{
    "tagline": "陪你慢慢好起來。",
    "companyName": "心理師療癒空間",
    "rights": "保留所有權利。"
  }'::jsonb,
  true
),
(
  'metadata',
  '{
    "title": "Healing Space | Art Therapy & Psychoeducation",
    "description": "Gentle, practical strategies for emotion care and self-understanding."
  }'::jsonb,
  '{
    "title": "心理師療癒空間 | 藝術療癒與身心照顧",
    "description": "以藝術療癒與心理衛教為核心，分享可實作的情緒照顧方法，陪你在日常中慢慢找回穩定。"
  }'::jsonb,
  true
),
(
  'nav',
  '{"about": "About", "services": "Services", "platforms": "Events", "portfolio": "Highlights", "gallery": "Gallery", "contact": "Contact", "blog": "Blog", "privacy": "Privacy"}'::jsonb,
  '{"about": "心理師介紹", "services": "服務方式", "platforms": "講座／活動", "portfolio": "精選內容", "gallery": "作品集", "contact": "聯絡表單", "blog": "文章", "privacy": "隱私權政策"}'::jsonb,
  true
),
(
  'company',
  '{"name": "Healing Space", "nameShort": "Healing Space"}'::jsonb,
  '{"name": "心理師療癒空間", "nameShort": "心理師療癒空間"}'::jsonb,
  true
),
(
  'hamburger_nav',
  '{}'::jsonb,
  '{
    "version": 2,
    "groups": [
      {
        "id": "health-education",
        "label": "身心健康衛教",
        "items": [
          { "id": "emotion-care", "label": "情緒照顧", "target": { "type": "blog_index", "q": "情緒照顧" } },
          { "id": "anxiety-stress", "label": "焦慮壓力", "target": { "type": "blog_index", "q": "焦慮壓力" } },
          { "id": "sleep", "label": "睡眠議題", "target": { "type": "blog_index", "q": "睡眠議題" } },
          { "id": "boundaries", "label": "關係界線", "target": { "type": "blog_index", "q": "關係界線" } },
          { "id": "self-awareness", "label": "自我覺察", "target": { "type": "blog_index", "q": "自我覺察" } }
        ]
      },
      {
        "id": "book-recommendations",
        "label": "書籍推薦",
        "items": [
          { "id": "emotion-healing", "label": "情緒療癒", "target": { "type": "blog_index", "q": "情緒療癒" } },
          { "id": "relationship-repair", "label": "關係修復", "target": { "type": "blog_index", "q": "關係修復" } },
          { "id": "self-growth", "label": "自我成長", "target": { "type": "blog_index", "q": "自我成長" } },
          { "id": "healing-writing", "label": "療癒書寫", "target": { "type": "blog_index", "q": "療癒書寫" } },
          { "id": "parenting", "label": "親子教養", "target": { "type": "blog_index", "q": "親子教養" } }
        ]
      },
      {
        "id": "events",
        "label": "講座／活動",
        "items": [
          { "id": "recent-talks", "label": "近期講座", "target": { "type": "page", "path": "/platforms" } },
          { "id": "collaboration", "label": "合作邀請", "target": { "type": "page", "path": "/contact" } },
          { "id": "workshops", "label": "療癒工作坊", "target": { "type": "page", "path": "/platforms" } },
          { "id": "corporate-training", "label": "企業內訓", "target": { "type": "page", "path": "/platforms" } }
        ]
      },
      {
        "id": "about-contact",
        "label": "關於／聯絡",
        "items": [
          { "id": "about", "label": "心理師介紹", "target": { "type": "page", "path": "/about" } },
          { "id": "services", "label": "服務方式", "target": { "type": "page", "path": "/services" } },
          { "id": "faq", "label": "常見問題", "target": { "type": "page", "path": "/services", "hash": "#faq" } },
          { "id": "contact", "label": "聯絡表單", "target": { "type": "page", "path": "/contact" } }
        ]
      }
    ]
  }'::jsonb,
  true
),
(
  'gallery',
  '{}'::jsonb,
  '{}'::jsonb,
  true
);


-- ============================================
-- PART 2: 預設服務
-- ============================================

INSERT INTO services (sort_order, title_en, title_zh, description_en, description_zh, icon, is_visible) VALUES
(1, 'Psychoeducation Articles', '心理衛教文章', 
 'Articles and practices for emotion care, anxiety, sleep and boundaries.',
 '以生活化的語言整理情緒照顧、焦慮壓力、睡眠與關係界線等主題，提供可練習的小方法。',
 'book', true),
(2, 'Talks & Workshops', '講座／工作坊',
 'Experience-based talks and art-therapy-inspired workshops.',
 '不定期舉辦講座與藝術療癒工作坊，透過體驗式練習，讓方法更容易帶回日常。',
 'calendar', true),
(3, 'Collaboration', '合作邀請',
 'Invitations for schools, organizations, and corporate training.',
 '歡迎企業、學校或社群單位合作內訓／講座，主題可依需求共同規劃。',
 'handshake', true);


-- ============================================
-- PART 3: 預設作品集（可選）
-- ============================================

INSERT INTO portfolio_items (sort_order, title_en, title_zh, description_en, description_zh, url, status, badge_color, is_featured, is_visible) VALUES
(1, 'Emotion Care', '情緒照顧',
 'A curated set of practices for naming and soothing emotions.',
 '整理可落地的練習，協助你辨識與安撫情緒。',
 NULL, 'live', 'amber', true, true),
(2, 'Boundaries Practice', '界線練習',
 'Gentle but clear boundary practices.',
 '溫柔但清楚的界線練習，照顧自己也尊重彼此。',
 NULL, 'live', 'amber', false, true),
(3, 'Sleep Ritual', '睡眠儀式',
 'Small steps to build a safer bedtime ritual.',
 '用小步驟建立睡前儀式，讓身體慢慢回到安全與放鬆。',
 NULL, 'live', 'amber', false, true);


-- ============================================
-- PART 4: 預設公司設定
-- ============================================

INSERT INTO company_settings (key, value, label_en, label_zh, category) VALUES
('company_name', '心理師療癒空間', 'Company Name', '網站名稱', 'general'),
('company_name_short', '心理師療癒空間', 'Short Name', '簡稱', 'general'),
('email', 'owner@example.com', 'Contact Email', '聯絡信箱', 'contact'),
('domain', 'example.com', 'Domain', '網域', 'general'),
('github_url', '', 'Link', '連結', 'social'),
('github_repo', '', 'Repository URL', '專案庫網址', 'social'),
('founder_name', '網站管理者', 'Owner Name', '管理者姓名', 'general'),
('founder_github', '', 'Owner Link', '管理者連結', 'social'),
('home_notice_label_zh', '最新講座', 'Home Notice Label (zh)', '首頁跑馬燈標籤（zh）', 'home'),
('home_notice_text_zh', '2026/02/15「情緒的顏色」藝術療癒工作坊 開放報名中', 'Home Notice Text (zh)', '首頁跑馬燈內容（zh）', 'home'),
('home_event_cta_label_zh', '講座邀請', 'Home Event CTA Label (zh)', '首頁浮動按鈕文案（zh）', 'home'),
('home_event_cta_url', 'https://example.com', 'Home Event CTA URL', '首頁浮動按鈕連結', 'home'),
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
-- ⚠️ 重要:
-- - 請勿在 seed 檔案中提交真實 email（避免資安/隱私風險）。
-- - 請在 owner/editor 使用者「先登入一次」建立 auth.users 後，手動新增 RBAC：
--
--   insert into public.site_admins (email, role)
--   values ('you@example.com', 'owner')
--   on conflict (email) do update
--   set role = excluded.role,
--       updated_at = timezone('utc', now());
--
-- - 然後該使用者登出再登入一次（刷新 JWT claims）。
--
-- 角色說明 (Role Description):
-- - owner: 最高權限，可管理所有內容與設定
-- - editor: 編輯權限，可管理內容但無法變更系統設定
--
-- ============================================

-- Intentionally no default admins here.


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
  ('gallery', false, 2, 'Pinterest-style image gallery', 'Pinterest 風格圖片畫廊')
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
-- 完成 DONE
-- ============================================


-- ============================================
-- SEED: 畫廊假資料 (Gallery Seed Data)
-- ============================================
--
-- 版本 Version: 2.0
-- 最後更新 Last Updated: 2026-01-25
--
-- 說明：
-- - 插入畫廊分類、作品、精選（含 Home Hero）與 Hotspots。
-- - 假圖片仍使用 picsum.photos。
--
-- ============================================


-- ============================================
-- PART 1: 畫廊分類 (Gallery Categories)
-- ============================================

INSERT INTO public.gallery_categories (sort_order, name_en, name_zh, slug, is_visible) VALUES
  (1, 'Art Therapy', '藝術療癒', 'art-therapy', true),
  (2, 'Exercises', '練習資源', 'exercises', true)
ON CONFLICT (slug) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  is_visible = EXCLUDED.is_visible,
  updated_at = TIMEZONE('utc', NOW());


-- ============================================
-- PART 2: 畫廊作品 (Gallery Items)
-- ============================================

-- Category: Art Therapy
INSERT INTO public.gallery_items (
  category_id, title_en, title_zh, slug,
  description_en, description_zh,
  image_url, image_width, image_height,
  image_alt_en, image_alt_zh,
  material_en, material_zh,
  tags_en, tags_zh, is_visible
) VALUES
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'art-therapy'),
  'Materials Map', '媒材地圖',
  'materials-map',
  'A paper-texture stage for exploring materials and emotions.',
  '以紙張質地為舞台，探索媒材與情緒的連結。',
  'https://picsum.photos/seed/hero-paper/900/675',
  900, 675,
  'Paper texture background for material exploration', '媒材探索的紙張質地背景',
  'Mixed media', '複合媒材',
  ARRAY['art-therapy','materials'], ARRAY['藝術療癒','媒材'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'art-therapy'),
  'Breathing Colors', '呼吸的顏色',
  'breathing-colors',
  'A small practice: breathe, notice, and choose a color.',
  '小練習：呼吸、覺察、選一個顏色。',
  'https://picsum.photos/seed/breathing-colors/900/675',
  900, 675,
  'Soft gradient colors', '柔和漸層色彩',
  'Color pencil', '色鉛筆',
  ARRAY['practice','breathing'], ARRAY['練習','呼吸'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'exercises'),
  'Boundary Shapes', '界線的形狀',
  'boundary-shapes',
  'A gentle-but-clear boundary exercise using shapes.',
  '用形狀做一個溫柔但清楚的界線練習。',
  'https://picsum.photos/seed/boundary-shapes/900/675',
  900, 675,
  'Abstract shapes', '抽象形狀',
  'Collage', '拼貼',
  ARRAY['boundaries','relationships'], ARRAY['界線','關係'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'exercises'),
  'Sleep Ritual Notes', '睡眠儀式筆記',
  'sleep-ritual-notes',
  'Small steps to build a safer bedtime ritual.',
  '用小步驟建立睡前儀式，讓身體慢慢回到安全與放鬆。',
  'https://picsum.photos/seed/sleep-ritual/900/675',
  900, 675,
  'Warm night notes', '溫暖的夜晚筆記',
  'Ink', '墨水',
  ARRAY['sleep','ritual'], ARRAY['睡眠','儀式'],
  true
)
ON CONFLICT (category_id, slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_zh = EXCLUDED.title_zh,
  description_en = EXCLUDED.description_en,
  description_zh = EXCLUDED.description_zh,
  image_url = EXCLUDED.image_url,
  image_width = EXCLUDED.image_width,
  image_height = EXCLUDED.image_height,
  image_alt_en = EXCLUDED.image_alt_en,
  image_alt_zh = EXCLUDED.image_alt_zh,
  material_en = EXCLUDED.material_en,
  material_zh = EXCLUDED.material_zh,
  tags_en = EXCLUDED.tags_en,
  tags_zh = EXCLUDED.tags_zh,
  is_visible = EXCLUDED.is_visible,
  updated_at = TIMEZONE('utc', NOW());


-- ============================================
-- PART 3: 精選設定 (Gallery Pins)
-- ============================================

-- Ensure hero singleton is stable for seed runs
DELETE FROM public.gallery_pins WHERE surface = 'hero';

-- Home hero
INSERT INTO public.gallery_pins (surface, item_id, sort_order) VALUES
  ('hero', (
    SELECT id FROM public.gallery_items
    WHERE slug = 'materials-map'
      AND category_id = (SELECT id FROM public.gallery_categories WHERE slug = 'art-therapy')
  ), 0)
ON CONFLICT (surface, item_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- Featured items (optional)
INSERT INTO public.gallery_pins (surface, item_id, sort_order) VALUES
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'breathing-colors'), 1),
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'boundary-shapes'), 2),
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'sleep-ritual-notes'), 3)
ON CONFLICT (surface, item_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

INSERT INTO public.gallery_pins (surface, item_id, sort_order) VALUES
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'), 1),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'breathing-colors'), 2),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'boundary-shapes'), 3),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'sleep-ritual-notes'), 4)
ON CONFLICT (surface, item_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;


-- ============================================
-- PART 4: Hotspots（Home Hero）
-- ============================================

-- Reset hotspots for the hero item (seed convenience)
DELETE FROM public.gallery_hotspots
WHERE item_id = (
  SELECT id FROM public.gallery_items
  WHERE slug = 'materials-map'
    AND category_id = (SELECT id FROM public.gallery_categories WHERE slug = 'art-therapy')
);

INSERT INTO public.gallery_hotspots (
  item_id, x, y, media, preview, symbolism, description_md, read_more_url, sort_order, is_visible
) VALUES
(
  (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'),
  0.20, 0.25,
  '粉彩',
  '柔軟暈染，讓情緒有安全的出口',
  '象徵情緒的流動與釋放，讓內在感受透過色彩溫柔地被看見。',
  '粉彩質地柔軟，易於塗抹與混色，觸感溫柔。\n\n可以用手指輕柔推開，創造漸層與柔和的色彩過渡，適合表達細膩情緒。',
  NULL, NULL, true
),
(
  (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'),
  0.45, 0.35,
  '拼貼',
  '把碎片重新排列，找回可掌握的秩序',
  '代表重整破碎經驗，從混亂中創造新的意義與秩序。',
  '將不同材質、圖像剪裁後重新組合。\n\n你可以選擇、移動、調整位置，在創作過程中重新建立掌控感。',
  NULL, NULL, true
),
(
  (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'),
  0.70, 0.30,
  '壓克力',
  '飽和色彩，承載強烈情緒的重量',
  '象徵情緒的力量與強度，給予表達的勇氣。',
  '色彩濃烈、覆蓋性強，可以層層堆疊或快速揮灑。\n\n適合表達強烈、直接的情緒狀態。',
  NULL, NULL, true
),
(
  (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'),
  0.30, 0.60,
  '水墨',
  '留白與暈染，在不確定中找到平衡',
  '代表接納不確定性，在失控與掌控之間找到共存的智慧。',
  '墨色在水中暈開，形態難以完全掌控。\n\n需要與材料對話，在流動與等待中尋找平衡。',
  NULL, NULL, true
),
(
  (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'),
  0.55, 0.65,
  '布料與線材',
  '編織連結，修補關係的裂痕',
  '象徵關係的修復與重建，每一針都是對自己或他人的溫柔照顧。',
  '透過縫補、編織、纏繞的動作，體驗連結與修復。\n\n觸覺溫暖，過程緩慢而具儀式感。',
  NULL, NULL, true
),
(
  (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'),
  0.78, 0.70,
  '自然素材',
  '與大地連結，回到最初的安定',
  '象徵回歸本質，與自然和內在重新連結，找回安定的根基。',
  '使用樹葉、石頭、樹枝等自然材料創作。\n\n觸感真實，帶有生命的溫度與質地。',
  NULL, NULL, true
),
(
  (SELECT id FROM public.gallery_items WHERE slug = 'materials-map'),
  0.15, 0.75,
  '蠟筆',
  '童年的溫度，重返純真的表達',
  '象徵回到最初的自己，用純真的眼光重新看待內在世界。',
  '色彩柔和，筆觸帶有手作溫度。\n\n使用過程喚起童年記憶，降低創作門檻。',
  NULL, NULL, true
);


-- ============================================
-- 完成 DONE
-- ============================================


-- ============================================
-- SEED: 部落格假資料 (Blog Seed Data)
-- ============================================
--
-- 版本 Version: 3.0
-- 最後更新 Last Updated: 2026-01-27
--
-- 說明：
-- - 插入部落格分類與文章假資料（用於 Home Suggest section / blog listing）
-- - 插入 Blog Taxonomy v2（Groups/Topics/Tags）假資料
-- - 假圖片使用 picsum.photos 作為封面來源
--
-- ============================================


-- ============================================
-- PART 0: Blog Taxonomy v2 (Groups/Topics/Tags)
-- ============================================
-- 依據 PRD：身心健康衛教 / 書籍推薦 為大分類 (Groups)
-- Topics 為細分主題（例如情緒照顧、焦慮壓力等）

-- blog_groups: 大分類
INSERT INTO public.blog_groups (slug, name_zh, sort_order, is_visible) VALUES
  ('health-education', '身心健康衛教', 1, true),
  ('book-recommendations', '書籍推薦', 2, true)
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  sort_order = EXCLUDED.sort_order,
  is_visible = EXCLUDED.is_visible,
  updated_at = TIMEZONE('utc', NOW());

-- blog_topics: 子主題（身心健康衛教下的主題）
INSERT INTO public.blog_topics (group_id, slug, name_zh, sort_order, is_visible) VALUES
  ((SELECT id FROM public.blog_groups WHERE slug = 'health-education'), 'emotion-care', '情緒照顧', 1, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'health-education'), 'anxiety-stress', '焦慮壓力', 2, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'health-education'), 'sleep', '睡眠議題', 3, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'health-education'), 'boundaries', '關係界線', 4, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'health-education'), 'self-awareness', '自我覺察', 5, true)
ON CONFLICT (slug) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name_zh = EXCLUDED.name_zh,
  sort_order = EXCLUDED.sort_order,
  is_visible = EXCLUDED.is_visible,
  updated_at = TIMEZONE('utc', NOW());

-- blog_topics: 書籍推薦下的主題
INSERT INTO public.blog_topics (group_id, slug, name_zh, sort_order, is_visible) VALUES
  ((SELECT id FROM public.blog_groups WHERE slug = 'book-recommendations'), 'emotion-healing-books', '情緒療癒', 1, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'book-recommendations'), 'relationship-repair-books', '關係修復', 2, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'book-recommendations'), 'self-growth-books', '自我成長', 3, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'book-recommendations'), 'healing-writing-books', '療癒書寫', 4, true),
  ((SELECT id FROM public.blog_groups WHERE slug = 'book-recommendations'), 'parenting-books', '親子教養', 5, true)
ON CONFLICT (slug) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name_zh = EXCLUDED.name_zh,
  sort_order = EXCLUDED.sort_order,
  is_visible = EXCLUDED.is_visible,
  updated_at = TIMEZONE('utc', NOW());

-- blog_tags: 自由標籤（示範用）
INSERT INTO public.blog_tags (slug, name_zh) VALUES
  ('beginner', '入門'),
  ('practice', '實作練習'),
  ('recommended', '精選推薦'),
  ('work-life', '職場生活')
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  updated_at = TIMEZONE('utc', NOW());


-- ============================================
-- PART 1: 部落格分類 (Blog Categories) - Legacy
-- ============================================
-- 保留既有 categories 以維持向後相容

INSERT INTO public.categories (name_en, name_zh, slug) VALUES
  ('Emotion Care', '情緒照顧', 'emotion-care'),
  ('Anxiety & Stress', '焦慮壓力', 'anxiety-stress'),
  ('Sleep', '睡眠議題', 'sleep'),
  ('Boundaries', '關係界線', 'boundaries'),
  ('Self-Awareness', '自我覺察', 'self-awareness')
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh;


-- ============================================
-- PART 2: 部落格文章 (Blog Posts)
-- ============================================

INSERT INTO public.posts (
  title_en, title_zh,
  slug,
  content_en, content_zh,
  excerpt_en, excerpt_zh,
  cover_image_url,
  cover_image_alt_en, cover_image_alt_zh,
  category_id,
  visibility,
  published_at,
  reading_time_minutes
) VALUES
(
  'When Anxiety Arrives, What Is Your Body Saying?',
  '焦慮來時，身體在說什麼？',
  'anxiety-body-signals',
  'A short guide to noticing body signals when anxiety arrives.',
  '## 焦慮來時，先回到身體\n\n焦慮常常不是「想太多」，而是身體在提醒我們：現在需要安全。\n\n### 你可以試試看\n\n1. **找一個點**：把注意力放在腳底或背部。\n2. **命名感受**：例如「胸口緊」、「呼吸淺」。\n3. **延長吐氣**：吸 4 秒、吐 6 秒，做 5 次。\n\n> 目標不是把焦慮趕走，而是讓身體知道：你正在照顧它。',
  'Notice your body first—then you can choose a calmer next step.',
  '先回到身體，再選擇下一步：用簡單的覺察與呼吸，讓身體慢慢恢復安全感。',
  'https://picsum.photos/seed/anxiety/1200/630',
  'Soft abstract background', '柔和的抽象背景',
  (SELECT id FROM public.categories WHERE slug = 'anxiety-stress'),
  'public',
  TIMEZONE('utc', NOW()) - INTERVAL '3 days',
  4
),
(
  'Boundaries: Gentle but Clear Practice',
  '建立界線：溫柔但清楚的練習',
  'building-boundaries',
  'A practical boundary script you can rehearse before hard conversations.',
  '## 建立界線，不等於拒絕\n\n界線是「我如何照顧自己」的方式，而不是對對方的評價。\n\n### 一句話練習（模板）\n\n- 我理解你在意的是 ___。\n- **同時**我目前能做到的是 ___。\n- 如果你願意，我們可以一起找一個雙方都可以的方式。\n\n把句子寫下來、唸出來，讓身體先熟悉。',
  'A boundary can be kind—and still be a boundary.',
  '界線可以很溫柔，也可以很清楚：用模板句練習，讓自己在關係裡更穩定。',
  'https://picsum.photos/seed/boundaries/1200/630',
  'Simple geometric shapes', '簡單幾何形狀',
  (SELECT id FROM public.categories WHERE slug = 'boundaries'),
  'public',
  TIMEZONE('utc', NOW()) - INTERVAL '2 days',
  4
),
(
  '3 Small Self-Care Practices You Can Start Today',
  '自我照顧的 3 個小方法',
  'self-care-methods',
  'Three tiny, repeatable practices that make self-care doable.',
  '## 自我照顧不是額外的「任務」\n\n把自我照顧做小、做輕，才能做得久。\n\n1. **三分鐘整理呼吸**：只做「吐氣更長」。\n2. **一杯水的儀式**：喝水時不滑手機，讓身體被你看見。\n3. **一句話對自己好**：把今天最困難的地方寫成一句話，然後加上「我已經很努力了」。\n\n從一個開始就好。',
  'Self-care works best when it is small and repeatable.',
  '自我照顧做小、做輕，才能做得久：三個可以立刻開始的小方法。',
  'https://picsum.photos/seed/self-care/1200/630',
  'Warm minimal background', '溫暖極簡背景',
  (SELECT id FROM public.categories WHERE slug = 'emotion-care'),
  'public',
  TIMEZONE('utc', NOW()) - INTERVAL '1 day',
  3
),
(
  'How Does Safety Grow in Relationships?',
  '關係裡的安全感如何長出來？',
  'relationship-safety',
  'Safety grows through predictability, repair, and small promises kept.',
  '## 安全感不是「不吵架」\n\n安全感比較像是：衝突後仍然願意回來。\n\n### 三個練習\n\n- **可預期**：把「我會晚到」說清楚。\n- **修復**：一句「剛才我太急了」就能開門。\n- **小承諾**：能做到的才答應。\n\n安全感是累積出來的。',
  'Safety grows through repair and small promises kept.',
  '安全感不是不吵架，而是衝突後仍願意修復：用可預期、修復與小承諾慢慢累積。',
  'https://picsum.photos/seed/relationship/1200/630',
  'Soft warm texture', '柔和溫暖的質地',
  (SELECT id FROM public.categories WHERE slug = 'self-awareness'),
  'public',
  TIMEZONE('utc', NOW()),
  4
)
ON CONFLICT (slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_zh = EXCLUDED.title_zh,
  content_en = EXCLUDED.content_en,
  content_zh = EXCLUDED.content_zh,
  excerpt_en = EXCLUDED.excerpt_en,
  excerpt_zh = EXCLUDED.excerpt_zh,
  cover_image_url = EXCLUDED.cover_image_url,
  cover_image_alt_en = EXCLUDED.cover_image_alt_en,
  cover_image_alt_zh = EXCLUDED.cover_image_alt_zh,
  category_id = EXCLUDED.category_id,
  visibility = EXCLUDED.visibility,
  published_at = EXCLUDED.published_at,
  reading_time_minutes = EXCLUDED.reading_time_minutes,
  updated_at = TIMEZONE('utc', NOW());


-- ============================================
-- PART 3: 設定文章的 group_id
-- ============================================
-- 將所有現有文章設定為「身心健康衛教」大分類

UPDATE public.posts
SET group_id = (SELECT id FROM public.blog_groups WHERE slug = 'health-education')
WHERE group_id IS NULL;


-- ============================================
-- PART 4: 文章與 Topics 關聯 (post_topics)
-- ============================================

-- anxiety-body-signals -> 焦慮壓力
INSERT INTO public.post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_topics t
WHERE p.slug = 'anxiety-body-signals' AND t.slug = 'anxiety-stress'
ON CONFLICT (post_id, topic_id) DO NOTHING;

-- building-boundaries -> 關係界線
INSERT INTO public.post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_topics t
WHERE p.slug = 'building-boundaries' AND t.slug = 'boundaries'
ON CONFLICT (post_id, topic_id) DO NOTHING;

-- self-care-methods -> 情緒照顧
INSERT INTO public.post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_topics t
WHERE p.slug = 'self-care-methods' AND t.slug = 'emotion-care'
ON CONFLICT (post_id, topic_id) DO NOTHING;

-- relationship-safety -> 自我覺察, 關係界線（多主題示範）
INSERT INTO public.post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_topics t
WHERE p.slug = 'relationship-safety' AND t.slug = 'self-awareness'
ON CONFLICT (post_id, topic_id) DO NOTHING;

INSERT INTO public.post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_topics t
WHERE p.slug = 'relationship-safety' AND t.slug = 'boundaries'
ON CONFLICT (post_id, topic_id) DO NOTHING;


-- ============================================
-- PART 5: 文章與 Tags 關聯 (post_tags)
-- ============================================

-- anxiety-body-signals -> 入門, 實作練習
INSERT INTO public.post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_tags t
WHERE p.slug = 'anxiety-body-signals' AND t.slug = 'beginner'
ON CONFLICT (post_id, tag_id) DO NOTHING;

INSERT INTO public.post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_tags t
WHERE p.slug = 'anxiety-body-signals' AND t.slug = 'practice'
ON CONFLICT (post_id, tag_id) DO NOTHING;

-- self-care-methods -> 實作練習, 精選推薦
INSERT INTO public.post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_tags t
WHERE p.slug = 'self-care-methods' AND t.slug = 'practice'
ON CONFLICT (post_id, tag_id) DO NOTHING;

INSERT INTO public.post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.posts p, public.blog_tags t
WHERE p.slug = 'self-care-methods' AND t.slug = 'recommended'
ON CONFLICT (post_id, tag_id) DO NOTHING;


-- ============================================
-- 完成 DONE (Blog Seed)
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


-- ============================================
-- SEED: Safety Risk Engine Default Data
-- ============================================
-- 
-- Version: 1.0
-- Last Updated: 2026-01-17
--
-- Inserts default safety_settings singleton row.
--
-- @see doc/specs/completed/safety-risk-engine-spec.md
--
-- ============================================


-- ============================================
-- Default safety_settings (singleton id=1)
-- ============================================
--
-- is_enabled: false (start disabled, manually enable)
-- model_id: gemini-1.5-flash (Gemini default)
-- timeout_ms: 1500ms (within 2000ms latency budget)
-- risk_threshold: 0.70 (moderate sensitivity)
--
-- ============================================

INSERT INTO public.safety_settings (
  id,
  is_enabled,
  model_id,
  timeout_ms,
  risk_threshold,
  training_active_batch,
  held_message,
  rejected_message,
  layer1_blocklist
)
VALUES (
  1,
  false,
  'gemini-1.5-flash',
  1500,
  0.70,
  '2026-01_cold_start',
  'Your comment is being reviewed and will appear shortly.',
  'Your comment could not be posted. Please try again later.',
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Safe migration: update legacy default model_id if unchanged
UPDATE public.safety_settings
SET model_id = 'gemini-1.5-flash'
WHERE id = 1
  AND model_id = 'openai/gpt-4o-mini';

-- Ensure training_active_batch is present (safe, idempotent)
UPDATE public.safety_settings
SET training_active_batch = COALESCE(training_active_batch, '2026-01_cold_start')
WHERE id = 1;


-- ============================================
-- 完成 DONE
-- ============================================
