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
