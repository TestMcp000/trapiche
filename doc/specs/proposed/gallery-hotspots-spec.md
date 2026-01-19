# Gallery Hotspots（圖上 Pin）+ Home Hero 選圖 - Spec

> Status: DRAFT  
> Last Updated: 2026-01-19  
> Note: if referenced by in-code `@see`, keep headings stable (avoid renumbering/moving sections).

## 1. Purpose

- 定義「Home Hero 從 Gallery 選圖」與「Gallery/ Hero 圖上 hotspots（pins）」的資料模型、排序規則、Markdown 安全邊界與快取失效規則。
- 讓落地時不會 drift 在：DB 欄位/RLS、排序語意、Markdown 外連安全、revalidateTag/Path 範圍。

## 2. Components (SSoT paths)

- Schema / migrations:
  - `supabase/02_add/04_gallery.sql`（extend `gallery_pin_surface` + hero uniqueness）
  - `supabase/02_add/20_gallery_hotspots.sql`（new table + indexes + RLS + grants）
  - `supabase/COMBINED_ADD.sql`（mirror changes）
- App endpoints (admin routes / server actions):
  - `app/[locale]/admin/gallery/**`（hero selection + hotspots CRUD/reorder；exact routes TBD by UI）
- IO modules:
  - `lib/modules/gallery/gallery-pins-io.ts`（public reads; already exists）
  - `lib/modules/gallery/pins-admin-io.ts`（admin writes; extend for surface=`hero`）
  - `lib/modules/gallery/gallery-hotspots-io.ts`（public reads; new）
  - `lib/modules/gallery/hotspots-admin-io.ts`（admin CRUD + reorder; new）
  - `lib/modules/gallery/cached.ts`（cached wrappers; extend）
  - `lib/types/gallery.ts`（types/contracts; extend）
- Markdown pipeline (server-only):
  - `lib/markdown/server.ts`（trusted admin markdown; **do not reuse** for hotspots）
  - `lib/markdown/hotspots.ts`（new safe pipeline; server-only）
- UI (shared pins overlay):
  - `uiux/src/app/components/artwork-stage.tsx`（pins % coords + hover motion reference）
  - `uiux/src/app/components/material-detail.tsx`（modal card behavior reference）

## 3. Security Model

- Trust boundary:
  - `site_content` / blog posts 的 markdown 目前允許 raw HTML（trusted admin）。
  - hotspots 會出現在 Home/Hero（曝光面更大），因此必須走「更保守」的 markdown→html pipeline：禁 raw HTML + sanitize/allowlist。
- Supabase roles:
  - Public（`anon`/`authenticated`）：只能讀「可見作品」的可見 hotspots。
  - Admin（JWT `app_metadata.role` ∈ `{owner, editor}`）：可 CRUD gallery hotspots、設定 hero。
- Public SSR cache safety:
  - Public read 必須使用 `createAnonClient()`（不得帶 cookies）並包在 `cachedQuery`。
  - Admin write 使用 `createClient()`（帶 cookie context，依 RLS 授權）。

## 4. Data Model / Contracts

### 4.1 Hero selection（`gallery_pins(surface='hero')`）

- Extend enum:
  - `public.gallery_pin_surface` 新增值：`'hero'`
- Uniqueness (critical invariant):
  - `gallery_pins` 既有 `UNIQUE(surface, item_id)` 保留（同 item 不可重複 pin 同 surface）。
  - 新增 partial unique index 保證 **hero 最多 1 筆**：
    - `UNIQUE(surface) WHERE surface='hero'`
- Admin write behavior:
  - 設定 hero =「先清空舊 hero，再插入新 hero」（或 upsert + transaction）。
  - `sort_order` 對 hero 無語意；建議固定 `0`（避免 UI 誤用）。

### 4.2 `gallery_hotspots` table

> 命名：DB/API 用 `hotspot`（或 `annotation`）避免與既有 `gallery_pins`（featured pins）混淆。

- Table: `public.gallery_hotspots`
- Fields:
  - `id UUID PK DEFAULT gen_random_uuid()`
  - `item_id UUID NOT NULL REFERENCES public.gallery_items(id) ON DELETE CASCADE`
  - `x DOUBLE PRECISION NOT NULL`（normalized 0..1）
  - `y DOUBLE PRECISION NOT NULL`（normalized 0..1）
  - `media TEXT NOT NULL`
  - `preview TEXT NULL`（一句話 preview）
  - `symbolism TEXT NULL`（象徵意涵）
  - `description_md TEXT NOT NULL`（Markdown 詳述；sanitize pipeline 定義於 §4.4）
  - `read_more_url TEXT NULL`（optional；用於 UI 固定 CTA「延伸閱讀」）
  - `sort_order INTEGER NULL`（manual ordering；見 §4.3）
  - `is_visible BOOLEAN NOT NULL DEFAULT true`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())`
- Constraints:
  - `CHECK (x >= 0 AND x <= 1)`
  - `CHECK (y >= 0 AND y <= 1)`
  - `CHECK (description_md <> '')`
  -（選配）`CHECK (read_more_url IS NULL OR read_more_url LIKE 'https://%')`（更精準的 URL allowlist 建議放在 app validator）
- Indexes:
  - `INDEX (item_id)`
  - `INDEX (item_id, sort_order)`
  - `INDEX (item_id, created_at)`
- RLS policies:
  - Public read（anon/authenticated）：
    - `gallery_hotspots.is_visible = true`
    - 且關聯的 `gallery_items.is_visible = true`
  - Admin manage（authenticated w/ role owner/editor）：
    - `FOR ALL` 允許 CRUD
- Grants（required for RLS policies to take effect）：
  - `GRANT SELECT ON public.gallery_hotspots TO anon, authenticated;`
  - `GRANT INSERT, UPDATE, DELETE ON public.gallery_hotspots TO authenticated;`

### 4.3 Hotspot ordering（single source）

> 排序影響：「行動裝置/無障礙 fallback list」與「鍵盤 focus 順序」。圖片上的 pin 位置（x/y）不受排序影響。

- Order mode definition（per `item_id`）：
  - **Auto mode**：該作品所有 hotspots 的 `sort_order` 皆為 `NULL`。
    - Read order：`ORDER BY y ASC, x ASC, created_at ASC`
  - **Manual mode**：該作品所有 hotspots 的 `sort_order` 皆為非 `NULL`。
    - Read order：`ORDER BY sort_order ASC, created_at ASC`
- Transition:
  - 管理員第一次「拖曳排序並儲存」時，系統必須把該作品所有 hotspots 的 `sort_order` 寫滿 `0..n-1`（進入 manual mode）。
- Insert rule（你已拍板的版本）：
  - Auto mode：新增 hotspot 時 `sort_order = NULL`（維持 auto）。
  - Manual mode：新增 hotspot 時 `sort_order = max(sort_order)+1`（永遠 append 到最後，避免破壞既有敘事順序）。
- Update rule:
  - 拖曳 pin 調整位置（x/y）不應修改 `sort_order`。
  - 只有在「拖曳排序清單」儲存時才更新 `sort_order`。

### 4.4 Markdown safety boundary（hotspots only）

- Input:
  - `description_md` 支援 GFM subset（建議：paragraph/strong/em/list/link/inline-code/blockquote）。
  - **禁止 raw HTML**（`<script>`, `<img>`, `<iframe>` 等不得通過）。
- Sanitization:
  - markdown→html pipeline 必須在 server-only module 實作（例如 `lib/markdown/hotspots.ts`）。
  - 以 allowlist schema sanitize（建議引入 `rehype-sanitize`）。
- Links:
  - 允許外連但僅允許 `https:`（可選 `mailto:`）。
  - 禁止 `http:` / `javascript:` / `data:` / 其他協議。
  - 輸出時強制：
    - `target="_blank"`
    - `rel="noopener noreferrer"`
- Raw HTML:
  - hotspots pipeline 必須固定 `allowDangerousHtml: false`（不得沿用 `lib/markdown/server.ts`）。

## 5. Flows

### 5.1 Happy Path

1. Admin 在後台上傳/編輯作品（`gallery_items`）並進入 Hotspots 編輯模式。
2. Admin 在圖片上點選/拖曳新增 pin，輸入 `media`、`description_md`（選填 `preview`、`symbolism`、`read_more_url`），儲存後寫入 `gallery_hotspots`。
3. Admin（可選）在 Hotspot 清單拖曳排序並儲存；系統寫入 `sort_order` 並切換該作品進入 manual mode。
4. Admin 在後台指定某個作品為 Home Hero（`gallery_pins(surface='hero')`），或清除 hero。
5. Public Home SSR 讀取 hero item + hotspots 並渲染 pins；hover 有 motion；點擊顯示資訊卡；X/點背景關閉；行動裝置提供 fallback list。

### 5.2 Failure Paths

- 超過上限（`company_settings.gallery_hotspots_max`）：admin UI 阻止新增並提示；server 仍需做二次保護（回傳錯誤）。
- `x/y` 不在 0..1：DB check constraint 拒絕寫入（400/validation error）。
- `read_more_url` 不符合 allowlist：validator 拒絕（不寫入）並顯示錯誤。
- Markdown 含不允許的 raw HTML / 協議：sanitize 後移除不安全內容；若全空則視為 invalid（回傳錯誤或要求修正）。
- 權限不足（非 owner/editor）：RLS 拒絕（401/403），不得依賴 UI gate。

## 6. Idempotency / Concurrency / Caching (Optional)

- Cache tags（public SSR reads）：
  - Gallery pins（含 hero surface）：tag `gallery`
  - Gallery hotspots：tag `gallery`
- Cache invalidation（admin mutations）：
  - 任一 hotspots CRUD / reorder / hero selection 更新後：
    - `revalidateTag('gallery', { expire: 0 })`
    -（選配）`revalidatePath('/[locale]', 'page')`、`revalidatePath('/[locale]/gallery/**')` 以縮短路由快取的感知延遲
- Concurrency / last-write-wins:
  - Hotspot reorder 儲存以「完整 ordered ids」為輸入；後寫入者覆蓋前者（必要時可加入 `updated_at` precondition）。
  - Hero selection 由 DB partial unique index 擋住競態；寫入邏輯需處理 unique violation（重試或回傳明確錯誤）。

## 7. Related Docs

- PRD: `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`
- Constraints: `doc/ARCHITECTURE.md`
- UIUX SSoT: `uiux/` + https://pond-bulk-99292481.figma.site/
- Specs index: `doc/specs/README.md`

