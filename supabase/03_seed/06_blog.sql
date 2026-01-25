-- ============================================
-- SEED: 部落格假資料 (Blog Seed Data)
-- ============================================
--
-- 版本 Version: 2.0
-- 最後更新 Last Updated: 2026-01-25
--
-- 說明：
-- - 插入部落格分類與文章假資料（用於 Home Suggest section / blog listing）
-- - 假圖片使用 picsum.photos 作為封面來源
--
-- ============================================


-- ============================================
-- PART 1: 部落格分類 (Blog Categories)
-- ============================================

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
-- 完成 DONE
-- ============================================

