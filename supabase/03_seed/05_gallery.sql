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
