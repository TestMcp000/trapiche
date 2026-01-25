# 專案修復方案（全專案）

> Last Updated: 2026-01-25  
> 目標：移除舊科技公司模板的硬編碼/假資料，改為 seed 匯入；修復 Google OAuth 登入後回到登入頁的問題；補齊可讓運維上線的文件與檢查點。  
> 約束：必須符合 `ARCHITECTURE.md` 與 `doc/SPEC.md` 的規範（server-first、cached reads、RLS/secret boundary、SEO、低 client bundle）。

---

## A. 現況快照（本次已先落地的修復）

1. **修復 OAuth/Session 重新導向問題（P0）**
   - 使用 Next.js 16 的 `proxy.ts` 檔案慣例（包含 `updateSession()` + next-intl routing + `?code=` fallback redirect）。
   - 目的：避免 Supabase OAuth 回到 Site URL（例如 `/<locale>?code=...`）時沒有被導向到 `/auth/callback` 交換 session，導致 server 端看不到登入狀態而回到登入頁。

2. **移除舊品牌硬編碼（P0）**
   - 清掉 code 中 `Quantum Nexus LNK` 等硬編碼，SEO JSON-LD publisher 改為不硬編品牌名。
   - Home「Suggest」由 DB 文章（latest 4 public posts）驅動，移除 hardcoded list。

3. **Seed 資料已改為新專案方向（P0）**
   - 更新 `supabase/03_seed/*` 與重建 `supabase/COMBINED_SEED.sql`：移除舊公司文案/分類/作品，改為符合 UIUX v2 的示範資料（Home Hero pins + hotspots、文章建議清單等）。
   - 移除 seed 內 hardcode 管理員 email（避免資安/隱私風險），改為「上線/測試時手動 insert `site_admins`」。

---

## B. P0：先讓登入/後台可用（含 DB 未匯入的前置）

### B1. Supabase DB 匯入（你目前卡住的地方）

> DB 尚未匯入時，很多 server gate / RLS / cached reads 都會出現「看起來像沒登入」或「資料讀不到」的症狀。

1. **Supabase Dashboard → SQL Editor**
2. 依序執行（全新專案建議）：
   - `supabase/COMBINED_ADD.sql`
   - `supabase/COMBINED_SEED.sql`
3. 執行完後到 Table Editor 確認至少存在：
   - `site_content`, `company_settings`
   - `gallery_categories`, `gallery_items`, `gallery_pins`, `gallery_hotspots`
   - `categories`, `posts`
   - `site_admins`

### B2. Google OAuth 設定核對（避免 callback 正確但 app 端拿不到 session）

1. Google Cloud Console（OAuth client）：
   - Authorized redirect URI（固定 Supabase callback）：`https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → URL Configuration：
   - Site URL：
     - dev：`http://localhost:3000`
     - prod：`https://<your-domain>`
   - Redirect URLs（**必須包含**）：
     - `http://localhost:3000/auth/callback`
     - `https://<your-domain>/auth/callback`

### B3. 後台權限（RLS 最終邊界，UI gate 只是 UX）

> `ADMIN_ALLOWED_EMAILS` 只是「UI gate fallback」；真正決定 DB 是否允許寫入的是 JWT `app_metadata.role`（由 `site_admins` 觸發同步）。

1. 先用你的 Google 帳號登入一次：`/<locale>/login`
2. Supabase SQL Editor 執行（用你的 email 取代）：
   ```sql
   insert into public.site_admins (email, role)
   values ('you@example.com', 'owner')
   on conflict (email) do update
   set role = excluded.role,
       updated_at = timezone('utc', now());
   ```
3. 登出再登入一次（刷新 JWT claims）
4. 進入 `/<locale>/admin` 應能正常進後台

---

## C. P0：硬編碼/模板資料移除清單（要刪的 / 已刪的 / 接下來刪）

### C1. 已先移除（已落地）

1. **Next proxy 入口**：使用 `proxy.ts` → OAuth session 可交換、cookie 可同步。
2. **SEO/JSON-LD 的品牌硬編碼**：publisher/siteName 不再固定寫死舊公司名稱。
3. **Home Suggest 硬編碼文章清單**：改由 DB 最新 4 篇 public posts 驅動。
4. **Seed 內的舊公司資料**：主站內容/文章/畫廊/Hotspots 全面改為新方向的示範資料。
5. **Seed 內 hardcode 管理員 email**：移除（避免資安/隱私風險）。

### C2. 待你確認 UIUX 真的不需要的「功能模組」（下一步建議）

> 這一段需要你在 `uiux/` 設計稿對照，確認要保留哪些 routes / admin modules。

建議以「可刪就刪」降低 bundle/維運/資安面積：

1. Public routes：`/[locale]/services`, `/platforms`, `/portfolio`（若 UIUX 不需要，建議刪除對應 route + DB seed + admin 模組）。
2. Admin 模組：`admin/(data)/*`, `admin/reports`, `admin/ai-analysis`（若產品不需要 Data Intelligence，建議整組移除）。
3. 測試：刪除與上述模組綁定的 tests/fixtures，並更新 `doc/SPEC.md` 的 Module Inventory。

---

## D. P1：效能/SEO/資安（高併發前提）檢查步驟

1. **Public read 必須走 cached modules**（`lib/modules/*/cached.ts`）：
   - 確認 public pages 沒有直接 `createClient()`（cookie client）去讀 DB（避免 cache key 汙染 + 壓力爆炸）。
2. **避免不必要 client bundle**
   - public 頁面預設 server component；只有互動才 `'use client'`。
   - 重 deps（如 `recharts`）只能留在 admin，必要時 dynamic import。
3. **RLS & Secrets**
   - `SUPABASE_SERVICE_ROLE_KEY` 僅 server-only；任何 cron/worker endpoint 必須驗證 shared secret。
   - comments/reactions 等公開入口要保留 rate-limit / honeypot / spam pipeline（見 `doc/SECURITY.md`）。
4. **高併發保護**
   - 針對 public listing（blog/gallery）確認 page-level cache / tag revalidate 正確（避免每次請求都打 DB）。
   - API routes（comments/gallery items）確認有 feature gate + pagination 上限。

---

## E. 文件與運維（Vercel + Supabase）補齊步驟

1. `doc/runbook/deployment.md` 以「feature → env」已拆分，運維照表填：
   - Base / Uploads / Comments / Cron&Workers / AI / Monitoring
2. Supabase 端（很常漏）：
   - URL Configuration（Site URL + Redirect URLs）
   - Providers（Google client id/secret）
   - Extensions（`vector`, `pg_cron`, `vault`）
   - Edge Functions secrets（若啟用 embeddings/preprocessing）
3. Vercel 端（很常漏）：
   - env vars 更新後要 **Redeploy**（Serverless runtime 才會讀到新值）
   - Production 記得設定 `NEXT_PUBLIC_SITE_URL`（no trailing slash）

---

## F. 驗收（你可以照這張清單點一遍）

1. `/zh`：
   - Home Hero 有圖片 + hotspots（點 pin 有 modal）
   - Suggest section 有 4 篇文章卡片（可點進文章頁）
2. `/zh/login` → Google 登入後：
   - 會到 `/auth/callback` → 最終到 `/zh/admin`
3. `/zh/admin`：
   - 不會再跳回登入頁
   - 若沒設 `site_admins`，應被導到首頁 `?error=unauthorized`（不是無限 loop）
