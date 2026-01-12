-- ============================================
-- SEED: 畫廊假資料 (Gallery Seed Data)
-- ============================================
--
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-22
--
-- 說明：插入畫廊分類、作品與精選設定
-- 使用 picsum.photos 作為假圖片來源
--
-- ============================================


-- ============================================
-- PART 1: 畫廊分類 (Gallery Categories)
-- ============================================

INSERT INTO public.gallery_categories (sort_order, name_en, name_zh, slug, is_visible) VALUES
  (1, 'Product Design', '產品設計', 'product-design', true),
  (2, 'UI/UX Design', '介面設計', 'ui-ux-design', true),
  (3, 'Illustration', '插畫創作', 'illustration', true);


-- ============================================
-- PART 2: 畫廊作品 (Gallery Items)
-- ============================================

-- Category 1: Product Design (產品設計)
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
  'Smart Home Hub', '智慧家庭中樞',
  'smart-home-hub',
  'A minimalist smart home control device featuring an intuitive touch interface and seamless IoT integration.',
  '極簡風格智慧家庭控制裝置，具備直覺觸控介面與無縫物聯網整合。',
  'https://picsum.photos/seed/product1/800/600',
  800, 600,
  'Smart home hub device with glowing touch interface', '智慧家庭中樞裝置與發光觸控介面',
  'Aluminum, Glass, LED', '鋁合金、玻璃、LED',
  ARRAY['product', 'iot', 'smart-home'], ARRAY['產品', '物聯網', '智慧家庭'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'product-design'),
  'Wireless Earbuds Case', '無線耳機充電盒',
  'wireless-earbuds-case',
  'Ergonomic charging case design with magnetic closure and premium matte finish.',
  '人體工學充電盒設計，具備磁吸開合與高級霧面質感。',
  'https://picsum.photos/seed/product2/800/600',
  800, 600,
  'Minimalist wireless earbuds charging case', '極簡無線耳機充電盒',
  'Polycarbonate, Silicone', '聚碳酸酯、矽膠',
  ARRAY['product', 'audio', 'wearable'], ARRAY['產品', '音訊', '穿戴裝置'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'product-design'),
  'Portable Projector', '便攜投影機',
  'portable-projector',
  'Compact cinema-quality projector with 4K support and built-in smart TV features.',
  '緊湊型影院級投影機，支援 4K 畫質與內建智慧電視功能。',
  'https://picsum.photos/seed/product3/800/600',
  800, 600,
  'Sleek portable projector with ambient light', '時尚便攜投影機與環境光',
  'Aluminum, ABS Plastic', '鋁合金、ABS 塑膠',
  ARRAY['product', 'entertainment', 'portable'], ARRAY['產品', '娛樂', '便攜'],
  true
);

-- Category 2: UI/UX Design (介面設計)
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
  'Finance Dashboard', '金融儀表板',
  'finance-dashboard',
  'Dark-themed financial analytics dashboard with real-time data visualization and portfolio tracking.',
  '深色主題金融分析儀表板，具備即時數據視覺化與投資組合追蹤。',
  'https://picsum.photos/seed/uiux1/1200/800',
  1200, 800,
  'Financial dashboard interface with charts and graphs', '金融儀表板介面與圖表',
  'Figma, React', 'Figma、React',
  ARRAY['ui', 'dashboard', 'fintech'], ARRAY['介面', '儀表板', '金融科技'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'ui-ux-design'),
  'Health Tracking App', '健康追蹤應用',
  'health-tracking-app',
  'Mobile app design for comprehensive health monitoring with gamification elements.',
  '手機應用設計，提供全方位健康監測與遊戲化元素。',
  'https://picsum.photos/seed/uiux2/800/1200',
  800, 1200,
  'Mobile health app with activity rings and stats', '行動健康應用與活動圈與統計',
  'Figma, Swift UI', 'Figma、Swift UI',
  ARRAY['ui', 'mobile', 'health'], ARRAY['介面', '行動裝置', '健康'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'ui-ux-design'),
  'E-commerce Checkout Flow', '電商結帳流程',
  'ecommerce-checkout',
  'Streamlined checkout experience designed to reduce cart abandonment and improve conversion.',
  '精簡結帳體驗設計，旨在降低購物車放棄率並提升轉換率。',
  'https://picsum.photos/seed/uiux3/1200/800',
  1200, 800,
  'E-commerce checkout page with payment options', '電商結帳頁面與付款選項',
  'Figma, Next.js', 'Figma、Next.js',
  ARRAY['ui', 'ecommerce', 'checkout'], ARRAY['介面', '電商', '結帳'],
  true
);

-- Category 3: Illustration (插畫創作)
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
  'Cyberpunk City', '賽博朋克城市',
  'cyberpunk-city',
  'Futuristic cityscape illustration featuring neon lights, flying vehicles, and towering skyscrapers.',
  '未來城市風景插畫，展現霓虹燈光、飛行載具與摩天大樓。',
  'https://picsum.photos/seed/illust1/1000/1400',
  1000, 1400,
  'Neon-lit cyberpunk city at night', '霓虹燈光下的賽博朋克夜城',
  'Digital, Procreate', '數位、Procreate',
  ARRAY['illustration', 'sci-fi', 'cyberpunk'], ARRAY['插畫', '科幻', '賽博朋克'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'illustration'),
  'Forest Spirit', '森林精靈',
  'forest-spirit',
  'Mystical creature illustration blending nature elements with ethereal fantasy aesthetics.',
  '神秘生物插畫，融合自然元素與空靈奇幻美學。',
  'https://picsum.photos/seed/illust2/1000/1400',
  1000, 1400,
  'Ethereal forest spirit surrounded by glowing flora', '被發光植物環繞的飄渺森林精靈',
  'Digital, Photoshop', '數位、Photoshop',
  ARRAY['illustration', 'fantasy', 'nature'], ARRAY['插畫', '奇幻', '自然'],
  true
),
(
  (SELECT id FROM public.gallery_categories WHERE slug = 'illustration'),
  'Space Explorer', '太空探險家',
  'space-explorer',
  'Character illustration of an astronaut discovering alien landscapes on a distant planet.',
  '太空人角色插畫，在遙遠星球上探索外星地景。',
  'https://picsum.photos/seed/illust3/1000/1400',
  1000, 1400,
  'Astronaut exploring colorful alien planet', '太空人探索繽紛外星球',
  'Digital, Clip Studio', '數位、Clip Studio',
  ARRAY['illustration', 'space', 'character'], ARRAY['插畫', '太空', '角色'],
  true
);


-- ============================================
-- PART 3: 精選設定 (Gallery Pins)
-- ============================================

-- Pin 3 items to home page
INSERT INTO public.gallery_pins (surface, item_id, sort_order) VALUES
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'smart-home-hub'), 1),
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'finance-dashboard'), 2),
  ('home', (SELECT id FROM public.gallery_items WHERE slug = 'cyberpunk-city'), 3);

-- Pin 6 items to gallery page
INSERT INTO public.gallery_pins (surface, item_id, sort_order) VALUES
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'smart-home-hub'), 1),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'wireless-earbuds-case'), 2),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'finance-dashboard'), 3),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'health-tracking-app'), 4),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'cyberpunk-city'), 5),
  ('gallery', (SELECT id FROM public.gallery_items WHERE slug = 'forest-spirit'), 6);


-- ============================================
-- 完成 DONE
-- ============================================
